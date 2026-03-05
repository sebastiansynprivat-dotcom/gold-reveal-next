import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();
    const currentDay = now.getUTCDay(); // 0=Sun, 6=Sat
    const currentDayOfMonth = now.getUTCDate();

    // Fetch all active scheduled notifications
    const { data: schedules, error } = await adminClient
      .from("scheduled_notifications")
      .select("*")
      .eq("is_active", true);

    if (error) throw error;
    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No active schedules" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let processed = 0;

    for (const schedule of schedules) {
      // Parse send_time (HH:MM:SS format)
      const [sendHour, sendMinute] = schedule.send_time.split(":").map(Number);

      // Check if current time matches send_time (within 5 min window)
      const timeMatch = currentHour === sendHour && Math.abs(currentMinute - sendMinute) < 5;
      if (!timeMatch) continue;

      // Check if already sent today
      if (schedule.last_sent_at) {
        const lastSent = new Date(schedule.last_sent_at);
        const todayStart = new Date(now);
        todayStart.setUTCHours(0, 0, 0, 0);
        if (lastSent >= todayStart) continue; // Already sent today
      }

      // Check frequency-specific conditions
      let shouldSend = false;

      if (schedule.frequency === "daily") {
        shouldSend = true;
      } else if (schedule.frequency === "weekly") {
        shouldSend = currentDay === (schedule.weekday ?? 1); // Default Monday
      } else if (schedule.frequency === "monthly") {
        shouldSend = currentDayOfMonth === (schedule.day_of_month ?? 1);
      }

      if (!shouldSend) continue;

      // Send notification via send-notification function
      const sendRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({ title: schedule.title, body: schedule.body }),
        }
      );

      if (sendRes.ok) {
        // Update last_sent_at
        await adminClient
          .from("scheduled_notifications")
          .update({ last_sent_at: now.toISOString() })
          .eq("id", schedule.id);
        processed++;
      }
    }

    return new Response(
      JSON.stringify({ processed, total: schedules.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
