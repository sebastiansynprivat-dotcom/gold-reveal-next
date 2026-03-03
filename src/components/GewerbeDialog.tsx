import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { ExternalLink } from "lucide-react";

const GEWERBE_TEXT = `Über Gewerbeanmeldung-Service.de oder Gewerbeanmeldung24.de 🖥️ kannst du dein Gewerbe ganz einfach online anmelden.

Du gibst deine Daten ein (Name, Adresse, Startdatum) 📋 und beschreibst deine Tätigkeit.

In deinem Fall:

„Verkauf von digitalen Inhalten über Online-Plattformen, Bereitstellung von Unterhaltungs- und Informationsdiensten als selbstständiger Content-Manager sowie Angebot von exklusivem Content und persönlichem Austausch gegen Entgelt über das Internet." 💻📲

Du bekommst deinen Gewerbeschein 🎉 und das Finanzamt meldet sich automatisch 🏦.

Damit bist du offiziell angemeldet ✅`;

export default function GewerbeDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80 transition-colors underline underline-offset-2">
          <ExternalLink className="h-3.5 w-3.5" />
          Wie mache ich das?
        </button>
      </DialogTrigger>
      <DialogContent className="glass-card border-accent/20 sm:max-w-xl max-h-[85vh] overflow-y-auto shadow-[0_0_40px_rgba(212,175,55,0.15)]">
        <DialogHeader className="pr-6">
          <DialogTitle className="text-foreground text-sm">📋 Gewerbeanmeldung – So geht's</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Hier erkläre ich dir, wieso du ein Gewerbe brauchst.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Audio */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">🎧 Hier erkläre ich dir, wieso du ein Gewerbe brauchst:</p>
            <audio controls className="w-full" preload="none">
              <source src="/audio/gewerbe-info.mp3" type="audio/mpeg" />
              Dein Browser unterstützt kein Audio.
            </audio>
          </div>

          {/* Text */}
          <div className="space-y-2 rounded-xl bg-secondary/50 p-4 border border-border">
            <p className="text-xs font-semibold text-foreground">📝 So meldest du ein Gewerbe an:</p>
            <p className="text-[13px] text-foreground/90 whitespace-pre-line leading-[1.7]">
              {GEWERBE_TEXT}
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-2">
            <a
              href="https://www.gewerbeanmeldung-service.de"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Gewerbeanmeldung-Service.de öffnen
            </a>
            <a
              href="https://www.gewerbeanmeldung24.de"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Gewerbeanmeldung24.de öffnen
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
