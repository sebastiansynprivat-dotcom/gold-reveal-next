import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ShieldCheck, Pencil, Eye, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import ModelProfileForm from "@/components/ModelProfileForm";
import ModelHomeDashboard from "@/components/ModelHomeDashboard";

/**
 * Admin-Preview-Modus: rendert die Model-Sicht (Dashboard / Steckbrief)
 * ohne Logout. Der Admin kann den Steckbrief bearbeiten und direkt bestätigen.
 */
export default function AdminModelView() {
  const { modelId } = useParams<{ modelId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [modelName, setModelName] = useState("");
  const [modelUsername, setModelUsername] = useState<string | null>(null);
  const [modelLanguage, setModelLanguage] = useState<"de" | "en">("de");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);
  const [mode, setMode] = useState<"dashboard" | "edit">("dashboard");
  const [busy, setBusy] = useState(false);

  const loadAll = useCallback(async () => {
    if (!modelId) return;
    setLoading(true);
    const [{ data: model }, { data: profile }] = await Promise.all([
      (supabase.from("models") as any).select("name, username, model_language").eq("id", modelId).maybeSingle(),
      (supabase.from("model_profiles") as any)
        .select("submitted_at, confirmed_at")
        .eq("model_id", modelId)
        .maybeSingle(),
    ]);
    setModelName(model?.name || "");
    setModelUsername(model?.username || null);
    setModelLanguage(model?.model_language === "en" ? "en" : "de");
    setSubmittedAt(profile?.submitted_at || null);
    setConfirmedAt(profile?.confirmed_at || null);
    setLoading(false);
  }, [modelId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const confirmProfile = async () => {
    if (!modelId) return;
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await (supabase.from("model_profiles" as any) as any)
      .update({ confirmed_at: new Date().toISOString(), confirmed_by: u?.user?.id })
      .eq("model_id", modelId);
    setBusy(false);
    if (error) {
      toast.error("Bestätigung fehlgeschlagen");
      return;
    }
    setConfirmedAt(new Date().toISOString());
    toast.success("Steckbrief bestätigt — im Chatter-Dashboard sichtbar");
  };

  const revoke = async () => {
    if (!modelId) return;
    setBusy(true);
    const { error } = await (supabase.from("model_profiles" as any) as any)
      .update({ confirmed_at: null, confirmed_by: null })
      .eq("model_id", modelId);
    setBusy(false);
    if (error) {
      toast.error("Reset fehlgeschlagen");
      return;
    }
    setConfirmedAt(null);
    toast.success("Bestätigung zurückgezogen");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!modelId || !modelName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="glass-card rounded-xl p-6 text-center max-w-md">
          <p className="text-sm text-foreground">Model nicht gefunden.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/admin")}>
            Zurück zum Admin
          </Button>
        </div>
      </div>
    );
  }

  const modelCopy = modelLanguage === "en" ? {
    titleEdit: "Edit profile",
    titleDashboard: "Model Dashboard",
    back: "Back",
  } : {
    titleEdit: "Steckbrief bearbeiten",
    titleDashboard: "Model Dashboard",
    back: "Zurück",
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Admin-Preview-Banner */}
      <div className="border-b border-accent/30 bg-gradient-to-r from-accent/15 via-accent/5 to-transparent">
        <div className="container max-w-5xl mx-auto px-4 py-2 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-accent font-semibold">
            <Eye className="h-3.5 w-3.5" />
            Admin-Preview · Model-Ansicht
          </div>
          <span className="text-[11px] text-muted-foreground">
            Du siehst das Dashboard genau wie {modelName}.
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const returnModel = new URLSearchParams(window.location.search).get("return_model");
                const target = returnModel ? `/admin?tab=platzhalter&model=${returnModel}` : "/admin";
                // Try to close popup tab first (window opened via window.open). If blocked, navigate.
                try { window.close(); } catch {}
                setTimeout(() => {
                  if (!window.closed) window.location.replace(target);
                }, 80);
              }}
              className="h-7 text-xs gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Admin
            </Button>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="header-gradient-border">
        <div className="container max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-foreground leading-tight">
                {mode === "edit" ? modelCopy.titleEdit : modelCopy.titleDashboard}
              </h1>
              <p className="text-xs text-muted-foreground truncate">{modelName}</p>
            </div>
            {mode === "edit" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("dashboard")}
                className="text-muted-foreground hover:text-foreground gap-1.5"
              >
                <ArrowLeft className="h-4 w-4" />
                {modelCopy.back}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Admin action bar */}
      <div className="container max-w-5xl mx-auto px-4 pt-4">
        <div className="glass-card rounded-xl p-3 flex flex-wrap items-center gap-2">
          {confirmedAt ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-3 w-3" /> Bestätigt
            </span>
          ) : submittedAt ? (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Prüfung läuft
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30">
              Steckbrief leer
            </span>
          )}

          <Button
            size="sm"
            variant={mode === "edit" ? "default" : "outline"}
            onClick={() => setMode(mode === "edit" ? "dashboard" : "edit")}
            className="h-8 text-xs gap-1.5"
          >
            <Pencil className="h-3.5 w-3.5" />
            {mode === "edit" ? "Dashboard ansehen" : "Steckbrief bearbeiten"}
          </Button>

          {!confirmedAt && submittedAt && (
            <Button
              size="sm"
              disabled={busy}
              onClick={confirmProfile}
              className="h-8 text-xs gap-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Steckbrief bestätigen
            </Button>
          )}
          {confirmedAt && (
            <Button
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={revoke}
              className="h-8 text-xs"
            >
              Bestätigung zurückziehen
            </Button>
          )}

          {modelUsername && (
            <a
              href={`/m/${modelUsername}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-accent font-mono"
            >
              /m/{modelUsername}
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="container max-w-3xl mx-auto px-4 pt-4">
        {mode === "edit" ? (
          <ModelProfileForm
            modelId={modelId}
            defaultAccountName={modelName}
            isInitialSubmission={false}
            language={modelLanguage}
            onSubmitted={async () => {
              await loadAll();
              toast.success("Änderungen gespeichert");
            }}
          />
        ) : (
          <ModelHomeDashboard
            modelId={modelId}
            modelName={modelName}
            modelUsername={modelUsername}
            profileConfirmed={!!confirmedAt}
            language={modelLanguage}
            onEditProfile={() => setMode("edit")}
          />
        )}
      </div>
    </div>
  );
}
