// FX rate fetcher.
// Default strategy: 30-day average rate (better for monthly billing periods than a
// single day's spot rate). Falls back to the live spot rate, then to null.

const cache = new Map<string, { value: number; ts: number }>();
const CACHE_MS = 60 * 60 * 1000; // 1h

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

/** Live spot rate with multi-provider fallback chain. Returns null if all fail. */
export async function fetchFxSpotRate(from: string, to: string): Promise<number | null> {
  if (!from || !to || from === to) return 1;
  const endpoints = [
    async () => {
      const r = await fetch(`https://open.er-api.com/v6/latest/${from}`);
      const d = await r.json();
      const v = d?.rates?.[to];
      return typeof v === "number" ? v : null;
    },
    async () => {
      const r = await fetch(`https://api.exchangerate.host/latest?base=${from}&symbols=${to}`);
      const d = await r.json();
      const v = d?.rates?.[to];
      return typeof v === "number" ? v : null;
    },
    async () => {
      const r = await fetch(`https://api.frankfurter.app/latest?from=${from}&to=${to}`);
      const d = await r.json();
      const v = d?.rates?.[to];
      return typeof v === "number" ? v : null;
    },
  ];
  for (const ep of endpoints) {
    try {
      const v = await ep();
      if (v && isFinite(v) && v > 0) return v;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** Average rate over the last `days` days (default 30). Null if unavailable. */
export async function fetchFxAverageRate(
  from: string,
  to: string,
  days = 30,
): Promise<number | null> {
  if (!from || !to || from === to) return 1;
  const start = isoDaysAgo(days);
  const providers = [
    async () => {
      const r = await fetch(
        `https://api.frankfurter.app/${start}..?from=${from}&to=${to}`,
      );
      const d = await r.json();
      return Object.values(d?.rates || {})
        .map((o: any) => Number(o?.[to]))
        .filter((n) => isFinite(n) && n > 0);
    },
    async () => {
      const r = await fetch(
        `https://api.exchangerate.host/timeseries?start_date=${start}&end_date=${isoDaysAgo(0)}&base=${from}&symbols=${to}`,
      );
      const d = await r.json();
      return Object.values(d?.rates || {})
        .map((o: any) => Number(o?.[to]))
        .filter((n) => isFinite(n) && n > 0);
    },
  ];
  for (const p of providers) {
    try {
      const vals = await p();
      if (vals.length) {
        const avg = vals.reduce((s, n) => s + n, 0) / vals.length;
        if (isFinite(avg) && avg > 0) return avg;
      }
    } catch {
      /* try next */
    }
  }
  return null;
}

/**
 * Main entry point used across the app: 30-day average rate (cached 1h),
 * falling back to the live spot rate.
 */
export async function fetchFxRate(from: string, to: string): Promise<number | null> {
  if (!from || !to || from === to) return 1;
  const key = `${from}->${to}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_MS) return hit.value;

  const avg = await fetchFxAverageRate(from, to, 30);
  const value = avg ?? (await fetchFxSpotRate(from, to));
  if (value && isFinite(value) && value > 0) {
    cache.set(key, { value, ts: Date.now() });
    return value;
  }
  return null;
}
