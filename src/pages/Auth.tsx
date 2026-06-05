import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";
import ForgotPasswordDialog from "@/components/ForgotPasswordDialog";
import { useUILanguage } from "@/hooks/useUILanguage";

const translateError = (msg: string, t: (k: string) => string): string => {
  if (msg.includes("Invalid login credentials")) return t("auth.error.invalidCreds");
  if (msg.includes("Email not confirmed")) return t("auth.error.notConfirmed");
  if (msg.includes("already registered")) return t("auth.error.alreadyRegistered");
  if (msg.includes("invalid")) return t("auth.error.invalidEmail");
  if (msg.includes("security purposes")) return t("auth.error.security");
  if (msg.includes("rate limit")) return t("auth.error.rateLimit");
  if (msg.includes("Password should be")) return t("auth.error.passwordShort");
  return msg;
};

const inputClass =
  "w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-transparent hover:border-primary/25 transition-all duration-300";

const Auth = () => {
  const { user, loading, signUp, signIn } = useAuth();
  const { t } = useUILanguage();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupName, setGroupName] = useState("");
  const [name, setName] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [showGroupHelp, setShowGroupHelp] = useState(true);
  const [showTelegramHelp, setShowTelegramHelp] = useState(false);
  const [showGroupConfirm, setShowGroupConfirm] = useState(false);
  const [showTelegramConfirm, setShowTelegramConfirm] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const pendingSubmitRef = useRef<React.FormEvent | null>(null);

  // Mouse-following particles
  const particlesRef = useRef<{ x: number; y: number; size: number; opacity: number; vx: number; vy: number; life: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (Math.random() > 0.5) return; // spawn less often
    particlesRef.current.push({
      x: e.clientX + (Math.random() - 0.5) * 8,
      y: e.clientY + (Math.random() - 0.5) * 8,
      size: 1.5 + Math.random() * 2.5,
      opacity: 0.3 + Math.random() * 0.3,
      vx: (Math.random() - 0.5) * 0.8,
      vy: (Math.random() - 0.5) * 0.8 - 0.3,
      life: 1,
    });
    if (particlesRef.current.length > 40) {
      particlesRef.current = particlesRef.current.slice(-40);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.015;
        const alpha = Math.max(0, p.life) * p.opacity;

        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
        grad.addColorStop(0, `hsla(43, 76%, 56%, ${alpha})`);
        grad.addColorStop(0.4, `hsla(43, 56%, 52%, ${alpha * 0.5})`);
        grad.addColorStop(1, `hsla(43, 56%, 52%, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(43, 76%, 68%, ${alpha})`;
        ctx.fill();
      });
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

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

    if (isSignUp) {
      if (!name.trim()) {
        setError(t("auth.error.nameRequired") || "Bitte gib deinen Namen ein.");
        return;
      }
      if (!groupName.trim()) {
        setError(t("auth.error.groupRequired"));
        return;
      }
      const cleanedTgId = telegramId.replace(/\s+/g, "");
      if (!/^\d{5,}$/.test(cleanedTgId)) {
        setError(t("auth.error.tgInvalid"));
        return;
      }
      localStorage.setItem("pending_telegram_id", cleanedTgId);
      // Show confirmation popup first
      pendingSubmitRef.current = e;
      setShowGroupConfirm(true);
      return;
    }

    setSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(translateError(error.message, t));
    }
    setSubmitting(false);
  };

  const handleConfirmGroup = () => {
    setShowGroupConfirm(false);
    setShowTelegramConfirm(true);
  };

  const handleConfirmSignUp = async () => {
    setShowTelegramConfirm(false);
    setSubmitting(true);
    const { error } = await signUp(email, password, { group_name: groupName.trim(), name: name.trim() });
    if (error) {
      setError(translateError(error.message, t));
    } else {
      setSignUpSuccess(true);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden" onMouseMove={handleMouseMove}>
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />

      {/* Group name confirmation popup */}
      {showGroupConfirm && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowGroupConfirm(false)}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground text-center">{t("auth.confirmGroup.title")}</h3>
            <div className="text-center py-3 px-4 rounded-xl bg-muted border border-border">
              <span className="text-foreground font-semibold text-base">{groupName.trim()}</span>
            </div>
            <p className="text-muted-foreground text-xs text-center leading-relaxed">
              {t("auth.confirmGroup.body")} <span className="text-foreground font-medium">{t("auth.confirmGroup.bodyMid")}</span>{t("auth.confirmGroup.bodyEnd")}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowGroupConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                {t("auth.confirm.no")}
              </button>
              <button
                type="button"
                onClick={handleConfirmGroup}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:scale-[1.02] transition-all"
              >
                {t("auth.confirm.yes")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Telegram-ID confirmation popup */}
      {showTelegramConfirm && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowTelegramConfirm(false)}
        >
          <motion.div
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 space-y-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground text-center">{t("auth.confirmTg.title")}</h3>
            <div className="text-center py-3 px-4 rounded-xl bg-muted border border-border">
              <span className="text-foreground font-semibold text-base font-mono">{telegramId.replace(/\s+/g, "")}</span>
            </div>
            <p className="text-muted-foreground text-xs text-center leading-relaxed">
              {t("auth.confirmTg.body")} <span className="text-foreground font-medium">{t("auth.confirmTg.bodyMid")}</span> {t("auth.confirmTg.bodyEnd")}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowTelegramConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                {t("auth.confirm.no")}
              </button>
              <button
                type="button"
                onClick={handleConfirmSignUp}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {submitting ? t("auth.btn.wait") : t("auth.confirm.yes")}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      {/* Logo */}
      <motion.img
        src={logo}
        alt="SheX Logo"
        className="w-20 h-20 rounded-full mb-10 relative z-10"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 20 }}
      />

      {signUpSuccess ? (
        <motion.div
          className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 text-center space-y-4 relative z-10"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <span className="text-2xl">✉️</span>
          </div>
          <h2 className="gold-gradient-text text-xl font-bold">
            {t("auth.success.title")}
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("auth.success.body")} <span className="text-foreground font-medium">{email}</span>{t("auth.success.bodyEnd")}
          </p>
          <p className="text-muted-foreground/60 text-xs">
            {t("auth.success.spam")}
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
            {t("auth.success.back")}
          </button>
        </motion.div>
      ) : (
        <motion.div
          className="w-full max-w-sm relative z-10"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <h1 className="text-gold-gradient-shimmer text-2xl font-bold text-center tracking-tight leading-tight mb-2">
            {isSignUp ? t("auth.signup.title") : t("auth.signin.title")}
          </h1>
          <p className="text-muted-foreground text-sm text-center mb-7">
            {isSignUp ? t("auth.signup.subtitle") : t("auth.signin.subtitle")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <div className="input-gold-shimmer rounded-xl">
                  <input
                    type="text"
                    name="name"
                    id="signup-name"
                    autoComplete="name"
                    placeholder={t("auth.placeholder.name") || "Dein Name"}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
              </div>
            )}
            {isSignUp && (
              <div>
                <div className="input-gold-shimmer rounded-xl">
                  <input
                    type="text"
                    name="group_name"
                    id="signup-group-name"
                    autoComplete="off"
                    placeholder={t("auth.placeholder.groupName")}
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                {showGroupHelp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-3 rounded-xl bg-card border border-border text-xs text-muted-foreground leading-relaxed space-y-2"
                  >
                    <p>
                      {t("auth.help.groupName.body")}
                    </p>
                    <p className="text-primary font-semibold">
                      {t("auth.help.groupName.warning")}
                    </p>
                  </motion.div>
                )}
              </div>
            )}
            {isSignUp && (
              <div>
                <div className="input-gold-shimmer rounded-xl">
                  <input
                    type="text"
                    name="telegram_id"
                    id="signup-telegram-id"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    placeholder={t("auth.placeholder.telegramId")}
                    value={telegramId}
                    onChange={(e) => setTelegramId(e.target.value.replace(/\D/g, ""))}
                    onPaste={(e) => {
                      e.preventDefault();
                      const text = e.clipboardData.getData("text").replace(/\D/g, "");
                      setTelegramId(text);
                    }}
                    onKeyDown={(e) => {
                      if (
                        e.key.length === 1 &&
                        !/[0-9]/.test(e.key) &&
                        !e.ctrlKey && !e.metaKey
                      ) {
                        e.preventDefault();
                      }
                    }}
                    required
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowTelegramHelp((v) => !v)}
                  className="mt-1.5 w-full text-center text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
                >
                  {t("auth.help.telegram")}
                </button>
                {showTelegramHelp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-3 rounded-xl bg-card border border-border text-xs text-muted-foreground leading-relaxed space-y-2"
                  >
                    <p className="flex flex-wrap items-center gap-1.5">
                      {t("auth.help.telegram.step1")}{" "}
                      <a
                        href="https://t.me/userinfobot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/40 text-primary text-xs font-bold hover:bg-primary/25 hover:scale-[1.03] transition-all"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                        </svg>
                        {t("auth.help.telegram.botLink")}
                      </a>
                    </p>
                    <p>
                      {t("auth.help.telegram.step2.pre")} <span className="text-foreground font-medium">/start</span> {t("auth.help.telegram.step2.post")}
                    </p>
                    <p>
                      {t("auth.help.telegram.step3.pre")} <span className="text-foreground font-medium">ID: 123456789</span> {t("auth.help.telegram.step3.post")}
                    </p>
                    <p>
                      {t("auth.help.telegram.step4")}
                    </p>
                    <p className="text-primary font-semibold">
                      {t("auth.help.telegram.warning")}
                    </p>
                  </motion.div>
                )}
              </div>
            )}
            <div className="input-gold-shimmer rounded-xl">
              <input
                type="email"
                name="email"
                id="auth-email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                inputMode="email"
                placeholder={t("auth.placeholder.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
            </div>
            <div className="input-gold-shimmer rounded-xl">
              <input
                type="password"
                name="password"
                id="auth-password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                placeholder={t("auth.placeholder.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className={inputClass}
              />
            </div>

            {error && (
              <p className="text-destructive text-sm text-center animate-fade-in">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold tracking-wide hover:scale-[1.02] transition-all duration-200 disabled:opacity-50"
            >
              {submitting ? t("auth.btn.wait") : isSignUp ? t("auth.btn.createAccount") : t("auth.btn.signin")}
            </button>

            {!isSignUp && (
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="w-full text-center text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
              >
                {t("auth.btn.forgot")}
              </button>
            )}
          </form>

          <ForgotPasswordDialog open={showForgot} onClose={() => setShowForgot(false)} defaultEmail={email} />

          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
          >
            {isSignUp ? t("auth.switch.toSignin") : t("auth.switch.toSignup")}
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default Auth;
