import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Check, User, Camera, AlertTriangle, Info, Lock, Send, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface Props {
  modelId: string;
  defaultAccountName?: string;
  /** When true, this is the mandatory first submission flow (shows "Absenden"). */
  isInitialSubmission?: boolean;
  /** Called after a successful initial submission. */
  onSubmitted?: () => void;
  language?: "de" | "en";
  /** When true, every save also writes `submitted_at` (used by Admin who edits on the model's behalf). */
  autoSubmitOnSave?: boolean;
  /** If set, the form is read-only and a "Request change" CTA is shown instead of save buttons. */
  lockedReason?: string | null;
  /** Required for "Änderung anfragen" — inserts a row in model_requests. */
  modelName?: string;
}

type ProfileRow = {
  id?: string;
  model_id: string;
  account_name: string | null;
  name: string | null;
  age: string | null;
  city: string | null;
  place_of_birth: string | null;
  favorite_color: string | null;
  favorite_movie: string | null;
  favorite_food: string | null;
  favorite_music: string | null;
  occupation: string | null;
  hobbies: string | null;
  dream: string | null;
  work: string | null;
  education: string | null;
  languages: string | null;
  special_marks: string | null;
  natural_hair: string | null;
  shoe_size: string | null;
  bra_size: string | null;
  height: string | null;
  weight: string | null;
  content_preferences: string | null;
  no_gos: string | null;
  additional_info: string | null;
};

const PERSONAL_FIELDS: Record<"de" | "en", { key: keyof ProfileRow; label: string; hint?: string }[]> = {
  de: [
    { key: "name", label: "Name", hint: "nicht dein Username — der Name, der Fans kommuniziert wird" },
    { key: "age", label: "Alter & Geburtstag", hint: "echt, erfunden oder gemischt" },
    { key: "city", label: "Stadt", hint: "Berlin, München, Hamburg, …" },
    { key: "place_of_birth", label: "Geburtsort", hint: "Stadt + Land" },
    { key: "favorite_color", label: "Lieblingsfarbe" },
    { key: "favorite_movie", label: "Lieblingsfilm" },
    { key: "favorite_food", label: "Lieblingsessen" },
    { key: "favorite_music", label: "Lieblingsmusik" },
    { key: "occupation", label: "Beruf" },
    { key: "hobbies", label: "Hobbys" },
    { key: "dream", label: "Traum" },
    { key: "work", label: "Arbeit" },
    { key: "education", label: "Ausbildung" },
    { key: "languages", label: "Sprachen" },
    { key: "special_marks", label: "Besondere Merkmale" },
    { key: "natural_hair", label: "Natürliche Haarfarbe" },
    { key: "shoe_size", label: "Schuhgröße" },
    { key: "bra_size", label: "BH-Größe" },
    { key: "height", label: "Größe" },
    { key: "weight", label: "Gewicht" },
  ],
  en: [
    { key: "name", label: "Name", hint: "not your username — the name shown to fans" },
    { key: "age", label: "Age & birthday", hint: "real, fictional, or mixed" },
    { key: "city", label: "City", hint: "Berlin, Munich, Hamburg, …" },
    { key: "place_of_birth", label: "Place of birth", hint: "city + country" },
    { key: "favorite_color", label: "Favorite color" },
    { key: "favorite_movie", label: "Favorite movie" },
    { key: "favorite_food", label: "Favorite food" },
    { key: "favorite_music", label: "Favorite music" },
    { key: "occupation", label: "Occupation" },
    { key: "hobbies", label: "Hobbies" },
    { key: "dream", label: "Dream" },
    { key: "work", label: "Work" },
    { key: "education", label: "Education" },
    { key: "languages", label: "Languages" },
    { key: "special_marks", label: "Special marks" },
    { key: "natural_hair", label: "Natural hair" },
    { key: "shoe_size", label: "Shoe size" },
    { key: "bra_size", label: "Bra size" },
    { key: "height", label: "Height" },
    { key: "weight", label: "Weight" },
  ],
};

