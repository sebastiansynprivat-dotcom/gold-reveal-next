import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyCaller, unauthorized } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Du bist ein Compliance-Prüfer einer Chat-Agentur. Du prüfst Custom-Content-Anfragen, die ein Chatter im Namen eines Kunden an ein Model stellt.

Du markierst eine Anfrage als KRITISCH ("flagged"), wenn irgendein Hinweis darauf besteht, dass der Chatter versucht, die Agentur zu umgehen oder direkten/privaten Kontakt zum Model aufzubauen. Beispiele:
- Aufforderung, privat zu schreiben ("schreib mir privat", "melde dich direkt bei mir", "DM me")
- Weitergabe oder Erfragen von Kontaktdaten: Telefonnummern, E-Mails, Telegram/WhatsApp/Snapchat/Instagram-Usernames, Links zu privaten Profilen
- Vorschlag, außerhalb der Plattform/Agentur zu kommunizieren oder zu bezahlen
- Aufforderung zu Treffen, persönlichem Kontakt, Geldtransfer außerhalb des Systems
- Beleidigende, bedrohliche oder klar illegale Inhalte

NICHT kritisch sind normale Content-Wünsche (Outfits, Posen, Videolängen, Ansprache mit Kundennamen, Preise, Deadlines, "sag meinen Namen", "Audio mit meinem Namen"), auch wenn sie explizit sexuell sind.

Antworte AUSSCHLIESSLICH mit JSON:
{"verdict":"ok"|"flagged","reason":"kurze Begründung auf Deutsch (max 160 Zeichen)"}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const caller = await verifyCaller(req);
    if (!caller) return unauthorized(corsHeaders);

    const { requestId } = await req.json();
    if (!requestId || typeof requestId !== "string") {
      return new Response(JSON.stringify({ error: "requestId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: reqRow, error: loadErr } = await service
      .from("model_requests")
      .select("id, user_id, model_name, description, customer_name, price, status, compliance_status")
      .eq("id", requestId)
      .maybeSingle();

    if (loadErr || !reqRow) {
      return new Response(JSON.stringify({ error: "Request not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only the owning chatter or an admin may trigger the screening.
    if (!caller.isAdmin && !caller.isServiceRole && caller.userId !== (reqRow as any).user_id) {
      return unauthorized(corsHeaders, "Forbidden");
    }

    if ((reqRow as any).compliance_status !== "pending") {
      return new Response(
        JSON.stringify({ verdict: (reqRow as any).compliance_status, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let verdict: "ok" | "flagged" = "flagged";
    let reason = "Automatische Prüfung nicht möglich — bitte manuell prüfen.";

    if (LOVABLE_API_KEY) {
      const userText = [
        `Model: ${(reqRow as any).model_name || "-"}`,
        `Kunde: ${(reqRow as any).customer_name || "-"}`,
        `Preis: ${(reqRow as any).price ?? "-"}`,
        `Anfrage: ${(reqRow as any).description || ""}`,
      ].join("\n");

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.7-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userText },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (aiRes.ok) {
        const json = await aiRes.json();
        const content = json?.choices?.[0]?.message?.content ?? "";
        try {
          const parsed = JSON.parse(String(content).replace(/```json|```/g, "").trim());
          if (parsed?.verdict === "ok" || parsed?.verdict === "flagged") {
            verdict = parsed.verdict;
            reason = String(parsed.reason || "").slice(0, 300) || (verdict === "ok" ? "Konform" : "Kritisch");
          }
        } catch (_e) {
          console.error("screen-model-request: unparsable AI reply", content);
        }
      } else {
        console.error("screen-model-request: AI gateway error", aiRes.status, await aiRes.text());
      }
    } else {
      console.error("screen-model-request: LOVABLE_API_KEY missing");
    }

    const nowIso = new Date().toISOString();
    const update: Record<string, unknown> = {
      compliance_status: verdict === "ok" ? "approved" : "flagged",
      compliance_reason: reason,
      compliance_checked_at: nowIso,
    };

    let forwardedModelUserId: string | null = null;

    if (verdict === "ok" && (reqRow as any).status === "pending") {
      // Keep status "pending" (offen) — admins still decide manually.
      // We only mark it as KI-approved + forwarded so the model sees it.
      update.forwarded_to_model_at = nowIso;
      update.auto_forwarded = true;

      // Resolve the model's dashboard user for a push notification.
      const { data: full } = await service
        .from("model_requests")
        .select("model_id")
        .eq("id", requestId)
        .maybeSingle();
      const modelId = (full as any)?.model_id;
      if (modelId) {
        const { data: mu } = await service
          .from("model_users")
          .select("user_id")
          .eq("model_id", modelId)
          .maybeSingle();
        if ((mu as any)?.user_id) forwardedModelUserId = (mu as any).user_id;
      }
    }

    const { error: upErr } = await service.from("model_requests").update(update).eq("id", requestId);
    if (upErr) throw upErr;

    // Notify: model on auto-forward, admins on a flagged request.
    try {
      if (forwardedModelUserId) {
        await service.functions.invoke("send-notification", {
          body: {
            target_user_id: forwardedModelUserId,
            title: "📩 Neue Anfrage",
            body: "Eine neue Custom-Anfrage wartet in deinem Dashboard.",
            url: "/model",
          },
        });
      }
      if (verdict === "flagged") {
        await service.functions.invoke("send-admin-push", {
          body: {
            event: "request_flagged",
            title: "🚨 ANFRAGE ZUR ÜBERPRÜFUNG",
            body: `${(reqRow as any).model_name || "Model"} · ${reason}`,
            url: "/admin",
          },
        });
      }
    } catch (e) {
      console.error("screen-model-request: notification failed", e);
    }

    return new Response(JSON.stringify({ verdict, reason }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("screen-model-request error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
