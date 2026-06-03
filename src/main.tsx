import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA + Push Notifications
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onOfflineReady() {
    console.info("App ready for offline use.");
  },
});

// Reload only when a NEW service worker takes over an already-controlled page
// (real update). Skip the very first install (no prior controller) — otherwise
// every fresh visit triggers a spurious reload ~30s after load that bounces the
// user back to the start route. Also defer while a streaming op is in flight.
if ("serviceWorker" in navigator) {
  const hadControllerAtLoad = !!navigator.serviceWorker.controller;
  let reloading = false;
  const tryReload = () => {
    if (reloading) return;
    if (!hadControllerAtLoad) return; // first install — do not reload
    if ((window as any).__lvBusy === true) {
      setTimeout(tryReload, 1500);
      return;
    }
    reloading = true;
    window.location.reload();
  };
  navigator.serviceWorker.addEventListener("controllerchange", tryReload);
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "SW_UPDATED") tryReload();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
