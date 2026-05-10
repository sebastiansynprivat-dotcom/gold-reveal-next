import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Save, Check, User, Heart, Camera, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";

interface Props {
  modelId: string;
  defaultAccountName?: string;
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

const PERSONAL_FIELDS: { key: keyof ProfileRow; label: string; hint?: string }[] = [
  { key: "name", label: "Name", hint: "not your username — the one communicated to users" },
  { key: "age", label: "Age & Birthday", hint: "real or chosen" },
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
];

export default function ModelProfileForm({ modelId, defaultAccountName }: Props) {
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

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("model_profiles")
      .upsert(profile, { onConflict: "model_id" });
    setSaving(false);
    if (error) {
      toast.error("Failed to save");
      return;
    }
    setSavedAt(Date.now());
    toast.success("Profile saved");
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
          <h2 className="text-lg font-bold text-foreground">Profile</h2>
          <p className="text-sm text-muted-foreground">
            Fill out your profile — this info helps the chatters represent you authentically.
            You can use real info, fake or a mix of both.
          </p>
        </div>
      </div>

      {/* Personal Info */}
      <section className="glass-card rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-accent" />
          <h3 className="text-base font-bold text-foreground">Personal Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {PERSONAL_FIELDS.map((f) => (
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
          <h3 className="text-base font-bold text-foreground">Content Information</h3>
        </div>
        <Label className="text-xs text-muted-foreground">What content do you prefer doing?</Label>
        <Textarea
          value={profile.content_preferences ?? ""}
          onChange={(e) => set("content_preferences", e.target.value)}
          className="bg-background/50 min-h-[100px]"
          placeholder="e.g. Solo, Toys, Lingerie, …"
        />
      </section>

      {/* No Gos */}
      <section className="glass-card rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-accent" />
          <h3 className="text-base font-bold text-foreground">No Gos</h3>
        </div>
        <Label className="text-xs text-muted-foreground">
          Things you don't want to do on camera (so the chatter won't tease them).
          Examples: Anal fingering, Anal plug, Anal penetration, Squirt, Orgasm/moaning a special name, Roleplay in costumes, Extras
        </Label>
        <Textarea
          value={profile.no_gos ?? ""}
          onChange={(e) => set("no_gos", e.target.value)}
          className="bg-background/50 min-h-[120px]"
          placeholder="List your no-gos here…"
        />
      </section>

      {/* Additional info */}
      <section className="glass-card rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-accent" />
          <h3 className="text-base font-bold text-foreground">Additional Information</h3>
        </div>
        <Label className="text-xs text-muted-foreground">
          What is important for you, and what should we take care of?
        </Label>
        <Textarea
          value={profile.additional_info ?? ""}
          onChange={(e) => set("additional_info", e.target.value)}
          className="bg-background/50 min-h-[100px]"
        />
      </section>

      {/* Save Button */}
      <div className="sticky bottom-4 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-semibold shadow-[0_0_20px_-4px_hsl(var(--accent)/0.6)] hover:scale-[1.03] transition-transform"
        >
          {savedAt ? <Check className="h-4 w-4 mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? "Speichern…" : savedAt ? "Gespeichert" : "Steckbrief speichern"}
        </Button>
      </div>
    </motion.div>
  );
}
