import { useEffect, useState } from "react";

const KEY = "shex_demo_mode";

function readUrlOverride() {
  if (typeof window === "undefined") return;
  try {
    const params = new URLSearchParams(window.location.search);
    const v = params.get("demo");
    if (v === "1") localStorage.setItem(KEY, "1");
    else if (v === "0") localStorage.removeItem(KEY);
  } catch {}
}

readUrlOverride();

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function useDemoMode(): boolean {
  const [enabled, setEnabled] = useState<boolean>(isDemoMode);
  useEffect(() => {
    const onStorage = () => setEnabled(isDemoMode());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return enabled;
}
