import { useUILanguage } from "@/hooks/useUILanguage";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
}

export default function LanguageToggle({ className }: LanguageToggleProps) {
  const { lang, setLang, t } = useUILanguage();

  return (
    <div
      role="group"
      aria-label={t("header.language.tooltip")}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-secondary/60 p-0.5 text-[10px] font-semibold uppercase tracking-wide",
        className
      )}
    >
      {(["de", "en"] as const).map((code) => {
        const active = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={active}
            className={cn(
              "px-2.5 py-1 rounded-full transition-all",
              active
                ? "bg-accent/20 text-accent shadow-[0_0_8px_hsl(var(--accent)/0.3)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {code}
          </button>
        );
      })}
    </div>
  );
}
