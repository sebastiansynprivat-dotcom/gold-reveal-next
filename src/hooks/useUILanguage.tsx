import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { translate, type Lang } from "@/i18n/translations";

const UI_LANG_EVENT = "ui-language-change";
const STORAGE_KEY = "ui_language";

function isLang(value: unknown): value is Lang {
  return value === "de" || value === "en";
}

// Only the DACH region gets German. Everything else (Spanish, French, African
// languages, unknown locales, …) falls back to English.
const DACH_REGIONS = ["DE", "AT", "CH", "LI"];

function detectBrowserLang(): Lang {
  if (typeof navigator === "undefined") return "en";
  const langs = [navigator.language, ...(navigator.languages || [])].filter(Boolean) as string[];
  for (const raw of langs) {
    const code = raw.toLowerCase();
    if (!code.startsWith("de")) continue;
    const region = raw.split(/[-_]/)[1]?.toUpperCase();
    // "de" without region → assume DACH; "de-DE/AT/CH/LI" → German; "de-XX" → English.
    if (!region || DACH_REGIONS.includes(region)) return "de";
  }
  // Timezone as a secondary DACH signal (e.g. locale set to English on a DACH phone
  // is intentional → stays English, so we only use TZ when no locale is exposed).
  if (langs.length === 0) {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (/^Europe\/(Berlin|Vienna|Zurich|Busingen|Vaduz)$/.test(tz)) return "de";
    } catch {
      /* noop */
    }
  }
  return "en";
}

function readCached(): Lang | null {
  try {
    const v = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

function writeCached(l: Lang) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(STORAGE_KEY, l);
  } catch {
    /* noop */
  }
}

// Detect exactly once, then lock the result in localStorage forever. Only an
// explicit change (setLang) or a language stored on the profile overrides it.
function initialLang(): Lang {
  const cached = readCached();
  if (cached) return cached;
  const detected = detectBrowserLang();
  writeCached(detected);
  return detected;
}


export function useUILanguage() {
  const { user } = useAuth();
  const [lang, setLangState] = useState<Lang>(initialLang);

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

  // Once logged in, prefer the language stored on the profile (pre-set by admins
  // during pre-create, or persisted from a previous session). This guarantees a
  // chatter pre-created as English never flickers to German.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("language, ui_language")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled || !data) return;

      const dbLang: Lang | null = isLang(data.language)
        ? (data.language as Lang)
        : isLang(data.ui_language)
          ? (data.ui_language as Lang)
          : null;

      if (dbLang) {
        writeCached(dbLang);
        setLangState((prev) => {
          if (prev !== dbLang) {
            try {
              window.dispatchEvent(new CustomEvent(UI_LANG_EVENT, { detail: dbLang }));
            } catch {
              /* noop */
            }
          }
          return dbLang;
        });
        // Mirror to ui_language so backend helpers stay in sync.
        if (data.ui_language !== dbLang) {
          void supabase.from("profiles").update({ ui_language: dbLang }).eq("user_id", user.id);
        }
      } else {
        // First sign-in with no language set yet → persist the detected one.
        const detected = detectBrowserLang();
        writeCached(detected);
        void supabase
          .from("profiles")
          .update({ language: detected, ui_language: detected })
          .eq("user_id", user.id);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const setLang = useCallback(
    async (next: Lang) => {
      setLangState(next);
      writeCached(next);
      try {
        window.dispatchEvent(new CustomEvent(UI_LANG_EVENT, { detail: next }));
      } catch {
        /* noop */
      }
      if (user) {
        void supabase
          .from("profiles")
          .update({ language: next, ui_language: next })
          .eq("user_id", user.id);
      }
    },
    [user?.id],
  );

  const t = useCallback((key: string, fallback?: string) => translate(lang, key, fallback), [lang]);

  return { lang, setLang, t };
}
