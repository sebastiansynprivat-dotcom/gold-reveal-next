import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const BATCH = 25;
const BUCKET = "payout-statements";
const MAX_RETRY_DAYS = 3;

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

type Acc = { id: string; platform: string; account_email: string; account_password: string; model_id: string | null };

// Download all missing statements for an account. lastMonth = last month to cover.
async function collectStatements(admin: any, backendUrl: string, token: string, offboardingId: string, account: Acc, lastMonth: string) {
  const { data: firstRow } = await admin
    .from("accounts_data").select("date").eq("account_id", account.id)
    .order("date", { ascending: true }).limit(1).maybeSingle();
  const firstMonth = firstRow?.date ? String(firstRow.date).slice(0, 7) : lastMonth;
  const allMonths = monthsBetween(firstMonth, lastMonth);

  const { data: existing } = await admin.from("offboarding_statement_files").select("period").eq("account_id", account.id);
  const have = new Set((existing || []).map((r: any) => r.period));
  const missing = allMonths.filter((p) => !have.has(p));

  let saved = 0;
  let backendHalt: string | null = null;
  let authFail = false;
  let received = 0;

  if (missing.length > 0) {
    const upstream = await fetch(`${backendUrl.replace(/\/$/, "")}/getpayoutstatements`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-KEY": token },
      body: JSON.stringify({
        from: missing[0],
        to: missing[missing.length - 1],
        model: { id: account.model_id },
        accounts: [{ id: account.id, platform: account.platform, email: account.account_email, password: account.account_password }],
      }),
    });
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      backendHalt = `Backend ${upstream.status}: ${text.slice(0, 300)}`;
      authFail = [401, 402, 403].includes(upstream.status);
    } else {
      const result = await upstream.json().catch(() => ({}));
      const statements: any[] = Array.isArray(result) ? result
        : Array.isArray(result?.statements) ? result.statements
        : Array.isArray(result?.payoutStatements) ? result.payoutStatements : [];
      received = statements.length;
      const errs: any[] = Array.isArray(result?.errors) ? result.errors : [];
      if (errs.length && statements.length === 0) backendHalt = errs.map((e) => `${e.code || 'ERROR'}: ${e.message || ''}`).join('; ').slice(0, 300);
      console.log("statements response", account.id, account.platform, "received", received, JSON.stringify(result).slice(0, 500));
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
          const { error: upErr } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: ct || "application/pdf", upsert: true });
          if (upErr) continue;
          const { error: insErr } = await admin.from("offboarding_statement_files").insert({
            offboarding_id: offboardingId, account_id: account.id, platform, period, storage_path: path,
            amount: typeof st.amount === "number" ? st.amount : null,
            currency: st.currency ?? null, pending: st.pending === true,
          });
          if (!insErr) { have.add(period); saved += 1; }
        } catch (e) {
          console.error("statement download failed", period, e);
        }
      }
    }
  }
  const stillMissing = allMonths.filter((p) => !have.has(p));
  return { saved, backendHalt, authFail, received, stillMissing, missingBefore: missing.length };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const BACKEND_URL = Deno.env.get("REVENUE_BACKEND_URL");
  const BACKEND_TOKEN = Deno.env.get("REVENUE_BACKEND_TOKEN");
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  if (!BACKEND_URL || !BACKEND_TOKEN) return json({ error: "Backend not configured" }, 500);

  const body = await req.json().catch(() => ({}));
  const summary: Array<Record<string, unknown>> = [];

  // ── Recover mode: (re)download statements, also for archived accounts ──
  if (body?.recover || body?.offboarding_id) {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: authHeader } } });
    const { data: isAdm } = await userClient.rpc("is_admin");
    if (!isAdm) return json({ error: "Forbidden" }, 403);

    let q = admin.from("account_offboardings").select("id, account_id, platform, target_date, status, archived_at");
    if (body.offboarding_id) {
      if (typeof body.offboarding_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.offboarding_id)) return json({ error: "Invalid id" }, 400);
      q = q.eq("id", body.offboarding_id);
    } else q = q.eq("status", "done");
    const { data: entries, error } = await q.limit(50);
    if (error) return json({ error: error.message }, 500);

    for (const entry of entries || []) {
      const res: Record<string, unknown> = { id: entry.id };
      try {
        let account: Acc | null = null;
        const { data: live } = await admin.from("accounts")
          .select("id, platform, account_email, account_password, model_id").eq("id", entry.account_id).maybeSingle();
        if (live) account = live as Acc;
        else {
          const { data: del } = await admin.from("deleted_records").select("data")
            .eq("original_id", entry.account_id).order("deleted_at", { ascending: false }).limit(1).maybeSingle();
          const d: any = del?.data;
          if (d?.account_email) account = { id: entry.account_id, platform: d.platform, account_email: d.account_email, account_password: d.account_password, model_id: d.model_id };
        }
        if (!account) { res.error = "Keine Zugangsdaten gefunden"; summary.push(res); continue; }
        const lastMonth = ym(entry.archived_at ? new Date(entry.archived_at) : new Date());
        const r = await collectStatements(admin, BACKEND_URL, BACKEND_TOKEN, entry.id, account, lastMonth);
        const note = r.backendHalt
          ? r.backendHalt
          : r.stillMissing.length > 0
            ? `Belege fehlen noch (${r.stillMissing.join(", ")}) – Plattform lieferte ${r.received} Beleg(e)`
            : null;
        await admin.from("account_offboardings").update({ last_error: note, last_run_at: new Date().toISOString() }).eq("id", entry.id);
        Object.assign(res, { saved: r.saved, received: r.received, still_missing: r.stillMissing.length, note });
      } catch (e) {
        res.error = (e as Error).message;
      }
      summary.push(res);
    }
    return json({ ok: true, processed: summary.length, results: summary });
  }

  // ── Daily cron run ──
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
        const { data: leased } = await admin
          .from("account_offboardings")
          .update({ last_run_at: new Date().toISOString(), status: "running" })
          .eq("id", entry.id)
          .neq("status", "done")
          .or(`last_run_at.is.null,last_run_at.lt.${new Date(Date.now() - 30 * 60 * 1000).toISOString()}`)
          .select("id");
        if (!leased || leased.length === 0) { res.skipped = "leased"; summary.push(res); continue; }

        const { data: account } = await admin
          .from("accounts")
          .select("id, platform, account_email, account_password, model_id, post, message")
          .eq("id", entry.account_id)
          .maybeSingle();

        if (!account) {
          await admin.from("account_offboardings")
            .update({ status: "done", archived_at: new Date().toISOString(), last_error: null }).eq("id", entry.id);
          res.result = "account_missing_marked_done";
          summary.push(res);
          continue;
        }

        if (account.post || account.message) {
          await admin.from("accounts").update({ post: false, message: false }).eq("id", account.id);
        }

        const r = await collectStatements(admin, BACKEND_URL, BACKEND_TOKEN, entry.id, account as Acc, currentMonth);
        res.saved = r.saved;
        res.received = r.received;

        if (r.authFail) {
          await admin.from("account_offboardings").update({ status: "failed", last_error: r.backendHalt }).eq("id", entry.id);
          res.error = r.backendHalt;
          summary.push(res);
          break; // halt the whole run on auth/quota problems
        }

        if (entry.target_date <= today) {
          const daysPast = Math.floor((Date.parse(today) - Date.parse(entry.target_date)) / 86_400_000);
          const missingNote = r.stillMissing.length > 0
            ? `Belege fehlen noch (${r.stillMissing.join(", ")})${r.backendHalt ? ` – ${r.backendHalt}` : ` – Plattform lieferte ${r.received} Beleg(e)`}`
            : null;

          if (missingNote && daysPast < MAX_RETRY_DAYS) {
            await admin.from("account_offboardings")
              .update({ status: "failed", last_error: `${missingNote} – neuer Versuch morgen` }).eq("id", entry.id);
            res.result = "retry_statements";
            summary.push(res);
            continue;
          }

          const { error: delErr } = await admin.from("accounts").delete().eq("id", account.id);
          if (delErr) {
            await admin.from("account_offboardings")
              .update({ status: "failed", last_error: `Archivieren fehlgeschlagen: ${delErr.message}` }).eq("id", entry.id);
            res.error = delErr.message;
          } else {
            await admin.from("account_offboardings")
              .update({ status: "done", archived_at: new Date().toISOString(), last_error: missingNote ? `Archiviert trotz fehlender Belege: ${missingNote}` : null })
              .eq("id", entry.id);
            res.result = "archived";
          }
        } else {
          await admin.from("account_offboardings")
            .update({ status: "scheduled", last_error: r.backendHalt }).eq("id", entry.id);
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