const COPY = {
  de: {
    title: "Steckbrief",
    intro: "Fülle deinen Steckbrief aus — diese Infos helfen den Chattern, dich authentisch zu vertreten. Du kannst echte Infos, erfundene Infos oder eine Mischung nutzen.",
    personal: "Persönliche Informationen",
    content: "Content-Informationen",
    contentLabel: "Welchen Content machst du am liebsten?",
    contentPlaceholder: "z. B. Solo, Toys, Lingerie, …",
    noGosLabel: "Dinge, die du nicht vor der Kamera machen möchtest und die der Chatter nicht anteasern soll.",
    noGosPlaceholder: "Trage deine No-Gos hier ein…",
    additional: "Zusätzliche Informationen",
    additionalLabel: "Was ist dir wichtig und worauf sollen wir achten?",
    saveDraft: "Zwischenspeichern",
    submit: "Steckbrief absenden",
    submitting: "Sende…",
    save: "Speichern",
    saving: "Speichere…",
    saved: "Gespeichert",
    missingTitle: "Bitte mindestens Name, Alter und Stadt ausfüllen",
    saveError: "Speichern fehlgeschlagen",
    submittedToast: "Steckbrief abgesendet ✅",
    savedToast: "Gespeichert",
    lockedTitle: "Steckbrief ist bestätigt",
    lockedBody: "Dein Steckbrief wurde vom Team freigegeben und ist gesperrt. Falls du etwas ändern möchtest, kannst du hier eine Anfrage an dein Team senden.",
    requestChange: "Änderung anfragen",
    requestDialogTitle: "Was möchtest du ändern?",
    requestDialogDesc: "Beschreibe kurz, was im Steckbrief angepasst werden soll. Das Team prüft die Anfrage und entsperrt den Steckbrief.",
    requestPlaceholder: "z. B. Stadt von Berlin auf München ändern",
    requestSubmit: "Anfrage senden",
    requestSending: "Sende…",
    requestSent: "Anfrage gesendet — das Team meldet sich.",
    requestError: "Anfrage konnte nicht gesendet werden",
    emptyValue: "—",
  },
  en: {
    title: "Profile",
    intro: "Fill out your profile — this info helps the chatters represent you authentically. You can use real details, fictional details, or a mix of both.",
    personal: "Personal information",
    content: "Content information",
    contentLabel: "What content do you prefer doing?",
    contentPlaceholder: "e.g. Solo, Toys, Lingerie, …",
    noGosLabel: "Things you don't want to do on camera and that chatters should not tease.",
    noGosPlaceholder: "List your no-gos here…",
    additional: "Additional information",
    additionalLabel: "What is important to you, and what should we take care of?",
    saveDraft: "Save draft",
    submit: "Submit profile",
    submitting: "Submitting…",
    save: "Save",
    saving: "Saving…",
    saved: "Saved",
    missingTitle: "Please fill out at least name, age, and city",
    saveError: "Saving failed",
    submittedToast: "Profile submitted ✅",
    savedToast: "Saved",
    lockedTitle: "Profile is confirmed",
    lockedBody: "Your profile has been approved by the team and is locked. If you want to change something, send a request to your team here.",
    requestChange: "Request change",
    requestDialogTitle: "What would you like to change?",
    requestDialogDesc: "Briefly describe the change. The team will review and unlock the profile.",
    requestPlaceholder: "e.g. change city from Berlin to Munich",
    requestSubmit: "Send request",
    requestSending: "Sending…",
    requestSent: "Request sent — the team will get back to you.",
    requestError: "Could not send request",
    emptyValue: "—",
  },
};

