import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";
import GoldenAudioPlayer from "@/components/GoldenAudioPlayer";
import { useUILanguage } from "@/hooks/useUILanguage";

export default function GewerbeDialog() {
  const { t } = useUILanguage();
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80 transition-colors underline underline-offset-2">
          <ExternalLink className="h-3.5 w-3.5" />
          {t("gewerbe.trigger")}
        </button>
      </DialogTrigger>
      <DialogContent className="glass-card border-accent/20 sm:max-w-xl max-h-[85vh] overflow-y-auto shadow-[0_0_40px_rgba(212,175,55,0.15)]">
        <DialogHeader className="pr-6">
          <DialogTitle className="text-foreground text-sm">{t("gewerbe.title")}</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {t("gewerbe.desc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">{t("gewerbe.audioLabel")}</p>
            <GoldenAudioPlayer src="/audio/gewerbe-info.mp3" />
          </div>

          <div className="space-y-2 rounded-xl bg-secondary/50 p-4 border border-border">
            <p className="text-xs font-semibold text-foreground">{t("gewerbe.textLabel")}</p>
            <p className="text-[13px] text-foreground/90 whitespace-pre-line leading-[1.7]">
              {t("gewerbe.text")}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <a
              href="https://www.gewerbeanmeldung-service.de"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {t("gewerbe.openLink1")}
            </a>
            <a
              href="https://www.gewerbeanmeldung24.de"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              {t("gewerbe.openLink2")}
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
