import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";
import GoldParticles from "@/components/GoldParticles";

const translateError = (msg: string): string => {
  if (msg.includes("Invalid login credentials")) return "E-Mail oder Passwort ist falsch.";
  if (msg.includes("Email not confirmed")) return "Bitte bestätige zuerst deine E-Mail.";
  return msg;
};

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none hover:border-primary/25 transition-all duration-300";

export default function MarketerLogin() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user || signingOut) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "socialmedia_marketer")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setHasAccess(true);
        } else {
          setSigningOut(true);
          supabase.auth.signOut().then(() => setSigningOut(false));
          setHasAccess(false);
        }
      });
  }, [user, signingOut]);

  if (loading || signingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && hasAccess === true) return <Navigate to="/marketer" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) setError(translateError(error.message));
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <GoldParticles />
      <motion.img
        src={logo} alt="Logo"
        className="w-20 h-20 rounded-full mb-10 relative z-10"
        initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
      />
      <motion.div
        className="w-full max-w-sm relative z-10"
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
      >
        <h1 className="text-gold-gradient-shimmer text-2xl font-bold text-center tracking-tight leading-tight mb-2">
          Marketer Dashboard
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-7">
          Melde dich mit deinen Zugangsdaten an
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email" name="email" autoComplete="username"
            placeholder="E-Mail Adresse"
            value={email} onChange={(e) => setEmail(e.target.value)}
            required className={inputClass}
          />
          <input
            type="password" name="password" autoComplete="current-password"
            placeholder="Passwort"
            value={password} onChange={(e) => setPassword(e.target.value)}
            required className={inputClass}
          />
          {error && <p className="text-destructive text-sm text-center animate-fade-in">{error}</p>}
          <button
            type="submit" disabled={submitting}
            className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold tracking-wide hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
          >
            {submitting ? "Bitte warten..." : "Anmelden"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