export default function ModelProfileForm({ modelId, defaultAccountName, isInitialSubmission = false, onSubmitted, language = "de" }: Props) {
  const lang = language === "en" ? "en" : "de";
  const copy = COPY[lang];
  const empty: ProfileRow = {
    model_id: modelId,
    account_name: defaultAccountName ?? "",
    name: "", age: "", city: "", place_of_birth: "",
    favorite_color: "", favorite_movie: "", favorite_food: "", favorite_music: "",
    occupation: "", hobbies: "", dream: "", work: "", education: "", languages: "",
    special_marks: "", natural_hair: "", shoe_size: "", bra_size: "", height: "", weight: "",
    content_preferences: "", no_gos: "", additional_info: "",
  };
  const [profile, setProfile] = useState<ProfileRow>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("model_profiles")
        .select("*")
        .eq("model_id", modelId)
        .maybeSingle();
      if (cancelled) return;
      if (data) setProfile({ ...empty, ...data } as ProfileRow);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [modelId]);

  const set = (key: keyof ProfileRow, value: string) =>
    setProfile((p) => ({ ...p, [key]: value }));

  const requiredMissing = isInitialSubmission && (
    !(profile.name || "").trim() ||
    !(profile.age || "").trim() ||
    !(profile.city || "").trim()
  );

  const handleSave = async (submit = false) => {
    setSaving(true);
    const payload: any = { ...profile };
    if (submit) payload.submitted_at = new Date().toISOString();
    const { error } = await supabase
      .from("model_profiles")
      .upsert(payload, { onConflict: "model_id" });
    setSaving(false);
    if (error) {
      toast.error(copy.saveError);
      return;
    }
    setSavedAt(Date.now());
    if (submit) {
      toast.success(copy.submittedToast);
      onSubmitted?.();
    } else {
      toast.success(copy.savedToast);
    }
    setTimeout(() => setSavedAt(null), 2500);
  };

  if (loading) {
    return (
      <div className="glass-card rounded-xl p-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-5"
    >
      {/* Header */}
      <div className="glass-card rounded-xl p-5 flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <User className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-foreground">{copy.title}</h2>
          <p className="text-sm text-muted-foreground">
            {copy.intro}
          </p>
        </div>
      </div>

      {/* Personal Info */}
      <section className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-accent" />
          <h3 className="text-base font-bold text-foreground">{copy.personal}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PERSONAL_FIELDS[lang].map((f) => (
            <div key={f.key as string} className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">{f.label}</Label>
              <Input
                value={(profile[f.key] as string) ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                className="bg-background/50"
              />
              {f.hint && <p className="text-[10px] text-muted-foreground">{f.hint}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Content Information */}
      <section className="glass-card rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Camera className="h-4 w-4 text-accent" />
          <h3 className="text-base font-bold text-foreground">{copy.content}</h3>
        </div>
        <Label className="text-xs text-muted-foreground">{copy.contentLabel}</Label>
        <Textarea
          value={profile.content_preferences ?? ""}
          onChange={(e) => set("content_preferences", e.target.value)}
          className="bg-background/50 min-h-[100px]"
          placeholder={copy.contentPlaceholder}
        />
      </section>

      {/* No Gos */}
      <section className="glass-card rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-accent" />
          <h3 className="text-base font-bold text-foreground">No Gos</h3>
        </div>
        <Label className="text-xs text-muted-foreground">
          {copy.noGosLabel}
        </Label>
        <Textarea
          value={profile.no_gos ?? ""}
          onChange={(e) => set("no_gos", e.target.value)}
          className="bg-background/50 min-h-[120px]"
          placeholder={copy.noGosPlaceholder}
        />
      </section>

      {/* Additional info */}
      <section className="glass-card rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-accent" />
          <h3 className="text-base font-bold text-foreground">{copy.additional}</h3>
        </div>
        <Label className="text-xs text-muted-foreground">
          {copy.additionalLabel}
        </Label>
        <Textarea
          value={profile.additional_info ?? ""}
          onChange={(e) => set("additional_info", e.target.value)}
          className="bg-background/50 min-h-[100px]"
        />
      </section>

      {/* Save / Submit */}
      <div className="sticky bottom-4 flex flex-col sm:flex-row gap-2 sm:justify-end">
        {isInitialSubmission ? (
          <>
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
              size="lg"
              className="border-accent/30 text-accent hover:bg-accent/10"
            >
              <Save className="h-4 w-4 mr-2" />
              {copy.saveDraft}
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving || requiredMissing}
              size="lg"
              className="bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-semibold shadow-[0_0_20px_-4px_hsl(var(--accent)/0.6)] hover:scale-[1.03] transition-transform"
              title={requiredMissing ? copy.missingTitle : ""}
            >
              <Check className="h-4 w-4 mr-2" />
              {saving ? copy.submitting : copy.submit}
            </Button>
          </>
        ) : (
          <Button
            onClick={() => handleSave(false)}
            disabled={saving}
            size="lg"
            className="bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-semibold shadow-[0_0_20px_-4px_hsl(var(--accent)/0.6)] hover:scale-[1.03] transition-transform"
          >
            {savedAt ? <Check className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? copy.saving : savedAt ? copy.saved : copy.save}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
