import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_PLATFORMS = ["new", "maloum", "4based", "brezzels"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get("x-api-key");
    const expected = Deno.env.get("REVENUE_INGEST_API_KEY");
    if (!expected || apiKey !== expected) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const rows = Array.isArray(body) ? body : [body];

    const validated = [];
    for (const r of rows) {
      if (!r || typeof r !== "object") {
        return new Response(JSON.stringify({ error: "Invalid row" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { date, platform, data, revenue_today } = r as Record<string, unknown>;
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return new Response(JSON.stringify({ error: "date must be YYYY-MM-DD" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (typeof platform !== "string" || !ALLOWED_PLATFORMS.includes(platform)) {
        return new Response(
          JSON.stringify({ error: `platform must be one of ${ALLOWED_PLATFORMS.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (revenue_today !== undefined && revenue_today !== null && typeof revenue_today !== "number") {
        return new Response(JSON.stringify({ error: "revenue_today must be a number" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      validated.push({
        date,
        platform,
        data: data ?? null,
        revenue_today: revenue_today ?? null,
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Fetch existing rows so we can diff individual sales
    const keys = validated.map((r) => ({ date: r.date, platform: r.platform }));
    const { data: existingRows } = await supabase
      .from("revenue_report")
      .select("date, platform, data")
      .in("date", Array.from(new Set(keys.map((k) => k.date))))
      .in("platform", Array.from(new Set(keys.map((k) => k.platform))));
    const existingMap = new Map<string, any>();
    for (const er of existingRows ?? []) {
      existingMap.set(`${er.date}|${er.platform}`, er.data ?? {});
    }

    const { data: result, error } = await supabase
      .from("revenue_report")
      .upsert(validated, { onConflict: "date,platform" })
      .select();

    if (error) {
      console.error("Upsert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fire-and-forget admin push for each NEW individual sale (diff vs previous data)
    // Also collect new sales for surge detection
    const newSalesAll: Array<{ platform: string; model: string; amount: number }> = [];
    try {
      const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      // First pass: collect new sales
      const pendingSales: Array<{ platform: string; model: string; amount: number }> = [];
      for (const r of validated) {
        const newData = (r.data ?? {}) as Record<string, number[]>;
        const oldData = (existingMap.get(`${r.date}|${r.platform}`) ?? {}) as Record<string, number[]>;
        if (!newData || typeof newData !== "object") continue;

        for (const [model, salesRaw] of Object.entries(newData)) {
          const sales = Array.isArray(salesRaw) ? salesRaw.map(Number).filter((n) => Number.isFinite(n)) : [];
          const oldSales = Array.isArray(oldData[model]) ? oldData[model].map(Number).filter((n) => Number.isFinite(n)) : [];

          const counts = new Map<number, number>();
          for (const v of oldSales) counts.set(v, (counts.get(v) ?? 0) + 1);
          for (const v of sales) {
            const c = counts.get(v) ?? 0;
            if (c > 0) counts.set(v, c - 1);
            else {
              pendingSales.push({ platform: r.platform, model, amount: v });
              newSalesAll.push({ platform: r.platform, model, amount: v });
            }
          }
        }
      }

      // Build chatter lookup: platform+model -> chatter group_name
      // Match accounts via linked model.name OR folder_name/subfolder_name (case-insensitive platform)
      const chatterMap = new Map<string, string>();
      if (pendingSales.length > 0) {
        const uniquePairs = new Set(pendingSales.map((s) => `${s.platform}|${s.model.toLowerCase()}`));

        const { data: accs } = await supabase
          .from("accounts")
          .select("platform, folder_name, subfolder_name, assigned_to, model_id, models:model_id(name)")
          .not("assigned_to", "is", null);

        const userIds = Array.from(new Set((accs ?? []).map((a: any) => a.assigned_to).filter(Boolean)));
        const profileMap = new Map<string, string>();
        if (userIds.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, group_name")
            .in("user_id", userIds);
          const cleanName = (n: string) =>
            (n || "")
              .replace(/\s*\([^)]*\)\s*/g, " ")
              .replace(/\p{Extended_Pictographic}/gu, "")
              // strip ZWJ, variation selectors, zero-width & bidi marks that iOS renders as wide gaps
              .replace(/[\u200B-\u200F\u2028-\u202F\u205F-\u206F\uFE00-\uFE0F\uFEFF]/g, "")
              .replace(/[\t\n\r\f\v\u00A0\u1680\u2000-\u200A\u3000]+/g, " ")
              .replace(/\s+/g, " ")
              .trim();
          for (const p of profs ?? []) profileMap.set(p.user_id, cleanName(p.group_name || ""));
        }

        for (const a of accs ?? []) {
          const accPlatform = (a.platform || "").toLowerCase().trim();
          const candidates = [
            (a.models as any)?.name,
            a.subfolder_name,
            a.folder_name,
          ]
            .filter(Boolean)
            .map((n: string) => String(n).toLowerCase().trim());

          for (const name of candidates) {
            const key = `${accPlatform}|${name}`;
            if (uniquePairs.has(key) && a.assigned_to) {
              const ch = profileMap.get(a.assigned_to);
              if (ch && !chatterMap.has(key)) chatterMap.set(key, ch);
            }
          }
        }
      }

      const platformLabel = (p: string) =>
        p === "maloum" ? "🟠 Maloum" : p === "brezzels" ? "🔵 Brezzels" : p === "4based" ? "🔴 4based" : "⚪ New";

      for (const s of pendingSales) {
        const chatter = chatterMap.get(`${s.platform}|${s.model.toLowerCase()}`);
        const amountStr = s.amount.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + "€";
        const parts = [platformLabel(s.platform), s.model];
        if (chatter) parts.push(chatter);
        const bodyText = parts.join(" · ");
        fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            event: "new_revenue",
            title: `💰NEUER ${amountStr} VERKAUF!`,
            body: bodyText,
            url: "/admin",
          }),
        }).catch(() => {});
      }
    } catch (_) { /* ignore */ }

    // ============ SURGE DETECTION ============
    // Log new sales and check for bursts/big sales worthy of a "🔥 HOT STREAK" push
    try {
      if (newSalesAll.length > 0) {
        const adminPushUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-admin-push`;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const BURST_WINDOW_MIN = 15;
        const BURST_THRESHOLD = 3;
        const BIG_SALE_THRESHOLD = 100;
        const COOLDOWN_MIN = 20;
        const platformIcon = (p: string) =>
          p === "maloum" ? "🟠" : p === "brezzels" ? "🔵" : p === "4based" ? "🔴" : "⚪";

        // 1. Persist all new sale events
        await supabase.from("revenue_sale_events").insert(
          newSalesAll.map((s) => ({ platform: s.platform, model: s.model, amount: s.amount })),
        );

        // 2. Group by platform+model
        const groups = new Map<string, { platform: string; model: string; amounts: number[] }>();
        for (const s of newSalesAll) {
          const key = `${s.platform}|${s.model}`;
          if (!groups.has(key)) groups.set(key, { platform: s.platform, model: s.model, amounts: [] });
          groups.get(key)!.amounts.push(s.amount);
        }

        const windowStart = new Date(Date.now() - BURST_WINDOW_MIN * 60_000).toISOString();

        for (const { platform, model, amounts } of groups.values()) {
          const scope = `${platform}|${model}`;

          // Cooldown check
          const { data: cooldown } = await supabase
            .from("revenue_surge_log")
            .select("last_sent_at")
            .eq("scope", scope)
            .maybeSingle();
          if (cooldown?.last_sent_at) {
            const ageMin = (Date.now() - new Date(cooldown.last_sent_at).getTime()) / 60_000;
            if (ageMin < COOLDOWN_MIN) continue;
          }

          // Detect BIG SALE
          const bigOne = amounts.find((a) => a >= BIG_SALE_THRESHOLD);

          // Detect BURST: count sales in window
          const { data: recent } = await supabase
            .from("revenue_sale_events")
            .select("amount, occurred_at")
            .eq("platform", platform)
            .eq("model", model)
            .gte("occurred_at", windowStart)
            .order("occurred_at", { ascending: true });

          const recentCount = recent?.length ?? 0;
          const recentSum = (recent ?? []).reduce((a: number, r: any) => a + Number(r.amount || 0), 0);
          const oldestAgeMin = recent && recent.length > 0
            ? Math.max(1, Math.round((Date.now() - new Date(recent[0].occurred_at).getTime()) / 60_000))
            : BURST_WINDOW_MIN;

          let title = "";
          let body = "";

          if (bigOne) {
            title = "💰 BIG ONE!";
            body = `${platformIcon(platform)} ${platform.toUpperCase()} · ${model} · ${bigOne.toLocaleString("de-DE", { maximumFractionDigits: 0 })}€ auf einen Schlag 🚀`;
          } else if (recentCount >= BURST_THRESHOLD) {
            title = "🔥 HOT STREAK!";
            body = `${platformIcon(platform)} ${platform.toUpperCase()} · ${model} · ${recentCount} Sales in ${oldestAgeMin} Min · +${recentSum.toLocaleString("de-DE", { maximumFractionDigits: 0 })}€ ⚡`;
          } else {
            continue;
          }

          // Send surge push
          fetch(adminPushUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({
              event: "revenue_surge",
              title,
              body,
              url: "/admin",
              tag: `surge-${platform}-${model}`,
            }),
          }).catch(() => {});

          // Update cooldown
          await supabase
            .from("revenue_surge_log")
            .upsert({ scope, last_sent_at: new Date().toISOString() }, { onConflict: "scope" });
        }
      }
    } catch (e) {
      console.error("Surge detection error:", e);
    }


    return new Response(JSON.stringify({ success: true, count: result?.length ?? 0, rows: result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Handler error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
