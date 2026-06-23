import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Dashboard = lazy(() => import("./Dashboard"));

const ADMIN_SESSION_KEY = "admin_impersonation_origin_session";
const ADMIN_SESSION_BACKUP_KEY = "admin_impersonation_origin_session_backup";

type AdminSessionBackup = {
  access_token: string;
  refresh_token: string;
  auth_storage_key?: string;
  raw_storage_value?: string;
  saved_at: number;
};

const findAuthStorageSnapshot = (accessToken: string): { authStorageKey?: string; rawStorageValue?: string } => {
  if (typeof window === "undefined") return {};

  const keys = Object.keys(window.localStorage).filter(
    (key) => key.startsWith("sb-") && key.endsWith("-auth-token"),
  );
  const matchingKey = keys.find((key) => window.localStorage.getItem(key)?.includes(accessToken));
  const authStorageKey = matchingKey || keys[0];
  const rawStorageValue = authStorageKey ? window.localStorage.getItem(authStorageKey) || undefined : undefined;

  return { authStorageKey, rawStorageValue };
};

const readAdminBackup = (): AdminSessionBackup | null => {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(ADMIN_SESSION_KEY) || window.localStorage.getItem(ADMIN_SESSION_BACKUP_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.access_token || !parsed?.refresh_token) return null;
    return parsed;
  } catch {
    return null;
  }
};

const preserveAdminStorage = () => {
  const backup = readAdminBackup();
  if (!backup?.auth_storage_key || !backup.raw_storage_value) return;
  window.localStorage.setItem(backup.auth_storage_key, backup.raw_storage_value);
};

const clearAdminBackup = () => {
  window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
  window.localStorage.removeItem(ADMIN_SESSION_BACKUP_KEY);
};

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
  const switchedRef = useRef(false);

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

        const snapshot = findAuthStorageSnapshot(adminSession.access_token);
        const adminBackup: AdminSessionBackup = {
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token,
          auth_storage_key: snapshot.authStorageKey,
          raw_storage_value: snapshot.rawStorageValue,
          saved_at: Date.now(),
        };
        const serializedBackup = JSON.stringify(adminBackup);
        sessionStorage.setItem(ADMIN_SESSION_KEY, serializedBackup);
        localStorage.setItem(ADMIN_SESSION_BACKUP_KEY, serializedBackup);

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

        switchedRef.current = true;

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
            preserveAdminStorage();
          } catch {}
        }
      }
    })();
  }, [userId]);

  useEffect(() => {
    const preserveBeforeLeaving = () => preserveAdminStorage();
    window.addEventListener("pagehide", preserveBeforeLeaving);
    window.addEventListener("beforeunload", preserveBeforeLeaving);
    return () => {
      window.removeEventListener("pagehide", preserveBeforeLeaving);
      window.removeEventListener("beforeunload", preserveBeforeLeaving);
    };
  }, []);

  const restoreAdmin = async (redirect: string = "/admin") => {
    const saved = readAdminBackup();
    if (saved) {
      try {
        preserveAdminStorage();
        await supabase.auth.setSession({
          access_token: saved.access_token,
          refresh_token: saved.refresh_token,
        });
        preserveAdminStorage();
        clearAdminBackup();
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
      if (!switchedRef.current) return;
      const saved = readAdminBackup();
      if (saved) {
        try {
          preserveAdminStorage();
          supabase.auth.setSession({
            access_token: saved.access_token,
            refresh_token: saved.refresh_token,
          }).finally(() => {
            preserveAdminStorage();
            clearAdminBackup();
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
