import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Check, User, Camera, AlertTriangle, Info, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

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
  special_marks: string | null;
  natural_hair: string | null;
  shoe_size: string | null;
  bra_size: string | null;
  height: string | null;
  weight: string | null;
  content_preferences: string | null;
  no_gos: string | null;
  personality: string | null;
  additional_info: string | null;
  content_audios_for_chat: boolean | null;
  content_video_speaking: boolean | null;
  content_dick_ratings: boolean | null;
  content_joi: boolean | null;
  content_anal_fingering: boolean | null;
  content_anal_plug: boolean | null;
  content_anal_penetration: boolean | null;
  content_squirting: boolean | null;
  content_orgasm: boolean | null;
  content_moaning_name: boolean | null;
  content_roleplay_costumes: boolean | null;
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
    personality: "Eigenschaften / Persönlichkeit",
    personalityLabel: "Wie würdest du dich als Person beschreiben? (Charakter, Eigenschaften, Vibe)",
    personalityPlaceholder: "z. B. verspielt, dominant, neugierig, humorvoll, romantisch, frech, einfühlsam …",
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
    confirmedTitle: "Steckbrief ist freigegeben",
    confirmedBody: "Du kannst jederzeit Änderungen vornehmen. Nach dem Speichern prüft das Team die neue Version und gibt sie erneut frei. Bis dahin sehen die Chatter weiterhin den aktuell freigegebenen Stand.",
    pendingTitle: "Neue Version wartet auf Freigabe",
    pendingBody: "Deine Änderungen werden gerade geprüft. Sobald freigegeben, sehen die Chatter die neue Version.",
    saveChange: "Änderungen einreichen",
    changeSubmitted: "Änderungen eingereicht — das Team prüft sie.",
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
    personality: "Traits / Personality",
    personalityLabel: "How would you describe yourself as a person? (character, traits, vibe)",
    personalityPlaceholder: "e.g. playful, dominant, curious, witty, romantic, cheeky, empathic …",
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
    confirmedTitle: "Profile approved",
    confirmedBody: "You can edit anytime. After saving, the team reviews the new version and approves it again. Until then, chatters keep seeing the currently approved version.",
    pendingTitle: "New version awaiting approval",
    pendingBody: "Your changes are being reviewed. Once approved, chatters will see the new version.",
    saveChange: "Submit changes",
    changeSubmitted: "Changes submitted — the team will review.",
    emptyValue: "—",
  },
};

