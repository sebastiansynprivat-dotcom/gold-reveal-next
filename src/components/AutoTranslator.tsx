import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useUILanguage } from "@/hooks/useUILanguage";
import { startAutoTranslate, stopAutoTranslate } from "@/lib/autoTranslate";

// Routes that should NOT be auto-translated (kept in German for staff).
const SKIP_PREFIXES = ["/admin", "/model", "/fanvue"];

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
