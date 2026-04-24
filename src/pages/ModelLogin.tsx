import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

const translateError = (msg: string): string => {
  if (msg.includes("Invalid login credentials")) return "E-Mail oder Passwort ist falsch.";
  if (msg.includes("Email not confirmed")) return "Bitte bestätige zuerst deine E-Mail.";
  if (msg.includes("security purposes")) return "Bitte warte einen Moment und versuche es erneut.";
  if (msg.includes("rate limit")) return "Zu viele Versuche. Bitte warte einen Moment.";
  return msg;
};

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-transparent hover:border-primary/25 transition-all duration-300";

export default function ModelLogin() {
  const { user, loading, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [isModel, setIsModel] = useState<boolean | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  // If logged in as non-model, sign out automatically so model can log in fresh
  useEffect(() => {
    if (!user || signingOut) return;
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "model").maybeSingle()
      .then(({ data }) => {
        if (data) {
          setIsModel(true);
        } else {
          // Not a model – sign out so they can log in as model
          setSigningOut(true);
          supabase.auth.signOut().then(() => setSigningOut(false));
        }
      });
  }, [user, signingOut]);

  // Mouse particles
  const particlesRef = useRef<{ x: number; y: number; size: number; opacity: number; vx: number; vy: number; life: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (Math.random() > 0.5) return;
    particlesRef.current.push({
      x: e.clientX + (Math.random() - 0.5) * 8,
      y: e.clientY + (Math.random() - 0.5) * 8,
      size: 1.5 + Math.random() * 2.5,
      opacity: 0.3 + Math.random() * 0.3,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8 - 0.3,
      life: 1,
    });
    if (particlesRef.current.length > 40) particlesRef.current = particlesRef.current.slice(-40);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const anim = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.015;
        const alpha = Math.max(0, p.life) * p.opacity;
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grad.addColorStop(0, `hsla(43, 76%, 56%, ${alpha})`);
        grad.addColorStop(0.4, `hsla(43, 56%, 52%, ${alpha * 0.5})`);
        grad.addColorStop(1, `hsla(43, 56%, 52%, 0)`);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(43, 76%, 68%, ${alpha})`; ctx.fill();
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      animFrameRef.current = requestAnimationFrame(anim);
    };
    anim();
    return () => { window.removeEventListener("resize", resize); cancelAnimationFrame(animFrameRef.current); };
  }, []);

  if (loading || signingOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user && isModel === true) return <Navigate to="/model" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) setError(translateError(error.message));
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden" onMouseMove={handleMouseMove}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />
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
          Model Portal
        </h1>
        <p className="text-muted-foreground text-sm text-center mb-7">
          Melde dich mit deinen Zugangsdaten an
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="input-gold-shimmer rounded-xl">
            <input type="email" placeholder="E-Mail Adresse" value={email} onChange={(e) => setEmail(e.target.value)} required className={inputClass} />
          </div>
          <div className="input-gold-shimmer rounded-xl">
            <input type="password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} />
          </div>
          {error && <p className="text-destructive text-sm text-center animate-fade-in">{error}</p>}
          <button type="submit" disabled={submitting} className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold tracking-wide hover:scale-[1.02] transition-all duration-200 disabled:opacity-50">
            {submitting ? "Bitte warten..." : "Anmelden"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
