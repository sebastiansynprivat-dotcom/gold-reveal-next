import React, { useEffect, useRef, useState } from "react";
import { Activity, X } from "lucide-react";

/**
 * Lightweight performance overlay for the Einnahmen tab.
 * Tracks: live FPS, dropped frames, JS heap (if available), DOM nodes,
 * long tasks, and a "chart ready" timing marker.
 *
 * Toggle visibility:
 *  - Click the small floating badge
 *  - Or set localStorage.setItem("perfmon", "1") and reload
 *  - Or append ?perfmon=1 to the URL
 */
export const RevenuePerfMonitor: React.FC<{ tabActive: boolean }> = ({ tabActive }) => {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("perfmon") === "1") return true;
      return localStorage.getItem("perfmon") === "1";
    } catch {
      return false;
    }
  });
  const [open, setOpen] = useState(true);

  const [fps, setFps] = useState(0);
  const [minFps, setMinFps] = useState(60);
  const [avgFps, setAvgFps] = useState(0);
  const [longTasks, setLongTasks] = useState(0);
  const [longTaskMs, setLongTaskMs] = useState(0);
  const [domNodes, setDomNodes] = useState(0);
  const [heapMb, setHeapMb] = useState<number | null>(null);
  const [chartMs, setChartMs] = useState<number | null>(null);
  const [tabSwitchMs, setTabSwitchMs] = useState<number | null>(null);

  const framesRef = useRef(0);
  const lastTimeRef = useRef(performance.now());
  const fpsSamplesRef = useRef<number[]>([]);
  const rafRef = useRef<number | null>(null);

  // FPS loop
  useEffect(() => {
    if (!enabled) return;
    let mounted = true;
    const loop = (now: number) => {
      framesRef.current += 1;
      const elapsed = now - lastTimeRef.current;
      if (elapsed >= 500) {
        const currentFps = Math.round((framesRef.current * 1000) / elapsed);
        if (mounted) {
          setFps(currentFps);
          fpsSamplesRef.current.push(currentFps);
          if (fpsSamplesRef.current.length > 60) fpsSamplesRef.current.shift();
          const samples = fpsSamplesRef.current;
          setMinFps(Math.min(...samples));
          setAvgFps(Math.round(samples.reduce((a, b) => a + b, 0) / samples.length));
        }
        framesRef.current = 0;
        lastTimeRef.current = now;
      }
      if (mounted) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  // Long tasks observer
  useEffect(() => {
    if (!enabled) return;
    if (typeof PerformanceObserver === "undefined") return;
    let observer: PerformanceObserver | null = null;
    try {
      observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          setLongTasks((c) => c + 1);
          setLongTaskMs((m) => Math.max(m, Math.round(entry.duration)));
        }
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch {
      // not supported (Safari/iOS) — silently ignore
    }
    return () => observer?.disconnect();
  }, [enabled]);

  // Heap + DOM polling
  useEffect(() => {
    if (!enabled) return;
    const update = () => {
      setDomNodes(document.getElementsByTagName("*").length);
      const mem = (performance as any).memory;
      if (mem?.usedJSHeapSize) {
        setHeapMb(Math.round(mem.usedJSHeapSize / (1024 * 1024)));
      }
    };
    update();
    const id = window.setInterval(update, 1000);
    return () => clearInterval(id);
  }, [enabled]);

  // Mark chart-ready timing whenever the einnahmen tab becomes active
  const tabEnterTimeRef = useRef<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (tabActive) {
      tabEnterTimeRef.current = performance.now();
      setChartMs(null);
      setTabSwitchMs(null);
      // Wait for chart container to render and svg paint
      const start = performance.now();
      let raf1: number;
      let raf2: number;
      raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          // Let recharts settle one tick
          window.setTimeout(() => {
            const chart = document.querySelector('[data-perf-marker="revenue-chart"] svg');
            const elapsed = Math.round(performance.now() - start);
            if (chart) {
              setChartMs(elapsed);
            } else {
              setChartMs(elapsed);
            }
            setTabSwitchMs(elapsed);
          }, 0);
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        if (raf2!) cancelAnimationFrame(raf2);
      };
    }
  }, [tabActive, enabled]);

  if (!enabled) {
    return (
      <button
        onClick={() => {
          localStorage.setItem("perfmon", "1");
          setEnabled(true);
        }}
        className="fixed bottom-3 right-3 z-[9999] flex items-center gap-1 rounded-full border border-yellow-500/30 bg-black/70 px-2 py-1 text-[10px] text-yellow-400 backdrop-blur-md hover:bg-black/90"
        title="Performance-Monitor aktivieren"
      >
        <Activity className="h-3 w-3" /> Perf
      </button>
    );
  }

  const fpsColor = fps >= 50 ? "text-green-400" : fps >= 30 ? "text-yellow-400" : "text-red-400";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-3 right-3 z-[9999] flex items-center gap-1 rounded-full border border-yellow-500/40 bg-black/80 px-2 py-1 text-[10px] backdrop-blur-md"
      >
        <Activity className={`h-3 w-3 ${fpsColor}`} /> <span className={fpsColor}>{fps} FPS</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-3 right-3 z-[9999] w-[210px] rounded-xl border border-yellow-500/30 bg-black/85 p-3 text-[11px] text-white shadow-2xl backdrop-blur-xl">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1 font-semibold text-yellow-400">
          <Activity className="h-3 w-3" /> Perf-Monitor
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setOpen(false)}
            className="rounded p-0.5 text-white/60 hover:bg-white/10"
            title="Minimieren"
          >
            –
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("perfmon");
              setEnabled(false);
            }}
            className="rounded p-0.5 text-white/60 hover:bg-white/10"
            title="Deaktivieren"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <Row label="FPS" value={`${fps}`} valueClass={fpsColor} />
        <Row label="Avg / Min FPS" value={`${avgFps} / ${minFps}`} />
        <Row
          label="Long Tasks"
          value={`${longTasks}${longTaskMs ? ` (${longTaskMs}ms)` : ""}`}
          valueClass={longTasks > 0 ? "text-red-400" : "text-green-400"}
        />
        <Row label="DOM Nodes" value={domNodes.toLocaleString("de-DE")} />
        {heapMb !== null && <Row label="JS Heap" value={`${heapMb} MB`} />}
        <div className="my-1 h-px bg-white/10" />
        <Row
          label="Tab → Render"
          value={tabSwitchMs !== null ? `${tabSwitchMs} ms` : "—"}
          valueClass={
            tabSwitchMs === null
              ? ""
              : tabSwitchMs < 200
                ? "text-green-400"
                : tabSwitchMs < 600
                  ? "text-yellow-400"
                  : "text-red-400"
          }
        />
        <Row
          label="Chart bereit"
          value={chartMs !== null ? `${chartMs} ms` : "—"}
          valueClass={
            chartMs === null
              ? ""
              : chartMs < 250
                ? "text-green-400"
                : chartMs < 700
                  ? "text-yellow-400"
                  : "text-red-400"
          }
        />
      </div>
      <div className="mt-2 text-[9px] text-white/40">
        Tipp: ?perfmon=1 in URL für Auto-Start
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; value: string; valueClass?: string }> = ({
  label,
  value,
  valueClass,
}) => (
  <div className="flex items-center justify-between gap-2">
    <span className="text-white/60">{label}</span>
    <span className={`font-mono ${valueClass || "text-white"}`}>{value}</span>
  </div>
);
