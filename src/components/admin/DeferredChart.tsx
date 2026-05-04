import React, { useEffect, useState } from "react";

/**
 * Defers rendering of expensive chart children until after the first paint.
 * - Mounts placeholder immediately (skeleton)
 * - Schedules real render via requestIdleCallback / requestAnimationFrame
 * - Frees the main thread so cards/numbers paint in <100ms
 */
export const DeferredChart: React.FC<{ children: React.ReactNode; placeholder?: React.ReactNode; delay?: number }> = ({
  children,
  placeholder,
  delay = 0,
}) => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const schedule = () => {
      if (cancelled) return;
      // Use idle callback when available, else two RAFs to ensure first paint happened
      const ric = (window as any).requestIdleCallback as ((cb: () => void, opts?: { timeout?: number }) => number) | undefined;
      if (ric) {
        ric(() => !cancelled && setReady(true), { timeout: 400 });
      } else {
        requestAnimationFrame(() => requestAnimationFrame(() => !cancelled && setReady(true)));
      }
    };
    if (delay > 0) {
      const t = window.setTimeout(schedule, delay);
      return () => {
        cancelled = true;
        clearTimeout(t);
      };
    }
    schedule();
    return () => {
      cancelled = true;
    };
  }, [delay]);

  if (!ready) return <>{placeholder}</>;
  return <>{children}</>;
};

export const ChartSkeleton: React.FC = () => (
  <div className="h-full w-full flex items-end gap-1 px-2 pb-2 pt-6 animate-pulse">
    {Array.from({ length: 14 }).map((_, i) => (
      <div
        key={i}
        className="flex-1 rounded-t-md bg-gradient-to-t from-yellow-500/10 to-yellow-500/5"
        style={{ height: `${30 + ((i * 37) % 60)}%` }}
      />
    ))}
  </div>
);
