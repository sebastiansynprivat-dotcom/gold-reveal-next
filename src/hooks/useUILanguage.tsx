import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { translate, type Lang } from "@/i18n/translations";

const LS_KEY = "ui_language";

function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "de";
  const langs = [navigator.language, ...(navigator.languages || [])];
  for (const l of langs) {
    if (!l) continue;
    const code = l.toLowerCase();
    if (code.startsWith("de")) return "de";
    if (code.startsWith("en")) return "en";
  }
  return "de";
}

function readCached(): Lang {
  if (typeof window === "undefined") return "de";
  const v = window.localStorage.getItem(LS_KEY);
  if (v === "de" || v === "en") return v;
  return detectBrowserLang();
}

export function useUILanguage() {
  const { user } = useAuth();
  const [lang, setLangState] = useState<Lang>(() => readCached());

  // Load from DB once we know the user
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("ui_language")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const dbLang = (data as any)?.ui_language as Lang | null | undefined;
      if (dbLang === "de" || dbLang === "en") {
        setLangState(dbLang);
        try { window.localStorage.setItem(LS_KEY, dbLang); } catch {}
      } else {
        // First time: persist the detected browser language so the user keeps it
        const detected = readCached();
        await supabase.from("profiles").update({ ui_language: detected } as any).eq("user_id", user.id);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  // Realtime sync if changed elsewhere
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`profiles-lang-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new as any)?.ui_language;
          if (next === "de" || next === "en") {
            setLangState(next);
            try { window.localStorage.setItem(LS_KEY, next); } catch {}
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const setLang = useCallback(async (next: Lang) => {
    setLangState(next);
    try { window.localStorage.setItem(LS_KEY, next); } catch {}
    if (user) {
      await supabase.from("profiles").update({ ui_language: next } as any).eq("user_id", user.id);
    }
  }, [user]);

  const t = useCallback((key: string, fallback?: string) => translate(lang, key, fallback), [lang]);

  return { lang, setLang, t };
}
