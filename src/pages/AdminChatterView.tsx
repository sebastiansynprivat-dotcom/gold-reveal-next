import { lazy, Suspense, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AuthContext, useAuth } from "@/hooks/useAuth";

const Dashboard = lazy(() => import("./Dashboard"));

/**
 * Admin-Preview-Modus: rendert das Chatter-Dashboard 1:1 so wie es der
 * Chatter sieht. Funktioniert, indem wir den AuthContext lokal überschreiben
 * und user.id auf die Ziel-User-ID des Chatters setzen. Reine Lese-Vorschau —
 * Schreibaktionen, die per RLS auf auth.uid() prüfen, können fehlschlagen,
 * das ist gewollt.
 */
export default function AdminChatterView() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const auth = useAuth();
  const [chatterName, setChatterName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("group_name, telegram_id, name")
        .eq("user_id", userId)
        .maybeSingle();
      const display =
        (data as any)?.group_name ||
        (data as any)?.name ||
        (data as any)?.telegram_id ||
        `User ${userId.slice(0, 6)}`;
      setChatterName(display);
      setLoading(false);
    })();
  }, [userId]);

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="glass-card rounded-xl p-6 text-center max-w-md">
          <p className="text-sm text-foreground">Chatter nicht gefunden.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => navigate("/admin")}>
            Zurück zum Admin
          </Button>
        </div>
      </div>
    );
  }

  if (loading || !auth.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Synthetic user: same auth session, but user.id swapped to the target chatter.
  // Dashboard.tsx reads user.id from useAuth() for all its data queries, so this
  // makes the whole dashboard render that chatter's data.
  const impersonatedUser = { ...auth.user, id: userId } as typeof auth.user;
  const overriddenAuth = { ...auth, user: impersonatedUser };

  return (
    <AuthContext.Provider value={overriddenAuth}>
      <div className="min-h-screen pb-24">
        <div className="sticky top-0 z-50 border-b border-accent/30 bg-gradient-to-r from-accent/20 via-accent/10 to-transparent backdrop-blur-md">
          <div className="container max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-accent font-semibold">
              <Eye className="h-3.5 w-3.5" />
              Admin-Preview · Chatter-Ansicht
            </div>
            <span className="text-[11px] text-muted-foreground truncate">
              Du siehst das Dashboard genau wie <span className="text-foreground font-medium">{chatterName}</span>.
            </span>
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  try { window.close(); } catch {}
                  setTimeout(() => {
                    if (!window.closed) window.location.replace("/admin");
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

        <Suspense
          fallback={
            <div className="min-h-screen flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          }
        >
          <Dashboard />
        </Suspense>
      </div>
    </AuthContext.Provider>
  );
}
