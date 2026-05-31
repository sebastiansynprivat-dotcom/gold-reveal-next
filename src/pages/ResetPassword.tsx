import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-transparent hover:border-primary/25 transition-all duration-300";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase will set a recovery session via the URL hash automatically.
    // Wait for an auth event to confirm we have a valid recovery session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    // Fallback: after 1.5s allow form to render anyway (Supabase processes hash sync)
    const t = setTimeout(() => setReady(true), 1500);
    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 6) {
      setError("Das Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    if (password !== password2) {
      setError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message.includes("session")
        ? "Der Link ist abgelaufen oder ungültig. Bitte fordere einen neuen an."
        : error.message);
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate("/auth"), 2500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <motion.img
        src={logo} alt="Logo"
        className="w-20 h-20 rounded-full mb-10"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
      />
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <h1 className="text-gold-gradient-shimmer text-2xl font-bold text-center tracking-tight leading-tight mb-2">
          Neues Passwort setzen
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-7">
          Gib dein neues Passwort ein.
        </p>

        {success ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-2xl">✓</div>
            <p className="text-foreground font-semibold">Passwort aktualisiert!</p>
            <p className="text-muted-foreground text-sm">Du wirst zur Anmeldung weitergeleitet…</p>
          </div>
        ) : !ready ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="input-gold-shimmer rounded-xl">
              <input
                type="password" autoComplete="new-password"
                placeholder="Neues Passwort (min. 6 Zeichen)"
                value={password} onChange={(e) => setPassword(e.target.value)}
                required minLength={6} className={inputClass}
              />
            </div>
            <div className="input-gold-shimmer rounded-xl">
              <input
                type="password" autoComplete="new-password"
                placeholder="Passwort bestätigen"
                value={password2} onChange={(e) => setPassword2(e.target.value)}
                required minLength={6} className={inputClass}
              />
            </div>
            {error && <p className="text-destructive text-sm text-center animate-fade-in">{error}</p>}
            <button
              type="submit" disabled={submitting}
              className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold tracking-wide hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
            >
              {submitting ? "Bitte warten..." : "Passwort speichern"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
