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

// Reload immediately when new SW takes control (force-update for installed PWAs).
// Skip the reload while a critical in-flight operation is running (e.g. chat
// streaming) so we don't abort the user's request and show a connection error.
if ("serviceWorker" in navigator) {
  let reloading = false;
  const tryReload = () => {
    if (reloading) return;
    // Defer if a streaming operation is in progress.
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
