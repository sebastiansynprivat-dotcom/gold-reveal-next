/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) output[i] = rawData.charCodeAt(i);
  return output;
}

/**
 * Browsers fire this when they rotate/expire the push endpoint. Without a
 * handler the subscription is silently lost and the user stops receiving
 * notifications. We immediately re-subscribe and re-register server-side, and
 * additionally notify any open window so it can re-link the user.
 */
self.addEventListener("pushsubscriptionchange", (event: any) => {
  event.waitUntil(
    (async () => {
      try {
        const keyRes = await fetch(
          `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/get-vapid-key`,
          { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } }
        );
        const { publicKey } = await keyRes.json();
        if (!publicKey) return;

        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
        });
        const sub = subscription.toJSON();

        await fetch(
          `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/subscribe-push`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", apikey: SUPABASE_PUBLISHABLE_KEY },
            body: JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys }),
          }
        );

        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) client.postMessage({ type: "PUSH_SUBSCRIPTION_CHANGED" });
      } catch (err) {
        console.warn("[sw] pushsubscriptionchange failed", err);
      }
    })()
  );
});

self.addEventListener("push", (event) => {

  const data = event.data?.json() ?? { title: "SheX 💛", body: "Neue Nachricht!" };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
      data: data.url ?? "/dashboard",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
