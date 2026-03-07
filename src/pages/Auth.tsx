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
  "w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:shadow-[0_0_12px_hsl(43_56%_52%_/_0.15)] hover:border-primary/40 transition-all duration-200";

const Auth = () => {
  const { user, loading, signUp, signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  // Transfer pending telegram ID and offer after login, then trigger Drive sharing
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
                    body: JSON.stringify({
                      folder_id: acc.drive_folder_id,
                      email: user.email,
                    }),
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

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08 } },
  };
  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background gold blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,hsl(43_56%_52%_/_0.06),transparent_70%)] blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,hsl(43_76%_46%_/_0.04),transparent_70%)] blur-3xl" />
      </div>

      {/* Logo */}
      <motion.img
        src={logo}
        alt="SheX Logo"
        className="w-20 h-20 rounded-full mb-8 streak-circle-pulse"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
      />

      {signUpSuccess ? (
        <motion.div
          className="glass-card-subtle gold-gradient-border-animated dialog-glow rounded-2xl p-8 text-center max-w-sm space-y-4 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div
            className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4 streak-circle-pulse"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.15 }}
          >
            <span className="text-3xl">✉️</span>
          </motion.div>
          <h2 className="gold-gradient-text text-2xl font-bold">
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
            className="mt-4 text-sm text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
          >
            Zurück zur Anmeldung
          </button>
        </motion.div>
      ) : (
        <motion.div
          className="w-full max-w-sm glass-card-subtle gold-gradient-border-animated dialog-glow rounded-2xl p-8 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        >
          <h1 className="gold-gradient-text text-2xl md:text-3xl font-bold text-center tracking-tight leading-tight mb-2">
            {isSignUp
              ? "Erstelle ein kostenloses Konto bei SheX"
              : "Willkommen zurück"}
          </h1>
          <p className="text-muted-foreground text-sm text-center mb-8">
            {isSignUp
              ? "Erstelle dein Konto, um loszulegen"
              : "Melde dich an, um weiterzumachen"}
          </p>

          <motion.form
            onSubmit={handleSubmit}
            className="space-y-4"
            variants={stagger}
            initial="hidden"
            animate="show"
            key={isSignUp ? "signup" : "signin"}
          >
            {isSignUp && (
              <motion.div variants={fadeUp}>
                <input
                  type="text"
                  placeholder="Gruppenname (z.B. Team Alpha)"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  required
                  className={inputClass}
                />
              </motion.div>
            )}
            <motion.div variants={fadeUp}>
              <input
                type="email"
                placeholder="E-Mail Adresse"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </motion.div>
            <motion.div variants={fadeUp}>
              <input
                type="password"
                placeholder="Passwort (min. 6 Zeichen)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={inputClass}
              />
            </motion.div>

            {error && (
              <motion.p
                className="text-destructive text-sm text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {error}
              </motion.p>
            )}

            <motion.div variants={fadeUp}>
              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold tracking-wide gold-glow hover:gold-glow-strong hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 shimmer-bar"
              >
                {submitting
                  ? "Bitte warten..."
                  : isSignUp
                  ? "Konto erstellen"
                  : "Anmelden"}
              </button>
            </motion.div>
          </motion.form>

          <motion.button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            {isSignUp
              ? "Bereits ein Konto? Hier anmelden"
              : "Noch kein Konto? Hier registrieren"}
          </motion.button>
        </motion.div>
      )}
    </div>
  );
};

export default Auth;
