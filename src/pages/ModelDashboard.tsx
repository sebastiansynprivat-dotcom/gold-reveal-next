import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";
import ModelProfileForm from "@/components/ModelProfileForm";
import ModelHomeDashboard from "@/components/ModelHomeDashboard";
import { useAppPresence } from "@/hooks/useAppPresence";
import PushNotificationDialog from "@/components/PushNotificationDialog";
import NotificationBanner from "@/components/NotificationBanner";

export default function ModelDashboard() {
  useAppPresence("model");
  const { user, signOut } = useAuth();
  const [accountName, setAccountName] = useState("");
  const [modelId, setModelId] = useState<string | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelUsername, setModelUsername] = useState<string | null>(null);
  const [modelLanguage, setModelLanguage] = useState<"de" | "en">(
    typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("en") ? "en" : "de"
  );
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [profileFilled, setProfileFilled] = useState(0);
  const [profileTotal, setProfileTotal] = useState(20);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);

  // All text fields shown to the model in the profile form
  const PROFILE_FIELDS = [
    "name", "age", "city", "place_of_birth",
    "favorite_color", "favorite_movie", "favorite_food", "favorite_music",
    "occupation", "hobbies", "dream", "special_marks",
    "natural_hair", "shoe_size", "bra_size", "height", "weight",
    "content_preferences", "no_gos", "personality", "additional_info",
  ] as const;

  // Shooting preference booleans — German models see all 11, English models only 7
  const SHOOTING_FIELDS_UNIVERSAL = [
    "content_anal_fingering", "content_anal_plug", "content_anal_penetration",
    "content_squirting", "content_orgasm", "content_moaning_name", "content_roleplay_costumes",
  ] as const;
  const SHOOTING_FIELDS_DE_ONLY = [
    "content_audios_for_chat", "content_video_speaking", "content_dick_ratings", "content_joi",
  ] as const;

  const loadProfileMeta = useCallback(async (mid: string, lang: "de" | "en") => {
    const { data } = await (supabase.from("model_profiles") as any)
      .select("*")
      .eq("model_id", mid)
      .maybeSingle();
    setSubmittedAt(data?.submitted_at || null);
    setConfirmedAt(data?.confirmed_at || null);
    let filled = 0;
    const shootingFields = lang === "en"
      ? SHOOTING_FIELDS_UNIVERSAL
      : [...SHOOTING_FIELDS_UNIVERSAL, ...SHOOTING_FIELDS_DE_ONLY];
    const total = PROFILE_FIELDS.length + shootingFields.length;
    if (data) {
      for (const k of PROFILE_FIELDS) {
        if (String((data as any)[k] || "").trim()) filled++;
      }
      for (const k of shootingFields) {
        if ((data as any)[k] === true || (data as any)[k] === false) filled++;
      }
    }
    setProfileFilled(filled);
    setProfileTotal(total);
  }, []);


  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: mu } = await supabase
        .from("model_users")
        .select("account_id, model_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mu) { setLoading(false); return; }

      let resolvedModelId = (mu as any).model_id as string | null;

      if (mu.account_id) {
        const { data: acc } = await supabase
          .from("accounts")
          .select("account_email, account_domain, model_id")
          .eq("id", mu.account_id)
          .maybeSingle();

        if (acc) {
          setAccountName(acc.account_email || acc.account_domain || "");
          if (!resolvedModelId) resolvedModelId = (acc as any).model_id ?? null;
        }
      }

      if (resolvedModelId) {
        const { data: model } = await (supabase.from("models") as any)
          .select("name, username, model_agency")
          .eq("id", resolvedModelId)
          .maybeSingle();
        let resolvedLang: "de" | "en" = modelLanguage;
        if (model) {
          setModelName(model.name || "");
          setModelUsername(model.username || null);
          // SYN agency = international models → force English UI
          if (String((model as any).model_agency || "").toLowerCase() === "syn") {
            resolvedLang = "en";
            setModelLanguage("en");
          }
        }
        await loadProfileMeta(resolvedModelId, resolvedLang);
      }

      setModelId(resolvedModelId);
      setLoading(false);
    };
    load();
  }, [user, loadProfileMeta]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Field-based progress (covers manual + admin-imported data automatically).
  const profileComplete = profileFilled >= profileTotal;
  // Show "fill out" form on first entry only if the profile is essentially empty.
  const needsInitialSubmission = !!modelId && !submittedAt && !confirmedAt && profileFilled < 3;

  const showForm = editingProfile;
  const copy = modelLanguage === "en" ? {
    profile: "Profile",
    dashboard: "Model Dashboard",
    back: "Back",
    notLinked: "Your model profile is not linked yet. Please contact the team.",
    progressTitleEmpty: "Let's set up your profile",
    progressTitlePartial: "Your profile is taking shape",
    progressTitleDone: "All set — your profile is complete ✨",
    progressBodyEmpty: "Fill it out so the team can chat authentically as you — every detail you add boosts revenue.",
    progressBodyPartial: (f: number, t: number, m: number) =>
      `${f} of ${t} fields filled — ${m} still missing. Completing them helps the chatters represent you better and boosts your revenue.`,
    progressBodyDone: "Nothing left to do here. You can update details anytime.",
    fillCta: "Complete profile",
    editCta: "Edit profile",
  } : {
    profile: "Steckbrief",
    dashboard: "Model Dashboard",
    back: "Zurück",
    notLinked: "Dein Model-Profil ist noch nicht verknüpft. Bitte melde dich beim Team.",
    progressTitleEmpty: "Lass uns deinen Steckbrief einrichten",
    progressTitlePartial: "Dein Steckbrief wächst",
    progressTitleDone: "Alles abgeschlossen — dein Steckbrief ist komplett ✨",
    progressBodyEmpty: "Fülle ihn aus, damit das Team authentisch in deinem Namen chatten kann — jedes Detail boostet deinen Umsatz.",
    progressBodyPartial: (f: number, t: number, m: number) =>
      `${f} von ${t} Feldern ausgefüllt — ${m} fehlen noch. Wenn du sie ergänzt, können die Chatter dich besser repräsentieren und dein Umsatz steigt.`,
    progressBodyDone: "Hier ist nichts mehr zu tun. Du kannst Details jederzeit anpassen.",
    fillCta: "Jetzt vervollständigen",
    editCta: "Steckbrief bearbeiten",
  };

  return (
    <div className="min-h-screen pb-24 model-feminine-shell relative">
      <GoldParticles />
      {/* Soft feminine blush halos layered above the gold body bg */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div
          className="absolute -top-32 -right-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-70"
          style={{ background: "radial-gradient(circle, hsl(340 80% 72% / 0.18), transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 -left-32 h-[360px] w-[360px] rounded-full blur-3xl opacity-60"
          style={{ background: "radial-gradient(circle, hsl(320 70% 75% / 0.14), transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 right-10 h-[280px] w-[280px] rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle, hsl(28 80% 60% / 0.16), transparent 70%)" }}
        />
      </div>
      <header className="header-gradient-border">
        <div className="container max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-foreground leading-tight">
                {showForm ? copy.profile : copy.dashboard}
              </h1>
              <p className="text-xs text-muted-foreground truncate">
                {modelName || accountName}
              </p>
            </div>
            {editingProfile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingProfile(false)}
                className="text-muted-foreground hover:text-foreground gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                {copy.back}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={signOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-3xl mx-auto px-4 pt-6">
        {!modelId ? (
          <div className="glass-card rounded-xl p-6 text-center text-sm text-muted-foreground">
            {copy.notLinked}
          </div>
        ) : showForm ? (
          <>
            <ModelProfileForm
              modelId={modelId}
              defaultAccountName={accountName}
              isInitialSubmission={needsInitialSubmission}
              language={modelLanguage}
              modelName={modelName || accountName}
              lockedReason={confirmedAt ? "confirmed" : null}
              onSubmitted={async () => {
                await loadProfileMeta(modelId, modelLanguage);
                setEditingProfile(false);
              }}
            />
          </>
        ) : (
          <>
            {modelId && (() => {
              const pct = profileTotal ? Math.round((profileFilled / profileTotal) * 100) : 0;
              const missing = Math.max(0, profileTotal - profileFilled);
              const title = profileComplete
                ? copy.progressTitleDone
                : profileFilled === 0
                  ? copy.progressTitleEmpty
                  : copy.progressTitlePartial;
              const body = profileComplete
                ? copy.progressBodyDone
                : profileFilled === 0
                  ? copy.progressBodyEmpty
                  : copy.progressBodyPartial(profileFilled, profileTotal, missing);

              return (
                <div
                  className={`glass-card rounded-2xl p-4 mb-4 border-l-2 ${
                    profileComplete ? "border-emerald-500/60" : "border-amber-500/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground font-semibold">{title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{body}</p>
                    </div>
                    {!profileComplete && (
                      <Button
                        size="sm"
                        onClick={() => setEditingProfile(true)}
                        className="shrink-0"
                      >
                        {profileFilled === 0 ? copy.fillCta : copy.editCta}
                      </Button>
                    )}
                  </div>

                  {!profileComplete && (
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5 tabular-nums">
                        <span>{profileFilled} / {profileTotal}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary/40 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent/70 to-accent transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
            <ModelHomeDashboard
              modelId={modelId}
              modelName={modelName || accountName}
              modelUsername={modelUsername}
              profileConfirmed={!!confirmedAt}
              language={modelLanguage}
              onEditProfile={() => setEditingProfile(true)}
            />
          </>
        )}
      </div>
    </div>
  );
}
