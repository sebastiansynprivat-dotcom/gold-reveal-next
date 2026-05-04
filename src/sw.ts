/// <reference lib="webworker" />
import { clientsClaim } from "workbox-core";
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";

declare let self: ServiceWorkerGlobalScope;

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Force activate new SW immediately and reload all open tabs
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Nuke all old caches
      const names = await caches.keys();
      await Promise.all(names.map((n) => caches.delete(n)));
      await self.clients.claim();
      // Tell all open clients to reload to get fresh bundle
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => {
        (client as WindowClient).postMessage({ type: "SW_UPDATED" });
      });
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
