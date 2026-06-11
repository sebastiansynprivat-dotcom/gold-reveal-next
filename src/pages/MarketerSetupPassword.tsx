import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-transparent hover:border-primary/25 transition-all duration-300";

export default function MarketerSetupPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Supabase processes the invite/recovery hash automatically and sets a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN" || session) setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const t = setTimeout(() => setReady(true), 1500);
    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Das Passwort muss mindestens 8 Zeichen haben.");
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
      setError(
        error.message.includes("session")
          ? "Der Einladungslink ist abgelaufen oder ungültig. Bitte bei deinem Admin neuen anfordern."
          : error.message
      );
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate("/marketer"), 1800);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <motion.img
        src={logo}
        alt="Logo"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-20 h-20 rounded-full ring-2 ring-accent/40 mb-6"
      />
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-card/60 backdrop-blur-xl border border-accent/20 rounded-2xl p-6 space-y-4"
      >
        <div className="text-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-accent via-yellow-200 to-accent bg-clip-text text-transparent">
            Marketer-Konto einrichten
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Vergib ein Passwort, um deinen Zugang zu aktivieren.
          </p>
        </div>

        {success ? (
          <p className="text-center text-sm text-emerald-400 py-4">
            Passwort gespeichert. Du wirst weitergeleitet…
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className={inputClass}
              type="password"
              placeholder="Neues Passwort (min. 8 Zeichen)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!ready || submitting}
              autoFocus
            />
            <input
              className={inputClass}
              type="password"
              placeholder="Passwort wiederholen"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              disabled={!ready || submitting}
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <button
              type="submit"
              disabled={!ready || submitting}
              className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-semibold disabled:opacity-50 hover:bg-accent/90 transition"
            >
              {submitting ? "Speichere…" : "Passwort speichern"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
