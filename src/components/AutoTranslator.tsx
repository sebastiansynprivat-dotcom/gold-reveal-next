import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useUILanguage } from "@/hooks/useUILanguage";
import { startAutoTranslate, stopAutoTranslate } from "@/lib/autoTranslate";

// Routes that should NOT be auto-translated (kept in German for staff).
// Admin dashboard IS auto-translated so English-speaking admins/sub-admins see EN UI.
const SKIP_PREFIXES = ["/model", "/fanvue"];

const AutoTranslator = () => {
  const { lang } = useUILanguage();
  const loc = useLocation();

  useEffect(() => {
    const onSkippedRoute = SKIP_PREFIXES.some((p) => loc.pathname.startsWith(p));
    if (lang === "en" && !onSkippedRoute) {
      startAutoTranslate();
    } else {
      stopAutoTranslate();
    }
  }, [lang, loc.pathname]);

  return null;
};

export default AutoTranslator;
