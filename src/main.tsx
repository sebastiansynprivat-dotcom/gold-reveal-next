import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA + Push Notifications.
// IMPORTANT: do NOT auto-reload the page when a new SW is detected. A forced
// reload mid-session bounces the user back to the start route (~30s after
// load, whenever a new deploy is picked up). New SW versions are installed
// silently in the background and will take over the next time the user
// opens the app fresh.
registerSW({
  immediate: true,
  onOfflineReady() {
    console.info("App ready for offline use.");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
