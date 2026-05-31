import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  defaultEmail?: string;
  redirectPath?: string; // defaults to /reset-password
}

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-all duration-300";

export default function ForgotPasswordDialog({ open, onClose, defaultEmail = "", redirectPath = "/reset-password" }: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${redirectPath}`,
    });
    setSubmitting(false);
    if (error) {
      setError(error.message.includes("rate")
        ? "Zu viele Versuche. Bitte warte einen Moment."
        : "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.");
      return;
    }
    setSent(true);
  };

  const handleClose = () => {
    setSent(false);
    setError("");
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      onClick={handleClose}
    >
      <motion.div
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-2xl">✉️</div>
            <h3 className="text-lg font-bold text-foreground text-center">E-Mail gesendet</h3>
            <p className="text-muted-foreground text-sm text-center leading-relaxed">
              Wir haben dir einen Link zum Zurücksetzen deines Passworts an{" "}
              <span className="text-foreground font-medium">{email}</span> gesendet.
              Schau auch im Spam-Ordner nach.
            </p>
            <button
              type="button" onClick={handleClose}
              className="w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:scale-[1.02] transition-all"
            >
              Schließen
            </button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-foreground text-center">Passwort zurücksetzen</h3>
            <p className="text-muted-foreground text-xs text-center leading-relaxed">
              Gib deine E-Mail-Adresse ein. Wir senden dir einen Link, um dein Passwort zurückzusetzen.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email" inputMode="email" autoCapitalize="none" autoCorrect="off"
                placeholder="E-Mail Adresse" value={email}
                onChange={(e) => setEmail(e.target.value)}
                required className={inputClass}
              />
              {error && <p className="text-destructive text-xs text-center">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button" onClick={handleClose}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit" disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {submitting ? "Senden..." : "Link senden"}
                </button>
              </div>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
