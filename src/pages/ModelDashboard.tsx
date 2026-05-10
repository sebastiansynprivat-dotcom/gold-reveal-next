import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import ModelProfileForm from "@/components/ModelProfileForm";

export default function ModelDashboard() {
  const { user, signOut } = useAuth();
  const [accountName, setAccountName] = useState("");
  const [modelId, setModelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

      setModelId(resolvedModelId);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="header-gradient-border">
        <div className="container max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-foreground leading-tight">Model Dashboard</h1>
              <p className="text-xs text-muted-foreground truncate">{accountName}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-3xl mx-auto px-4 pt-6">
        {modelId ? (
          <ModelProfileForm modelId={modelId} defaultAccountName={accountName} />
        ) : (
          <div className="glass-card rounded-xl p-6 text-center text-sm text-muted-foreground">
            Your model profile is not linked yet. Please contact the team.
          </div>
        )}
      </div>
    </div>
  );
}
