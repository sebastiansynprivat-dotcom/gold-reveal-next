import { useEffect, useRef, useCallback } from "react";

/**
 * Hook that listens to Loom iframe postMessage events
 * and fires onComplete when video reaches the given threshold (default 90%).
 */
export function useLoomProgress(
  onComplete: () => void,
  threshold = 0.9
) {
  const completedRef = useRef(false);

  const reset = useCallback(() => {
    completedRef.current = false;
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (completedRef.current) return;
      if (!event.data || typeof event.data !== "object") return;

      // Loom sends { event: "timeupdate", data: { percent: 0.xx } }
      // and { event: "ended" }
      const msg = event.data;

      if (msg.event === "ended") {
        completedRef.current = true;
        onComplete();
        return;
      }

      if (
        msg.event === "timeupdate" &&
        typeof msg.data?.percent === "number" &&
        msg.data.percent >= threshold
      ) {
        completedRef.current = true;
        onComplete();
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onComplete, threshold]);

  return { reset };
}
