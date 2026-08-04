import { supabase } from "@/integrations/supabase/client";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const LAST_SYNC_KEY = "push_last_sync_at";
const LAST_KEY_KEY = "push_last_vapid_key";
/** Re-verify the subscription against the backend at most every 6 hours. */
const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;

let vapidKeyCache: string | null = null;
let inFlight: Promise<PushStatus> | null = null;
let monitorStarted = false;

export type PushStatus =
  | "unsupported"
  | "denied"
  | "default"
  | "subscribed"
  | "error";

export async function getVapidPublicKey(): Promise<string | null> {
  if (vapidKeyCache) return vapidKeyCache;
  try {
    const res = await fetch(
      `https://${PROJECT_ID}.supabase.co/functions/v1/get-vapid-key`,
      { headers: { apikey: PUBLISHABLE_KEY } }
    );
    const data = await res.json();
    vapidKeyCache = data.publicKey || null;
    return vapidKeyCache;
  } catch {
    return null;
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function bufferToBase64Url(buffer: ArrayBuffer | null): string | null {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return window
    .btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPermission(): NotificationPermission | null {
  if (typeof window === "undefined" || !("Notification" in window)) return null;
  return Notification.permission;
}

async function persistSubscription(subscription: PushSubscription): Promise<boolean> {
  const subJson = subscription.toJSON();
  if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) return false;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: PUBLISHABLE_KEY,
  };
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;

  const res = await fetch(
    `https://${PROJECT_ID}.supabase.co/functions/v1/subscribe-push`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
    }
  );
  return res.ok;
}

/**
 * Core self-healing routine. Idempotent and safe to call as often as we like.
 *
 * Why this exists: browsers silently rotate or drop push endpoints (OS updates,
 * long inactivity, cache eviction) and the server prunes dead endpoints on 410.
 * The user still sees "notifications allowed" but never receives anything again.
 * So on every foreground we verify the browser subscription, re-create it when
 * missing, drop it when it was signed with an outdated VAPID key, and re-link
 * it to the current user server-side.
 */
export async function ensurePushSubscription(
  opts: { force?: boolean } = {}
): Promise<PushStatus> {
  if (!isPushSupported()) return "unsupported";

  const permission = Notification.permission;
  if (permission === "denied") return "denied";
  if (permission === "default") return "default";

  if (inFlight) return inFlight;

  inFlight = (async (): Promise<PushStatus> => {
    try {
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      const publicKey = await getVapidPublicKey();
      if (!publicKey) return subscription ? "subscribed" : "error";

      // Detect a server key rotation (or a subscription created against a
      // different key) — such a subscription can never receive our pushes.
      if (subscription) {
        const currentKey = bufferToBase64Url(
          subscription.options?.applicationServerKey ?? null
        );
        if (currentKey && currentKey !== publicKey) {
          try {
            await subscription.unsubscribe();
          } catch {
            /* noop */
          }
          subscription = null;
        }
      }

      let created = false;
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
        });
        created = true;
      }

      // Throttle the backend upsert unless something actually changed.
      const lastSync = Number(localStorage.getItem(LAST_SYNC_KEY) || 0);
      const lastKey = localStorage.getItem(LAST_KEY_KEY);
      const stale = Date.now() - lastSync > SYNC_INTERVAL_MS;
      const keyChanged = lastKey !== publicKey;

      if (created || stale || keyChanged || opts.force) {
        const ok = await persistSubscription(subscription);
        if (ok) {
          localStorage.setItem(LAST_SYNC_KEY, String(Date.now()));
          localStorage.setItem(LAST_KEY_KEY, publicKey);
        }
      }

      return "subscribed";
    } catch (err) {
      console.warn("[push] ensure failed:", err);
      return "error";
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/** Explicit user-triggered activation (asks for permission). */
export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!isPushSupported()) return false;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    const status = await ensurePushSubscription({ force: true });
    return status === "subscribed";
  } catch (err) {
    console.error("Push subscription failed:", err);
    return false;
  }
}

export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator)) return false;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/** Backwards-compatible alias used by existing dialogs. */
export async function syncPushSubscription(): Promise<void> {
  await ensurePushSubscription();
}

/** Current health snapshot without mutating anything. */
export async function getPushStatus(): Promise<PushStatus> {
  if (!isPushSupported()) return "unsupported";
  const permission = Notification.permission;
  if (permission === "denied") return "denied";
  if (permission === "default") return "default";
  return (await isPushSubscribed()) ? "subscribed" : "error";
}

/**
 * Starts the permanent health monitor: re-checks on foreground, on tab focus,
 * when the network returns, on auth changes and on a slow interval. Called once
 * globally — repeated calls are no-ops.
 */
export function startPushHealthMonitor(
  onStatus?: (status: PushStatus) => void
): () => void {
  const run = async () => {
    const status = await ensurePushSubscription();
    onStatus?.(status);
  };

  if (monitorStarted) {
    void run();
    return () => {};
  }
  monitorStarted = true;

  void run();

  const onVisible = () => {
    if (document.visibilityState === "visible") void run();
  };
  const onOnline = () => void run();

  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onVisible);
  window.addEventListener("online", onOnline);

  // The service worker tells us when the browser rotated the subscription.
  const onSwMessage = (event: MessageEvent) => {
    if (event.data?.type === "PUSH_SUBSCRIPTION_CHANGED") void ensurePushSubscription({ force: true });
  };
  navigator.serviceWorker?.addEventListener?.("message", onSwMessage);

  const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
      void ensurePushSubscription({ force: event === "SIGNED_IN" });
    }
  });

  const interval = window.setInterval(run, 60 * 60 * 1000);

  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onVisible);
    window.removeEventListener("online", onOnline);
    navigator.serviceWorker?.removeEventListener?.("message", onSwMessage);
    authSub.subscription.unsubscribe();
    window.clearInterval(interval);
    monitorStarted = false;
  };
}
