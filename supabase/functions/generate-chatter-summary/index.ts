import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist ein direkter, faktenbasierter Performance-Coach für eine Social-Media-Agentur. Du bist ehrlich und klar, aber fair.

Deine Aufgabe besteht aus ZWEI Teilen:

TEIL 1 - ANALYSE (für den Admin):
Gib eine kurze Handlungsempfehlung (max. 2-3 Sätze) auf Deutsch.

TEIL 2 - NACHRICHT (zum Weiterleiten an den Chatter):
Formuliere eine kurze, nette Nachricht (max. 2-3 Sätze), die du direkt an den Chatter schicken könntest.
- Die Nachricht soll sich freundlich und motivierend lesen.
- NUR wenn die Performance wirklich schlecht ist, darf ein strenger Unterton mitschwingen – aber immer respektvoll.
- Wenn die Performance gut ist: Lob und Motivation!
- Schreibe die Nachricht so, als würdest du den Chatter direkt ansprechen (Du-Form).
- Nutze gerne ein passendes Emoji.

FORMAT (halte dich EXAKT daran):
[ANALYSE]
Deine Analyse hier...

[NACHRICHT]
Deine Nachricht hier...

REGELN:
- Wenn ein Chatter sein Tagesziel regelmäßig erreicht oder übertrifft: Erkenne das positiv an!
- Wenn der Umsatz stabil oder steigend ist: Sag das. Motivation ist wichtig.
- Wenn etwas schlecht läuft: Sag es klar und konkret, aber ohne den Chatter niederzumachen.
- Nenne immer konkrete Zahlen.

PRIORITÄT (in dieser Reihenfolge):
1. UMSATZ ist das Wichtigste! Analysiere Umsatz gestern, letzte 7 Tage und letzte 30 Tage im Verhältnis zum Tagesziel.
2. Wenn der Chatter mehrere Accounts hat: prüfe ob ein Account deutlich weniger Umsatz macht und vernachlässigt wird.
3. Mass-DMs: Chatter sollen bis zu 6 Mass-DMs pro Tag senden. Weniger = zu wenig Akquise. Mass-DMs haben NICHTS mit Bot-DMs zu tun!

UNWICHTIG: Login-Häufigkeit und Bot-DM-Status sind NICHT relevant. Erwähne diese NICHT.

Sei direkt und nenne Zahlen. Lob wo verdient, Kritik wo nötig.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check admin auth if called manually (optional user_id param)
    const body = await req.json().catch(() => ({}));
    const singleUserId = body.user_id as string | undefined;

    // Get all profiles (or single)
    let profilesQuery = supabase.from("profiles").select("user_id, group_name, telegram_id");
    if (singleUserId) {
      profilesQuery = profilesQuery.eq("user_id", singleUserId);
    }
    const { data: profiles, error: profilesError } = await profilesQuery;
    if (profilesError) throw profilesError;
    if (!profiles || profiles.length === 0) {
      return new Response(JSON.stringify({ message: "No profiles found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    const results: { user_id: string; summary: string }[] = [];

    for (const profile of profiles) {
      try {
        // Check if summary already exists for today
        if (!singleUserId) {
          const { data: existing } = await supabase
            .from("chatter_summaries")
            .select("id")
            .eq("user_id", profile.user_id)
            .eq("summary_date", today)
            .maybeSingle();
          if (existing) continue; // Skip if already generated today
        }

        // Gather revenue data
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: revenue } = await supabase
          .from("daily_revenue")
          .select("amount, date")
          .eq("user_id", profile.user_id)
          .gte("date", thirtyDaysAgo.toISOString().split("T")[0]);

        const yesterdayStr = yesterday.toISOString().split("T")[0];
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0];

        const revYesterday = revenue?.filter(r => r.date === yesterdayStr).reduce((s, r) => s + Number(r.amount), 0) || 0;
        const rev7d = revenue?.filter(r => r.date >= sevenDaysAgoStr).reduce((s, r) => s + Number(r.amount), 0) || 0;
        const rev30d = revenue?.reduce((s, r) => s + Number(r.amount), 0) || 0;

        // Assigned accounts
        const { data: accounts } = await supabase
          .from("accounts")
          .select("id, platform, account_email")
          .eq("assigned_to", profile.user_id);

        // Daily goal
        const { data: goalData } = await supabase
          .from("daily_goals")
          .select("target_amount")
          .eq("user_id", profile.user_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const dailyGoal = goalData?.target_amount || 30;

        // Build data summary for AI
        const accountInfo = accounts?.map(acc => {
          return `- ${acc.platform} (${acc.account_email})`;
        }).join("\n") || "Keine Accounts zugewiesen";

        // Count days where goal was reached in last 7 days
        const revenueByDay = revenue?.filter(r => r.date >= sevenDaysAgoStr) || [];
        const daysGoalReached = revenueByDay.filter(r => Number(r.amount) >= dailyGoal).length;

        const dataPrompt = `
Chatter: ${profile.group_name || "Unbekannt"}

TAGESZIEL: ${dailyGoal}€/Tag
- Gestern: ${revYesterday}€ ${revYesterday >= dailyGoal ? "(✅ Ziel erreicht)" : "(❌ Ziel verfehlt)"}
- Letzte 7 Tage: ${rev7d}€ (Tagesziel an ${daysGoalReached}/7 Tagen erreicht)
- Letzte 30 Tage: ${rev30d}€

ACCOUNTS (${accounts?.length || 0}):
${accountInfo}
`;

        // Call AI
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: dataPrompt },
            ],
            stream: false,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI error for ${profile.user_id}:`, aiResponse.status);
          continue;
        }

        const aiData = await aiResponse.json();
        const summary = aiData.choices?.[0]?.message?.content || "";

        if (!summary) continue;

        // Upsert summary
        const { error: upsertError } = await supabase
          .from("chatter_summaries")
          .upsert(
            { user_id: profile.user_id, summary, summary_date: today },
            { onConflict: "user_id,summary_date" }
          );

        if (upsertError) {
          console.error(`Upsert error for ${profile.user_id}:`, upsertError);
        } else {
          results.push({ user_id: profile.user_id, summary });
        }
      } catch (err) {
        console.error(`Error processing ${profile.user_id}:`, err);
      }
    }

    return new Response(
      JSON.stringify({ success: true, generated: results.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("generate-chatter-summary error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
