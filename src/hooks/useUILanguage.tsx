import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { translate, type Lang } from "@/i18n/translations";

const LS_KEY = "ui_language";
const UI_LANG_EVENT = "ui-language-change";
const PROFILE_LANG_SYNC_MS = 15000;
const MANUAL_CHANGE_GRACE_MS = 2500;
type ProfileLanguageRow = { ui_language?: string | null };

let lastManualLanguageChangeAt = 0;

function isLang(value: unknown): value is Lang {
  return value === "de" || value === "en";
}

function cacheLang(next: Lang) {
  try { window.localStorage.setItem(LS_KEY, next); } catch { return; }
}

function notifyLang(next: Lang) {
  cacheLang(next);
  try { window.dispatchEvent(new CustomEvent(UI_LANG_EVENT, { detail: next })); } catch { return; }
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

  const localChangeRef = useRef(0);

  // Keep DB-driven language changes in sync. This is intentionally revalidated
  // because backend-side/admin-side profile updates are not guaranteed to reach
  // every already-open dashboard tab via realtime immediately.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const syncProfileLanguage = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("ui_language")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const dbLang = (data as ProfileLanguageRow | null)?.ui_language;
      if (isLang(dbLang)) {
        if (Date.now() - lastManualLanguageChangeAt < MANUAL_CHANGE_GRACE_MS) return;
        setLangState(dbLang);
        notifyLang(dbLang);
      } else {
        // First time: persist the detected browser language so the user keeps it
        const detected = readCached();
        await supabase.from("profiles").update({ ui_language: detected }).eq("user_id", user.id);
      }
    };
    void syncProfileLanguage();
    const onFocus = () => void syncProfileLanguage();
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncProfileLanguage();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(syncProfileLanguage, PROFILE_LANG_SYNC_MS);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, [user?.id]);

  // Realtime sync if changed elsewhere
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`profiles-lang-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const next = (payload.new as ProfileLanguageRow)?.ui_language;
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
    lastManualLanguageChangeAt = Date.now();
    localChangeRef.current = lastManualLanguageChangeAt;
    setLangState(next);
    notifyLang(next);
    if (user) {
      await supabase.from("profiles").update({ ui_language: next }).eq("user_id", user.id);
    }
  }, [user]);

  const t = useCallback((key: string, fallback?: string) => translate(lang, key, fallback), [lang]);

  return { lang, setLang, t };
}
