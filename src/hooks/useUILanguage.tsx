import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { translate, type Lang } from "@/i18n/translations";

const UI_LANG_EVENT = "ui-language-change";

function isLang(value: unknown): value is Lang {
  return value === "de" || value === "en";
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

export function useUILanguage() {
  const { user } = useAuth();
  const [lang, setLangState] = useState<Lang>(() => detectBrowserLang());

  // Keep all hook instances in the same tab in sync via custom event.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onLanguageChange = (event: Event) => {
      const next = (event as CustomEvent<Lang>).detail;
      if (isLang(next)) setLangState(next);
    };
    window.addEventListener(UI_LANG_EVENT, onLanguageChange);
    return () => window.removeEventListener(UI_LANG_EVENT, onLanguageChange);
  }, []);

  // Re-detect when the browser language changes (rare) or tab regains focus.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => {
      const next = detectBrowserLang();
      setLangState((prev) => (prev === next ? prev : next));
    };
    window.addEventListener("languagechange", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener("languagechange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  // Persist the detected language to the profile so backend (edge functions,
  // push notifications, AI prompts) can use it. No DB → UI sync.
  useEffect(() => {
    if (!user) return;
    const detected = detectBrowserLang();
    void supabase.from("profiles").update({ ui_language: detected }).eq("user_id", user.id);
  }, [user?.id, lang]);

  // Kept for backwards compatibility with callers (e.g. LanguageToggle); now a no-op
  // beyond firing the in-tab event, since language is fully auto-detected.
  const setLang = useCallback(async (next: Lang) => {
    setLangState(next);
    try { window.dispatchEvent(new CustomEvent(UI_LANG_EVENT, { detail: next })); } catch { /* noop */ }
  }, []);

  const t = useCallback((key: string, fallback?: string) => translate(lang, key, fallback), [lang]);

  return { lang, setLang, t };
}
