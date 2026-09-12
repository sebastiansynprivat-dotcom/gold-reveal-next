import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BATCH = 25;
const BUCKET = "payout-statements";

const ym = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

function extFor(contentType: string | null, url: string): string {
  if (contentType?.includes("pdf")) return "pdf";
  if (contentType?.includes("csv")) return "csv";
  if (contentType?.includes("json")) return "json";
  const m = url.split("?")[0].match(/\.([a-z0-9]{2,4})$/i);
  return m ? m[1].toLowerCase() : "pdf";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const BACKEND_URL = Deno.env.get("REVENUE_BACKEND_URL");
  const BACKEND_TOKEN = Deno.env.get("REVENUE_BACKEND_TOKEN");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  if (!BACKEND_URL || !BACKEND_TOKEN) return json({ error: "Backend not configured" }, 500);

  const summary: Array<Record<string, unknown>> = [];

  try {
    const { data: entries, error: entriesErr } = await admin
      .from("account_offboardings")
      .select("id, account_id, model_id, platform, target_date, status")
      .neq("status", "done")
      .order("target_date", { ascending: true })
      .limit(BATCH);
    if (entriesErr) throw entriesErr;

    const todayUtc = new Date();
    const today = todayUtc.toISOString().slice(0, 10);
    const currentMonth = ym(todayUtc);

    for (const entry of entries || []) {
      const res: Record<string, unknown> = { id: entry.id, account_id: entry.account_id };
      try {
        // Single-flight: skip if another run already touched it in the last 30 min
        const { data: leased } = await admin
          .from("account_offboardings")
          .update({ last_run_at: new Date().toISOString(), status: "running" })
          .eq("id", entry.id)
          .neq("status", "done")
          .or(`last_run_at.is.null,last_run_at.lt.${new Date(Date.now() - 30 * 60 * 1000).toISOString()}`)
          .select("id");
        if (!leased || leased.length === 0) {
          res.skipped = "leased";
          summary.push(res);
          continue;
        }

        // 1) Ensure post + message flags are off
        const { data: account } = await admin
          .from("accounts")
          .select("id, platform, account_email, account_password, model_id, post, message")
          .eq("id", entry.account_id)
          .maybeSingle();

        if (!account) {
          // Account already gone (archived elsewhere) → treat as done
          await admin
            .from("account_offboardings")
            .update({ status: "done", archived_at: new Date().toISOString(), last_error: null })
            .eq("id", entry.id);
          res.result = "account_missing_marked_done";
          summary.push(res);
          continue;
        }

        if (account.post || account.message) {
          await admin.from("accounts").update({ post: false, message: false }).eq("id", account.id);
        }

        // 2) Collect statements for all months from first revenue month → current month
        const { data: firstRow } = await admin
          .from("accounts_data")
          .select("date")
          .eq("account_id", account.id)
          .order("date", { ascending: true })
          .limit(1)
          .maybeSingle();

        const firstMonth = firstRow?.date ? String(firstRow.date).slice(0, 7) : currentMonth;
        const allMonths = monthsBetween(firstMonth, currentMonth);

        const { data: existing } = await admin
          .from("offboarding_statement_files")
          .select("period")
          .eq("account_id", account.id);
        const have = new Set((existing || []).map((r: any) => r.period));
        const missing = allMonths.filter((p) => !have.has(p));
        res.missing_periods = missing.length;

        let saved = 0;
        let backendHalt: string | null = null;

        if (missing.length > 0) {
          const from = missing[0];
          const to = missing[missing.length - 1];
          const upstream = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/getpayoutstatements`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-API-KEY": BACKEND_TOKEN },
            body: JSON.stringify({
              from,
              to,
              model: { id: account.model_id },
              accounts: [{
                id: account.id,
                platform: account.platform,
                email: account.account_email,
                password: account.account_password,
              }],
            }),
          });

          if (!upstream.ok) {
            const text = await upstream.text().catch(() => "");
            backendHalt = `Backend ${upstream.status}: ${text.slice(0, 300)}`;
            if (upstream.status === 401 || upstream.status === 403 || upstream.status === 402) {
              await admin
                .from("account_offboardings")
                .update({ status: "failed", last_error: backendHalt })
                .eq("id", entry.id);
              res.error = backendHalt;
              summary.push(res);
              break; // halt the whole run on auth/quota problems
            }
          } else {
            const result = await upstream.json().catch(() => ({}));
            const statements: any[] = Array.isArray(result)
              ? result
              : Array.isArray(result?.statements)
                ? result.statements
                : Array.isArray(result?.payoutStatements)
                  ? result.payoutStatements
                  : [];

            for (const st of statements) {
              const period = String(st?.period || "").slice(0, 7);
              if (!period || have.has(period) || !st?.downloadUrl || st?.unavailable) continue;
              try {
                const fileRes = await fetch(st.downloadUrl);
                if (!fileRes.ok) continue;
                const ct = fileRes.headers.get("content-type");
                const bytes = new Uint8Array(await fileRes.arrayBuffer());
                const platform = String(st.platform || account.platform || "account");
                const path = `${account.model_id || "unknown"}/${account.id}/${platform}_${period}.${extFor(ct, st.downloadUrl)}`;
                const { error: upErr } = await admin.storage
                  .from(BUCKET)
                  .upload(path, bytes, { contentType: ct || "application/pdf", upsert: true });
                if (upErr) continue;
                const { error: insErr } = await admin.from("offboarding_statement_files").insert({
                  offboarding_id: entry.id,
                  account_id: account.id,
                  platform,
                  period,
                  storage_path: path,
                  amount: typeof st.amount === "number" ? st.amount : null,
                  currency: st.currency ?? null,
                  pending: st.pending === true,
                });
                if (!insErr) {
                  have.add(period);
                  saved += 1;
                }
              } catch (e) {
                console.error("statement download failed", period, e);
              }
            }
          }
        }
        res.saved = saved;

        // 3) Archive on/after the target date — status done ONLY after archiving
        if (entry.target_date <= today) {
          const stillMissing = allMonths.filter((p) => !have.has(p));
          if (stillMissing.length > 0 && backendHalt) {
            await admin
              .from("account_offboardings")
              .update({ status: "failed", last_error: backendHalt })
              .eq("id", entry.id);
            res.result = "retry_statements";
            summary.push(res);
            continue;
          }

          const { error: delErr } = await admin.from("accounts").delete().eq("id", account.id);
          if (delErr) {
            await admin
              .from("account_offboardings")
              .update({ status: "failed", last_error: `Archivieren fehlgeschlagen: ${delErr.message}` })
              .eq("id", entry.id);
            res.error = delErr.message;
          } else {
            await admin
              .from("account_offboardings")
              .update({ status: "done", archived_at: new Date().toISOString(), last_error: null })
              .eq("id", entry.id);
            res.result = "archived";
          }
        } else {
          await admin
            .from("account_offboardings")
            .update({ status: "scheduled", last_error: backendHalt })
            .eq("id", entry.id);
          res.result = "pending";
        }
      } catch (e) {
        const msg = (e as Error).message || String(e);
        await admin.from("account_offboardings").update({ status: "failed", last_error: msg }).eq("id", entry.id);
        res.error = msg;
      }
      summary.push(res);
    }

    return json({ ok: true, processed: summary.length, results: summary });
  } catch (err) {
    console.error("process-offboardings error", err);
    return json({ error: (err as Error).message || "Internal error" }, 500);
  }
});
