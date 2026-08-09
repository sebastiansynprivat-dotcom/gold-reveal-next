// Small helper to make one-shot writes resilient to short offline/reconnect
// windows (e.g. user switches to WhatsApp/Telegram and comes back).
// Instead of failing instantly we wait for the network and retry a few times.

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function waitForOnline(timeoutMs = 8000) {
  if (typeof navigator === "undefined" || navigator.onLine !== false) return;
  await new Promise<void>((resolve) => {
    const done = () => {
      window.removeEventListener("online", done);
      resolve();
    };
    window.addEventListener("online", done);
    setTimeout(done, timeoutMs);
  });
}

/**
 * Runs a Supabase write and retries on transient failures.
 * Returns the last result (data/error) so callers keep their existing handling.
 */
export async function withWriteRetry<T extends { data: any; error: any }>(
  run: () => Promise<T>,
  attempts = 3,
): Promise<T> {
  let last: T | undefined;
  for (let i = 0; i < attempts; i++) {
    await waitForOnline();
    try {
      last = await run();
    } catch (e: any) {
      last = { data: null, error: e ?? new Error("Netzwerkfehler") } as T;
    }
    if (last && !last.error && last.data) return last;
    if (i < attempts - 1) await wait(600 * (i + 1));
  }
  return last as T;
}
