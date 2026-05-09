// Live FX rate fetcher with multi-provider fallback chain.
// Returns null if all providers fail.
export async function fetchFxRate(from: string, to: string): Promise<number | null> {
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
