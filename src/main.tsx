import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA + Push Notifications
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
    window.location.reload();
  },
  onOfflineReady() {
    console.info("App ready for offline use.");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
