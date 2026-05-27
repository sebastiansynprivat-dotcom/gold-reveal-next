// Regenerates clean <slug>@shex.app emails + fresh passwords for ALL existing model_users.
// Admin-only. POST { dry_run?: boolean, only_messy?: boolean }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function generatePassword(length = 12): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) pw += chars[arr[i] % chars.length];
  return pw;
}

function slugify(input: string): string {
  return (
    (input || "")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "model"
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: isAdmin } = await userClient.rpc("is_admin");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: corsHeaders });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun: boolean = !!body.dry_run;
    const onlyMessy: boolean = body.only_messy !== false; // default: only fix non-clean emails

    const admin = createClient(supabaseUrl, serviceKey);

    // Pull every model_users row
    const { data: rows, error: rowsErr } = await admin
      .from("model_users")
      .select("id, user_id, model_id, email")
      .order("created_at", { ascending: true });

    if (rowsErr) {
      return new Response(JSON.stringify({ error: rowsErr.message }), { status: 500, headers: corsHeaders });
    }

    const cleanRe = /^[a-z0-9-]{1,32}(-\d+)?@shex\.app$/;
    const taken = new Set<string>((rows || []).map((r) => (r.email || "").toLowerCase()));

    const results: any[] = [];

    for (const row of rows || []) {
      const current = (row.email || "").toLowerCase();
      const isClean = cleanRe.test(current);
      if (onlyMessy && isClean) {
        results.push({ id: row.id, user_id: row.user_id, status: "skipped_already_clean", email: current });
        continue;
      }

      if (!row.model_id) {
        results.push({ id: row.id, user_id: row.user_id, status: "skipped_no_model" });
        continue;
      }

      const { data: model } = await admin
        .from("models")
        .select("name, username")
        .eq("id", row.model_id)
        .maybeSingle();

      const slug = slugify(model?.username || model?.name || row.model_id);

      // Find an available email
      let newEmail = `${slug}@shex.app`;
      taken.delete(current); // free the old one we're about to release
      if (taken.has(newEmail)) {
        for (let i = 2; i < 1000; i++) {
          const candidate = `${slug}-${i}@shex.app`;
          if (!taken.has(candidate)) {
            newEmail = candidate;
            break;
          }
        }
      }

      if (newEmail === current) {
        taken.add(current);
        results.push({ id: row.id, user_id: row.user_id, status: "already_correct", email: current });
        continue;
      }

      const newPassword = generatePassword(12);

      if (dryRun) {
        taken.add(newEmail);
        results.push({ id: row.id, user_id: row.user_id, status: "would_update", from: current, to: newEmail });
        continue;
      }

      // Update auth user (email + password)
      const { error: authErr } = await admin.auth.admin.updateUserById(row.user_id, {
        email: newEmail,
        password: newPassword,
        email_confirm: true,
      });
      if (authErr) {
        taken.add(current); // put back, we didn't free it
        results.push({ id: row.id, user_id: row.user_id, status: "auth_error", error: authErr.message, attempted: newEmail });
        continue;
      }

      // Mirror to model_users
      const { error: updErr } = await admin
        .from("model_users")
        .update({ email: newEmail, plaintext_password: newPassword })
        .eq("id", row.id);
      if (updErr) {
        results.push({ id: row.id, user_id: row.user_id, status: "db_error", error: updErr.message, email: newEmail });
        continue;
      }

      taken.add(newEmail);
      results.push({ id: row.id, user_id: row.user_id, status: "migrated", from: current, to: newEmail });
    }

    const summary = results.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return new Response(JSON.stringify({ summary, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: corsHeaders });
  }
});
