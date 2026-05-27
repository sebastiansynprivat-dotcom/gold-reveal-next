import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import ModelProfileForm from "@/components/ModelProfileForm";
import ModelHomeDashboard from "@/components/ModelHomeDashboard";

export default function ModelDashboard() {
  const { user, signOut } = useAuth();
  const [accountName, setAccountName] = useState("");
  const [modelId, setModelId] = useState<string | null>(null);
  const [modelName, setModelName] = useState("");
  const [modelUsername, setModelUsername] = useState<string | null>(null);
  const [modelLanguage, setModelLanguage] = useState<"de" | "en">("de");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);

  const loadProfileMeta = useCallback(async (mid: string) => {
    const { data } = await (supabase.from("model_profiles") as any)
      .select("submitted_at, confirmed_at")
      .eq("model_id", mid)
      .maybeSingle();
    setSubmittedAt(data?.submitted_at || null);
    setConfirmedAt(data?.confirmed_at || null);
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
          .select("name, username, model_language")
          .eq("id", resolvedModelId)
          .maybeSingle();
        if (model) {
          setModelName(model.name || "");
          setModelUsername(model.username || null);
          setModelLanguage(model.model_language === "en" ? "en" : "de");
        }
        await loadProfileMeta(resolvedModelId);
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

  // Determine view: form (initial submission) | dashboard | edit-form
  const needsInitialSubmission = !!modelId && !submittedAt;
  const showForm = needsInitialSubmission || editingProfile;
  const copy = modelLanguage === "en" ? {
    profile: "Profile",
    dashboard: "Model Dashboard",
    back: "Back",
    notLinked: "Your model profile is not linked yet. Please contact the team.",
    fillTitle: "Please fill out your profile",
    fillBody: "Once you submit your profile, you will get access to your dashboard with earnings, platforms, and requests.",
  } : {
    profile: "Steckbrief",
    dashboard: "Model Dashboard",
    back: "Zurück",
    notLinked: "Dein Model-Profil ist noch nicht verknüpft. Bitte melde dich beim Team.",
    fillTitle: "Bitte fülle deinen Steckbrief aus",
    fillBody: "Sobald du den Steckbrief abgesendet hast, bekommst du Zugang zu deinem Dashboard mit Umsätzen, Plattformen und Anfragen.",
  };

  return (
    <div className="min-h-screen pb-24">
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
            {needsInitialSubmission && (
              <div className="glass-card rounded-xl p-4 mb-4 border-l-2 border-accent/60">
                <p className="text-sm text-foreground font-semibold">
                  {copy.fillTitle}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {copy.fillBody}
                </p>
              </div>
            )}
            <ModelProfileForm
              modelId={modelId}
              defaultAccountName={accountName}
              isInitialSubmission={needsInitialSubmission}
              language={modelLanguage}
              onSubmitted={async () => {
                await loadProfileMeta(modelId);
                setEditingProfile(false);
              }}
            />
          </>
        ) : (
          <ModelHomeDashboard
            modelId={modelId}
            modelName={modelName || accountName}
            modelUsername={modelUsername}
            profileConfirmed={!!confirmedAt}
            language={modelLanguage}
            onEditProfile={() => setEditingProfile(true)}
          />
        )}
      </div>
    </div>
  );
}
