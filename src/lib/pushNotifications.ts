import { supabase } from "@/integrations/supabase/client";

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/get-vapid-key`,
      { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
    );
    const data = await res.json();
    return data.publicKey || null;
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

export async function subscribeToPush(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.log("Push not supported");
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;

    const publicKey = await getVapidPublicKey();
    if (!publicKey) {
      console.error("No VAPID public key");
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
    });

    const subJson = subscription.toJSON();

    const { data: { session } } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/subscribe-push`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      }
    );

    return res.ok;
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

/**
 * Silent self-healing: browsers rotate/expire push endpoints and the server
 * prunes dead ones (410). In those cases the user still shows "notifications
 * allowed" but never receives anything. On every app load we therefore
 * re-register the current browser subscription (creating one if needed) and
 * upsert it server-side so the DB row is always present and linked to the user.
 */
export async function syncPushSubscription(): Promise<void> {
  try {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const publicKey = await getVapidPublicKey();
      if (!publicKey) return;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
      });
    }

    const subJson = subscription.toJSON();
    const { data: { session } } = await supabase.auth.getSession();

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    await fetch(`https://${projectId}.supabase.co/functions/v1/subscribe-push`, {
      method: "POST",
      headers,
      body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
    });
  } catch (err) {
    console.warn("Push sync skipped:", err);
  }
}

