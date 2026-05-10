import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { User, Camera, Heart, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modelId: string | null;
}

const SECTIONS: { title: string; icon: any; fields: { key: string; label: string }[] }[] = [
  {
    title: "Allgemein",
    icon: User,
    fields: [
      { key: "name", label: "Name" },
      { key: "age", label: "Alter & Geburtstag" },
      { key: "city", label: "Stadt" },
      { key: "place_of_birth", label: "Geburtsort" },
      { key: "occupation", label: "Beruf" },
      { key: "work", label: "Arbeit" },
      { key: "education", label: "Ausbildung" },
      { key: "languages", label: "Sprachen" },
    ],
  },
  {
    title: "Aussehen",
    icon: Camera,
    fields: [
      { key: "height", label: "Größe" },
      { key: "weight", label: "Gewicht" },
      { key: "natural_hair", label: "Natürliche Haarfarbe" },
      { key: "bra_size", label: "BH-Größe" },
      { key: "shoe_size", label: "Schuhgröße" },
      { key: "special_marks", label: "Besondere Merkmale" },
    ],
  },
  {
    title: "Persönliches",
    icon: Heart,
    fields: [
      { key: "hobbies", label: "Hobbys" },
      { key: "favorite_color", label: "Lieblingsfarbe" },
      { key: "favorite_movie", label: "Lieblingsfilm" },
      { key: "favorite_food", label: "Lieblingsessen" },
      { key: "favorite_music", label: "Lieblingsmusik" },
      { key: "dream", label: "Traum" },
    ],
  },
  {
    title: "Content",
    icon: AlertTriangle,
    fields: [
      { key: "content_preferences", label: "Vorlieben" },
      { key: "no_gos", label: "No-Gos" },
      { key: "additional_info", label: "Zusatzinfos" },
    ],
  },
];

export default function ModelProfileViewDialog({ open, onOpenChange, modelId }: Props) {
  const [profile, setProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !modelId) return;
    setLoading(true);
    supabase
      .from("model_profiles")
      .select("*")
      .eq("model_id", modelId)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data);
        setLoading(false);
      });
  }, [open, modelId]);

  const isEmpty = profile && SECTIONS.every((s) => s.fields.every((f) => !profile[f.key]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Steckbrief deines Models</DialogTitle>
          <DialogDescription>Alle wichtigen Infos auf einen Blick.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !profile || isEmpty ? (
          <div className="rounded-lg border border-border/40 bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
            Dein Model hat den Steckbrief noch nicht ausgefüllt.
          </div>
        ) : (
          <div className="space-y-5">
            {SECTIONS.map(({ title, icon: Icon, fields }) => {
              const filled = fields.filter((f) => profile[f.key]);
              if (filled.length === 0) return null;
              return (
                <div key={title} className="rounded-lg border border-border/40 bg-secondary/20 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4 text-accent" />
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
                    {filled.map((f) => (
                      <div key={f.key}>
                        <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                        <dd className="text-sm text-foreground whitespace-pre-wrap break-words">{profile[f.key]}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
