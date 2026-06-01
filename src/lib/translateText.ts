// Admin helper: auto-translate a single string via the translate-batch edge function.
// Used to keep DE/EN content in sync when an admin saves a German source.

import { supabase } from "@/integrations/supabase/client";

export type Lang = "de" | "en";

export async function translateString(
  text: string,
  sourceLang: Lang = "de",
  targetLang: Lang = "en"
): Promise<string> {
  const t = (text ?? "").trim();
  if (!t || sourceLang === targetLang) return text ?? "";
  try {
    const { data, error } = await supabase.functions.invoke("translate-batch", {
      body: { strings: [text], sourceLang, targetLang },
    });
    if (error) {
      console.warn("[translateString] error", error);
      return "";
    }
    const out = (data as any)?.translations?.[0];
    return typeof out === "string" ? out : "";
  } catch (e) {
    console.warn("[translateString] failed", e);
    return "";
  }
}

export async function translateStrings(
  strings: string[],
  sourceLang: Lang = "de",
  targetLang: Lang = "en"
): Promise<string[]> {
  if (!strings.length || sourceLang === targetLang) return strings;
  try {
    const { data, error } = await supabase.functions.invoke("translate-batch", {
      body: { strings, sourceLang, targetLang },
    });
    if (error) {
      console.warn("[translateStrings] error", error);
      return strings.map(() => "");
    }
    const out = (data as any)?.translations;
    return Array.isArray(out) ? out.map((s) => String(s ?? "")) : strings.map(() => "");
  } catch (e) {
    console.warn("[translateStrings] failed", e);
    return strings.map(() => "");
  }
}