export default function ModelProfileForm({ modelId, defaultAccountName, isInitialSubmission = false, onSubmitted, language = "de", autoSubmitOnSave = false, lockedReason: _lockedReason, modelName: _modelName }: Props) {
  const lang = language === "en" ? "en" : "de";
  const copy = COPY[lang];
  const empty: ProfileRow = {
    model_id: modelId,
    account_name: defaultAccountName ?? "",
    name: "", age: "", city: "", place_of_birth: "",
    favorite_color: "", favorite_movie: "", favorite_food: "", favorite_music: "",
    occupation: "", hobbies: "", dream: "",
    special_marks: "", natural_hair: "", shoe_size: "", bra_size: "", height: "", weight: "",
    content_preferences: "", no_gos: "", personality: "", additional_info: "",
    content_audios_for_chat: null, content_video_speaking: null, content_dick_ratings: null, content_joi: null,
    content_anal_fingering: null, content_anal_plug: null, content_anal_penetration: null,
    content_squirting: null, content_orgasm: null, content_moaning_name: null, content_roleplay_costumes: null,
  };
  const [profile, setProfile] = useState<ProfileRow>(empty);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [lastChangeAt, setLastChangeAt] = useState<string | null>(null);
  const [hasApprovedSnapshot, setHasApprovedSnapshot] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [modelLanguage, setModelLanguage] = useState<string>("de");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data }, { data: mdl }] = await Promise.all([
        supabase.from("model_profiles").select("*").eq("model_id", modelId).maybeSingle(),
        (supabase.from("models") as any).select("model_language").eq("id", modelId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (data) {
        setProfile({ ...empty, ...data } as ProfileRow);
        setConfirmedAt((data as any).confirmed_at || null);
        setLastChangeAt((data as any).last_change_at || null);
        setHasApprovedSnapshot(!!(data as any).approved_snapshot);
      }
      setModelLanguage(String((mdl as any)?.model_language || "de").toLowerCase());
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [modelId]);

  const set = (key: keyof ProfileRow, value: string | boolean | null) =>
    setProfile((p) => ({ ...p, [key]: value as any }));

  const requiredMissing = isInitialSubmission && (
    !(profile.name || "").trim() ||
    !(profile.age || "").trim() ||
    !(profile.city || "").trim()
  );

  const incompleteFields = (() => {
    const missing: string[] = [];
    for (const f of PERSONAL_FIELDS[lang]) {
      if (!String(profile[f.key] || "").trim()) missing.push(f.label);
    }
    if (!String(profile.content_preferences || "").trim()) {
      missing.push(lang === "en" ? "Content preferences" : "Content-Präferenzen");
    }
    return missing;
  })();

  // States: approved (confirmed & no newer change) / pending (newer change since approval) / draft / empty
  const pendingReapproval =
    hasApprovedSnapshot &&
    (!confirmedAt || (lastChangeAt && confirmedAt && new Date(lastChangeAt) > new Date(confirmedAt)));
  const isApproved = !!confirmedAt && !pendingReapproval;

  const handleSave = async (submit = false) => {
    setSaving(true);
    const nowIso = new Date().toISOString();
    const payload: any = {
      ...profile,
      source_language: lang,
      last_change_at: nowIso,
    };
    if (submit || autoSubmitOnSave) {
      payload.submitted_at = (profile as any).submitted_at || nowIso;
    }
    // If model edits an already-approved profile, clear confirmation so admin re-approves
    if (!autoSubmitOnSave && (confirmedAt || hasApprovedSnapshot)) {
      payload.confirmed_at = null;
      payload.confirmed_by = null;
      if (!payload.submitted_at) payload.submitted_at = nowIso;
    }
    const { error } = await supabase
      .from("model_profiles")
      .upsert(payload, { onConflict: "model_id" });
    setSaving(false);
    if (error) {
      toast.error(copy.saveError);
      return;
    }
    if (payload.confirmed_at === null) setConfirmedAt(null);
    setLastChangeAt(nowIso);
    setSavedAt(Date.now());
    if (submit) {
      toast.success(copy.submittedToast);
      onSubmitted?.();
    } else if (hasApprovedSnapshot && !autoSubmitOnSave) {
      toast.success(copy.changeSubmitted);
      onSubmitted?.();
    } else {
      toast.success(copy.savedToast);
      if (autoSubmitOnSave) onSubmitted?.();
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
          <p className="text-sm text-muted-foreground">{copy.intro}</p>
        </div>
      </div>

      {/* Approval status banner */}
      {isApproved && (
        <div className="glass-card rounded-xl p-4 border-l-2 border-emerald-500/60 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{copy.confirmedTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{copy.confirmedBody}</p>
          </div>
        </div>
      )}
      {pendingReapproval && (
        <div className="glass-card rounded-xl p-4 border-l-2 border-amber-400/60 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Lock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">{copy.pendingTitle}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{copy.pendingBody}</p>
          </div>
        </div>
      )}

      {/* Incomplete profile hint */}
      {incompleteFields.length > 0 && !isApproved && !pendingReapproval && (
        <div className="glass-card rounded-xl p-4 border-l-2 border-amber-400/70 flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {lang === "en"
                ? `${incompleteFields.length} field${incompleteFields.length === 1 ? "" : "s"} still empty`
                : `${incompleteFields.length} ${incompleteFields.length === 1 ? "Angabe fehlt" : "Angaben fehlen"} noch`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {lang === "en"
                ? "Please complete your profile — the more details we have, the more authentic and personal the chatters can write for you, which directly improves your results."
                : "Bitte ergänze deinen Steckbrief — je mehr Details wir haben, desto authentischer und persönlicher können die Chatter für dich schreiben. Das sorgt direkt für bessere Ergebnisse."}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {incompleteFields.slice(0, 8).map((label) => (
                <span
                  key={label}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-200 border border-amber-400/30"
                >
                  {label}
                </span>
              ))}
              {incompleteFields.length > 8 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-200/80 border border-amber-400/30">
                  +{incompleteFields.length - 8}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

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
              <AutoTextarea
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
        <AutoTextarea
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
        <Label className="text-xs text-muted-foreground">{copy.noGosLabel}</Label>
        <AutoTextarea
          value={profile.no_gos ?? ""}
          onChange={(e) => set("no_gos", e.target.value)}
          className="bg-background/50 min-h-[120px]"
          placeholder={copy.noGosPlaceholder}
        />
      </section>

      {/* Personality / Traits */}
      <section className="glass-card rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h3 className="text-base font-bold text-foreground">{copy.personality}</h3>
        </div>
        <Label className="text-xs text-muted-foreground">{copy.personalityLabel}</Label>
        <AutoTextarea
          value={profile.personality ?? ""}
          onChange={(e) => set("personality", e.target.value)}
          className="bg-background/50 min-h-[100px]"
          placeholder={copy.personalityPlaceholder}
        />
      </section>

      {/* Shooting preferences */}
      <section className="glass-card rounded-xl p-5 space-y-4 border-l-2 border-accent/40">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
            <Camera className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-foreground">
              {modelLanguage === "en" ? "Shooting Preferences" : "Shooting-Präferenzen"}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {modelLanguage === "en"
                ? "Which content is an option for you?"
                : "Welcher Content kommt für dich in Frage?"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {((modelLanguage === "en"
            ? [
                { key: "content_anal_fingering", label: "Anal fingering" },
                { key: "content_anal_plug", label: "Anal plug" },
                { key: "content_anal_penetration", label: "Anal penetration" },
                { key: "content_squirting", label: "Squirting" },
                { key: "content_orgasm", label: "Orgasm" },
                { key: "content_moaning_name", label: "Moaning a specific name" },
                { key: "content_roleplay_costumes", label: "Roleplay in costumes" },
              ]
            : [
                { key: "content_anal_fingering", label: "Anales Fingern" },
                { key: "content_anal_plug", label: "Analplug" },
                { key: "content_anal_penetration", label: "Anale Penetration" },
                { key: "content_squirting", label: "Squirten" },
                { key: "content_orgasm", label: "Orgasmus" },
                { key: "content_moaning_name", label: "Stöhnen eines besonderen Namens" },
                { key: "content_roleplay_costumes", label: "Rollenspiele in Kostümen" },
                { key: "content_audios_for_chat", label: "Audios für den Chat aufnehmen" },
                { key: "content_video_speaking", label: "Im Video sprechen" },
                { key: "content_dick_ratings", label: "Dickratings" },
                { key: "content_joi", label: "Jerk Off Instructions (JOI / Wichsanleitung)" },
              ]) as { key: keyof ProfileRow; label: string }[]).map((opt) => {
            const v = profile[opt.key] as boolean | null;
            const isYes = v === true;
            const isNo = v === false;
            const yesLabel = modelLanguage === "en" ? "Yes" : "Ja";
            const noLabel = modelLanguage === "en" ? "No" : "Nein";
            return (
              <div
                key={opt.key}
                className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2.5"
              >
                <span className="text-sm text-foreground flex-1 min-w-0">{opt.label}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => set(opt.key, true)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border transition ${
                      isYes
                        ? "bg-emerald-500/20 border-emerald-400/60 text-emerald-300"
                        : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {yesLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => set(opt.key, false)}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border transition ${
                      isNo
                        ? "bg-rose-500/20 border-rose-400/60 text-rose-300"
                        : "bg-transparent border-border/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {noLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>



      {/* Additional info */}
      <section className="glass-card rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-accent" />
          <h3 className="text-base font-bold text-foreground">{copy.additional}</h3>
        </div>
        <Label className="text-xs text-muted-foreground">{copy.additionalLabel}</Label>
        <AutoTextarea
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
            {saving ? copy.saving : savedAt ? copy.saved : (hasApprovedSnapshot && !autoSubmitOnSave ? copy.saveChange : copy.save)}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
