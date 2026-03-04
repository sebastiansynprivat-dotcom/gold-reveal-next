import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist ein extrem strenger Performance-Coach für eine Social-Media-Agentur. Du zeigst keine Gefühle und arbeitest ausschließlich mit Fakten.

Deine Aufgabe: Analysiere die Daten eines Chatters und gib eine kurze, knallharte Handlungsempfehlung (max. 2-3 Sätze) auf Deutsch.

PRIORITÄT (in dieser Reihenfolge):
1. UMSATZ ist das Wichtigste! Analysiere Umsatz gestern, letzte 7 Tage und letzte 30 Tage. Nenne die konkreten Zahlen.
2. Wenn der Chatter mehrere Accounts hat: prüfe ob ein Account deutlich weniger Umsatz macht und vernachlässigt wird.
3. Mass-DMs: Wie viele wurden geschickt? Zu wenig = zu wenig Akquise.
4. Bot-DM Status: Ist die Bot-DM eingerichtet und aktiv?

UNWICHTIG: Login-Häufigkeit ist NICHT relevant. Erwähne Logins NICHT in deiner Analyse.

Sei direkt, konkret und nenne Zahlen. Kein Lob ohne Grund. Wenn etwas schlecht läuft, sag es klar.`;

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

        // Login activity
        const { data: logins } = await supabase
          .from("login_events")
          .select("logged_in_at")
          .eq("user_id", profile.user_id)
          .order("logged_in_at", { ascending: false })
          .limit(30);

        const lastLogin = logins?.[0]?.logged_in_at || null;
        const loginCount7d = logins?.filter(l => new Date(l.logged_in_at) >= sevenDaysAgo).length || 0;
        const loginCount30d = logins?.length || 0;

        // Assigned accounts
        const { data: accounts } = await supabase
          .from("accounts")
          .select("id, platform, account_email")
          .eq("assigned_to", profile.user_id);

        // Bot messages status
        const { data: botMessages } = await supabase
          .from("bot_messages")
          .select("account_id, is_active, message")
          .eq("user_id", profile.user_id);

        // Build data summary for AI
        const accountInfo = accounts?.map(acc => {
          const bot = botMessages?.find(b => b.account_id === acc.id);
          return `- ${acc.platform} (${acc.account_email}): Bot-DM ${bot?.is_active ? "aktiv" : bot?.message ? "inaktiv" : "nicht eingerichtet"}`;
        }).join("\n") || "Keine Accounts zugewiesen";

        const daysSinceLogin = lastLogin
          ? Math.floor((now.getTime() - new Date(lastLogin).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const dataPrompt = `
Chatter: ${profile.group_name || "Unbekannt"}
Telegram: ${profile.telegram_id || "nicht hinterlegt"}

UMSATZ:
- Gestern: ${revYesterday}€
- Letzte 7 Tage: ${rev7d}€
- Letzte 30 Tage: ${rev30d}€

LOGIN-AKTIVITÄT:
- Letzter Login: ${lastLogin ? `vor ${daysSinceLogin} Tag(en)` : "nie eingeloggt"}
- Logins letzte 7 Tage: ${loginCount7d}
- Logins letzte 30 Tage: ${loginCount30d}

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
