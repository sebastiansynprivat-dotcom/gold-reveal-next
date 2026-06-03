import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useUILanguage } from "@/hooks/useUILanguage";
import { startAutoTranslate, stopAutoTranslate } from "@/lib/autoTranslate";

// Model and Fanvue dashboards have their own explicit language handling.
const SKIP_PREFIXES = ["/model", "/fanvue", "/socialmedia"];

const AutoTranslator = () => {
  const { lang } = useUILanguage();
  const loc = useLocation();

  useEffect(() => {
    const onSkippedRoute = SKIP_PREFIXES.some((p) => loc.pathname === p || loc.pathname.startsWith(p + "/"));
    if (lang === "en" && !onSkippedRoute) {
      startAutoTranslate();
    } else {
      stopAutoTranslate();
    }
  }, [lang, loc.pathname]);

  return null;
};

export default AutoTranslator;
