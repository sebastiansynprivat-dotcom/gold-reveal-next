import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

const translateError = (msg: string): string => {
  if (msg.includes("Invalid login credentials")) return "E-Mail oder Passwort ist falsch.";
  if (msg.includes("Email not confirmed")) return "Bitte bestätige zuerst deine E-Mail.";
  if (msg.includes("already registered")) return "Diese E-Mail ist bereits registriert.";
  if (msg.includes("invalid")) return "Bitte gib eine gültige E-Mail-Adresse ein.";
  if (msg.includes("security purposes")) return "Bitte warte einen Moment und versuche es erneut.";
  if (msg.includes("rate limit")) return "Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.";
  if (msg.includes("Password should be")) return "Das Passwort muss mindestens 6 Zeichen haben.";
  return msg;
};

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 hover:border-primary/30 transition-all duration-200";

const Auth = () => {
  const { user, loading, signUp, signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  useEffect(() => {
    if (!user) return;
    const pendingId = localStorage.getItem("pending_telegram_id");
    const pendingOffer = localStorage.getItem("pending_offer");
    if (pendingId || pendingOffer) {
      const updates: Record<string, string> = {};
      if (pendingId) updates.telegram_id = pendingId;
      if (pendingOffer) updates.offer = pendingOffer;
      supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .then(async () => {
          localStorage.removeItem("pending_telegram_id");
          localStorage.removeItem("pending_offer");

          if (pendingOffer) {
            await new Promise((r) => setTimeout(r, 2000));
            const { data: assignedAccounts } = await supabase
              .from("accounts")
              .select("id, drive_folder_id")
              .eq("assigned_to", user.id);

            const withDrive = (assignedAccounts || []).filter((a) => a.drive_folder_id);
            for (const acc of withDrive) {
              try {
                const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
                await fetch(
                  `https://${projectId}.supabase.co/functions/v1/share-drive`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                      Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                    },
                    body: JSON.stringify({ folder_id: acc.drive_folder_id, email: user.email }),
                  }
                );
              } catch (err) {
                console.error("Auto drive share failed:", err);
              }
            }

            try {
              const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
              await fetch(
                `https://${projectId}.supabase.co/functions/v1/notify-account-assigned`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
                  },
                  body: JSON.stringify({ user_id: user.id }),
                }
              );
            } catch (err) {
              console.error("Account assignment notification failed:", err);
            }
          }
        });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (isSignUp) {
      if (!groupName.trim()) {
        setError("Bitte gib deinen Gruppennamen ein.");
        setSubmitting(false);
        return;
      }
      const { error } = await signUp(email, password, { group_name: groupName.trim() });
      if (error) {
        setError(translateError(error.message));
      } else {
        setSignUpSuccess(true);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(translateError(error.message));
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <motion.img
        src={logo}
        alt="SheX Logo"
        className="w-20 h-20 rounded-full mb-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
      />

      {signUpSuccess ? (
        <motion.div
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 text-center space-y-4"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <span className="text-2xl">✉️</span>
          </div>
          <h2 className="gold-gradient-text text-xl font-bold">
            Bestätige deine E-Mail
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Wir haben dir eine E-Mail an <span className="text-foreground font-medium">{email}</span> gesendet.
            Klicke auf den Link in der E-Mail, um dein Konto zu aktivieren.
          </p>
          <p className="text-muted-foreground/60 text-xs">
            Keine E-Mail erhalten? Schau im Spam-Ordner nach.
          </p>
          <button
            onClick={() => {
              setSignUpSuccess(false);
              setIsSignUp(false);
              setEmail("");
              setPassword("");
              setGroupName("");
            }}
            className="mt-3 text-sm text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
          >
            Zurück zur Anmeldung
          </button>
        </motion.div>
      ) : (
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <h1 className="gold-gradient-text text-2xl font-bold text-center tracking-tight leading-tight mb-2">
            {isSignUp ? "Erstelle ein kostenloses Konto bei SheX" : "Willkommen zurück"}
          </h1>
          <p className="text-muted-foreground text-sm text-center mb-7">
            {isSignUp ? "Erstelle dein Konto, um loszulegen" : "Melde dich an, um weiterzumachen"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <input
                type="text"
                placeholder="Gruppenname (z.B. Team Alpha)"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
                className={inputClass}
              />
            )}
            <input
              type="email"
              placeholder="E-Mail Adresse"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
            <input
              type="password"
              placeholder="Passwort (min. 6 Zeichen)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className={inputClass}
            />

            {error && (
              <p className="text-destructive text-sm text-center animate-fade-in">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold tracking-wide hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
            >
              {submitting ? "Bitte warten..." : isSignUp ? "Konto erstellen" : "Anmelden"}
            </button>
          </form>

          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            {isSignUp ? "Bereits ein Konto? Hier anmelden" : "Noch kein Konto? Hier registrieren"}
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default Auth;
