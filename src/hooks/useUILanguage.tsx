import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { translate, type Lang } from "@/i18n/translations";

const LS_KEY = "ui_language";
const UI_LANG_EVENT = "ui-language-change";

function isLang(value: unknown): value is Lang {
  return value === "de" || value === "en";
}

function cacheLang(next: Lang) {
  try { window.localStorage.setItem(LS_KEY, next); } catch {}
}

function notifyLang(next: Lang) {
  cacheLang(next);
  try { window.dispatchEvent(new CustomEvent(UI_LANG_EVENT, { detail: next })); } catch {}
}

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
  if (isLang(v)) return v;
  return detectBrowserLang();
}

export function useUILanguage() {
  const { user } = useAuth();
  const [lang, setLangState] = useState<Lang>(() => readCached());

  // Keep all hook instances in the same tab in sync (toggle, floating toggle,
  // AutoTranslator, dashboard widgets). Storage events alone do not fire in the
  // same tab that wrote localStorage.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<Lang>).detail;
      if (isLang(next)) setLangState(next);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === LS_KEY && isLang(event.newValue)) setLangState(event.newValue);
    };
    window.addEventListener(UI_LANG_EVENT, onLanguageChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(UI_LANG_EVENT, onLanguageChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

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
      if (isLang(dbLang)) {
        setLangState(dbLang);
        cacheLang(dbLang);
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
          if (isLang(next)) {
            setLangState(next);
            notifyLang(next);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const setLang = useCallback(async (next: Lang) => {
    setLangState(next);
    notifyLang(next);
    if (user) {
      await supabase.from("profiles").update({ ui_language: next } as any).eq("user_id", user.id);
    }
  }, [user]);

  const t = useCallback((key: string, fallback?: string) => translate(lang, key, fallback), [lang]);

  return { lang, setLang, t };
}
