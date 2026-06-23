import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Dashboard = lazy(() => import("./Dashboard"));

const ADMIN_SESSION_KEY = "admin_impersonation_origin_session";

/**
 * Admin "Login als Chatter"-Modus:
 * Wir minten serverseitig ein echtes Magic-Link-Token für den Ziel-Chatter und
 * setzen die Session im Browser tatsächlich auf den Chatter um. Dadurch läuft
 * jede RLS-Policy gegen auth.uid() = chatter, und der Admin sieht das Dashboard
 * exakt so wie der Chatter (inkl. eigener Anfragen, Profil-Edits, etc.).
 *
 * Beim Verlassen wird die Admin-Session aus sessionStorage wiederhergestellt.
 */
export default function AdminChatterView() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"starting" | "ready" | "error">("starting");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [chatterEmail, setChatterEmail] = useState<string>("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (!userId || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        // 1. Save current (admin) session so we can restore it on exit.
        const { data: { session: adminSession } } = await supabase.auth.getSession();
        if (!adminSession) {
          setErrorMsg("Keine aktive Admin-Session.");
          setStatus("error");
          return;
        }
        sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
        }));

        // 2. Ask edge function to mint a session for the target chatter.
        const { data, error } = await supabase.functions.invoke("admin-impersonate-user", {
          body: { user_id: userId },
        });
        if (error || !data?.access_token || !data?.refresh_token) {
          throw new Error(error?.message || data?.error || "Impersonation fehlgeschlagen");
        }

        // 3. Actually switch the browser session to the chatter.
        const { error: sErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
        if (sErr) throw sErr;

        setChatterEmail(data.email || "");
        setStatus("ready");
      } catch (e: any) {
        console.error("[impersonate]", e);
        setErrorMsg(e?.message || "Unbekannter Fehler");
        setStatus("error");
        // Try to restore admin session if something went wrong mid-flight.
        const saved = sessionStorage.getItem(ADMIN_SESSION_KEY);
        if (saved) {
          try {
            const s = JSON.parse(saved);
            await supabase.auth.setSession(s);
          } catch {}
        }
      }
    })();
  }, [userId]);

  const restoreAdmin = async (redirect: string = "/admin") => {
    const saved = sessionStorage.getItem(ADMIN_SESSION_KEY);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        await supabase.auth.setSession(s);
      } catch (e) {
        console.error("[restore admin]", e);
        toast({ title: "Admin-Session konnte nicht wiederhergestellt werden", variant: "destructive" });
      }
    }
    navigate(redirect, { replace: true });
  };

  // Make sure we always restore on unmount (e.g. user navigates away via menu)
  useEffect(() => {
    return () => {
      const saved = sessionStorage.getItem(ADMIN_SESSION_KEY);
      if (saved) {
        try {
          const s = JSON.parse(saved);
          supabase.auth.setSession(s).finally(() => {
            sessionStorage.removeItem(ADMIN_SESSION_KEY);
          });
        } catch {}
      }
    };
  }, []);

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

  if (status === "starting") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground">Logge dich als Chatter ein…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="glass-card rounded-xl p-6 text-center max-w-md space-y-3">
          <p className="text-sm text-foreground">Login als Chatter fehlgeschlagen.</p>
          {errorMsg && <p className="text-xs text-muted-foreground">{errorMsg}</p>}
          <Button variant="outline" size="sm" onClick={() => restoreAdmin("/admin")}>
            Zurück zum Admin
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-50 border-b border-accent/30 bg-gradient-to-r from-accent/20 via-accent/10 to-transparent backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-accent font-semibold">
            <Eye className="h-3.5 w-3.5" />
            Admin · Eingeloggt als Chatter
          </div>
          {chatterEmail && (
            <span className="text-[11px] text-muted-foreground truncate">
              {chatterEmail}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => restoreAdmin("/admin")}
              className="h-7 text-xs gap-1.5"
            >
              <LogOut className="h-3.5 w-3.5" />
              Zurück zum Admin
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
  );
}
