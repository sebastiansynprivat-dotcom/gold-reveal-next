import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

function generatePassword(length = 14): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  let pw = "";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) pw += chars[arr[i] % chars.length];
  return pw;
}

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(url, key);
  const email = "sandranatterer01@gmail.com";
  let target = null;
  let page = 1;
  while (!target) {
    const { data } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (!data.users.length) break;
    target = data.users.find(u => u.email?.toLowerCase() === email) || null;
    if (data.users.length < 1000) break;
    page++;
  }
  if (!target) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
  const pw = generatePassword(14);
  const { error } = await sb.auth.admin.updateUserById(target.id, { password: pw, email_confirm: true });
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  return new Response(JSON.stringify({ email, password: pw }), { headers: { "Content-Type": "application/json" } });
});
