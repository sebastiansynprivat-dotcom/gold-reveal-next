import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { User, Camera, Heart, AlertTriangle, Languages } from "lucide-react";
import { useUILanguage } from "@/hooks/useUILanguage";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modelId: string | null;
  /** Optional override. Defaults to the viewer's UI language. */
  language?: "de" | "en";
}

const SECTIONS: Record<"de" | "en", { title: string; icon: any; fields: { key: string; label: string }[] }[]> = {
  de: [
    { title: "Allgemein", icon: User, fields: [{ key: "name", label: "Name" }, { key: "age", label: "Alter & Geburtstag" }, { key: "city", label: "Stadt" }, { key: "place_of_birth", label: "Geburtsort" }, { key: "occupation", label: "Beruf" }] },
    { title: "Aussehen", icon: Camera, fields: [{ key: "height", label: "Größe" }, { key: "weight", label: "Gewicht" }, { key: "natural_hair", label: "Natürliche Haarfarbe" }, { key: "bra_size", label: "BH-Größe" }, { key: "shoe_size", label: "Schuhgröße" }, { key: "special_marks", label: "Besondere Merkmale" }] },
    { title: "Persönliches", icon: Heart, fields: [{ key: "hobbies", label: "Hobbys" }, { key: "favorite_color", label: "Lieblingsfarbe" }, { key: "favorite_movie", label: "Lieblingsfilm" }, { key: "favorite_food", label: "Lieblingsessen" }, { key: "favorite_music", label: "Lieblingsmusik" }, { key: "dream", label: "Traum" }] },
    { title: "Content", icon: AlertTriangle, fields: [{ key: "content_preferences", label: "Vorlieben" }, { key: "no_gos", label: "No-Gos" }, { key: "additional_info", label: "Zusatzinfos" }] },
  ],
  en: [
    { title: "General", icon: User, fields: [{ key: "name", label: "Name" }, { key: "age", label: "Age & birthday" }, { key: "city", label: "City" }, { key: "place_of_birth", label: "Place of birth" }, { key: "occupation", label: "Occupation" }] },
    { title: "Appearance", icon: Camera, fields: [{ key: "height", label: "Height" }, { key: "weight", label: "Weight" }, { key: "natural_hair", label: "Natural hair color" }, { key: "bra_size", label: "Bra size" }, { key: "shoe_size", label: "Shoe size" }, { key: "special_marks", label: "Special marks" }] },
    { title: "Personal", icon: Heart, fields: [{ key: "hobbies", label: "Hobbies" }, { key: "favorite_color", label: "Favorite color" }, { key: "favorite_movie", label: "Favorite movie" }, { key: "favorite_food", label: "Favorite food" }, { key: "favorite_music", label: "Favorite music" }, { key: "dream", label: "Dream" }] },
    { title: "Content", icon: AlertTriangle, fields: [{ key: "content_preferences", label: "Preferences" }, { key: "no_gos", label: "No-gos" }, { key: "additional_info", label: "Additional info" }] },
  ],
};

const COPY = {
  de: {
    title: "Steckbrief deines Models",
    description: "Alle wichtigen Infos auf einen Blick.",
    empty: "Dein Model hat den Steckbrief noch nicht ausgefüllt.",
    pending: "Der Steckbrief deines Models wird gerade geprüft. Sobald er freigegeben ist, siehst du hier alle Details.",
    translated: "Automatisch aus dem Englischen übersetzt",
    translating: "Übersetze…",
  },
  en: {
    title: "Your model's profile",
    description: "All important details at a glance.",
    empty: "Your model has not filled out the profile yet.",
    pending: "Your model's profile is currently being reviewed. Once approved, you will see all details here.",
    translated: "Automatically translated from German",
    translating: "Translating…",
  },
};

const TRANSLATABLE_KEYS = [
  "city", "place_of_birth", "occupation",
  "natural_hair", "special_marks",
  "hobbies", "favorite_color", "favorite_movie", "favorite_food", "favorite_music", "dream",
  "content_preferences", "no_gos", "additional_info",
] as const;

export default function ModelProfileViewDialog({ open, onOpenChange, modelId, language }: Props) {
  const { lang: uiLang } = useUILanguage();
  const lang: "de" | "en" = language ?? (uiLang === "en" ? "en" : "de");
  const sections = SECTIONS[lang];
  const copy = COPY[lang];
  const [rawProfile, setRawProfile] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translated, setTranslated] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (!open || !modelId) return;
    setLoading(true);
    setTranslated(null);
    supabase
      .from("model_profiles")
      .select("*")
      .eq("model_id", modelId)
      .maybeSingle()
      .then(({ data }) => {
        setRawProfile(data);
        setLoading(false);
      });
  }, [open, modelId]);

  // Chatters only ever see the approved snapshot. Live edits stay hidden until admin re-approves.
  const profile: Record<string, any> | null = useMemo(() => {
    if (!rawProfile) return null;
    const snap = (rawProfile as any).approved_snapshot;
    if (snap && typeof snap === "object") return snap as Record<string, any>;
    // Backwards-compat: legacy rows without snapshot but already confirmed
    if ((rawProfile as any).confirmed_at) return rawProfile;
    return null;
  }, [rawProfile]);

  const sourceLang: "de" | "en" = useMemo(() => {
    const s = String((profile as any)?.source_language || "de").toLowerCase();
    return s === "en" ? "en" : "de";
  }, [profile]);

  const needsTranslation = !!profile && sourceLang !== lang;

  useEffect(() => {
    if (!profile || !needsTranslation) {
      setTranslated(null);
      return;
    }
    let cancelled = false;
    const keys = TRANSLATABLE_KEYS.filter((k) => {
      const v = (profile as any)[k];
      return typeof v === "string" && v.trim().length > 0;
    });
    if (keys.length === 0) return;
    const strings = keys.map((k) => String((profile as any)[k]));
    setTranslating(true);
    supabase.functions
      .invoke("translate-batch", {
        body: { strings, sourceLang, targetLang: lang },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data?.translations) {
          setTranslated(null);
        } else {
          const map: Record<string, string> = {};
          keys.forEach((k, i) => { map[k] = data.translations[i] ?? String((profile as any)[k]); });
          setTranslated(map);
        }
        setTranslating(false);
      })
      .catch(() => {
        if (!cancelled) {
          setTranslated(null);
          setTranslating(false);
        }
      });
    return () => { cancelled = true; };
  }, [profile, needsTranslation, sourceLang, lang]);

  const isEmpty = profile && sections.every((s) => s.fields.every((f) => !profile[f.key]));
  const isPending = !!profile && !isEmpty && !profile?.confirmed_at;

  const getValue = (key: string): string => {
    const raw = (profile as any)?.[key];
    if (typeof raw !== "string") return raw ?? "";
    if (translated && key in translated) return translated[key];
    return raw;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !profile || isEmpty ? (
          <div className="rounded-lg border border-border/40 bg-secondary/20 p-6 text-center text-sm text-muted-foreground">
            {copy.empty}
          </div>
        ) : isPending ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-6 text-center text-sm text-amber-400/90">
            {copy.pending}
          </div>
        ) : (
          <div className="space-y-5">
            {needsTranslation && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/30 rounded-md px-3 py-1.5 border border-border/40">
                <Languages className="h-3.5 w-3.5 text-accent" />
                <span>{translating ? copy.translating : copy.translated}</span>
              </div>
            )}
            {sections.map(({ title, icon: Icon, fields }) => {
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
                        <dd className="text-sm text-foreground whitespace-pre-wrap break-words">{getValue(f.key)}</dd>
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
