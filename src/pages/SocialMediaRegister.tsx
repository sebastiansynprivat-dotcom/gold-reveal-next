import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-transparent hover:border-primary/25 transition-all duration-300";

export default function SocialMediaRegister() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { data, error: fnErr } = await supabase.functions.invoke("socialmedia-register", {
      body: { email, password, inviteCode },
    });

    if (fnErr || (data && (data as any).error)) {
      setError((data as any)?.error ?? fnErr?.message ?? "Registrierung fehlgeschlagen.");
      setSubmitting(false);
      return;
    }

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      setError("Account erstellt. Bitte melde dich an.");
      setSubmitting(false);
      navigate("/socialmedia/login");
      return;
    }

    navigate("/socialmedia/admin");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
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
          Social Media Dashboard
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-7">
          Registriere dich mit deinem Einladungscode
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="input-gold-shimmer rounded-xl">
            <input type="email" autoComplete="email" placeholder="E-Mail Adresse" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
          </div>
          <div className="input-gold-shimmer rounded-xl">
            <input type="password" autoComplete="new-password" placeholder="Passwort (min. 8 Zeichen)" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className={inputClass} />
          </div>
          <div className="input-gold-shimmer rounded-xl">
            <input type="text" placeholder="Einladungscode" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} required className={inputClass} />
          </div>
          {error && <p className="text-destructive text-sm text-center animate-fade-in">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold tracking-wide hover:scale-[1.02] transition-all duration-200 disabled:opacity-50">
            {submitting ? "Bitte warten..." : "Account erstellen"}
          </button>
          <Link to="/socialmedia/login" className="block text-center text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-2">
            Bereits einen Account? Anmelden
          </Link>
        </form>
      </motion.div>
    </div>
  );
}
