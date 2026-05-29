import { useState, useEffect, useCallback, useRef } from "react";
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
  "w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-transparent hover:border-primary/25 transition-all duration-300";

const Auth = () => {
  const { user, loading, signUp, signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [groupName, setGroupName] = useState("");
  const [telegramId, setTelegramId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  const [showGroupHelp, setShowGroupHelp] = useState(false);
  const [showTelegramHelp, setShowTelegramHelp] = useState(false);
  const [showGroupConfirm, setShowGroupConfirm] = useState(false);
  const [showTelegramConfirm, setShowTelegramConfirm] = useState(false);
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
      if (!groupName.trim()) {
        setError("Bitte gib deinen Gruppennamen ein.");
        return;
      }
      const cleanedTgId = telegramId.replace(/\s+/g, "");
      if (!/^\d{5,}$/.test(cleanedTgId)) {
        setError("Bitte gib eine gültige Telegram-ID ein (nur Zahlen, mindestens 5 Stellen).");
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
      setError(translateError(error.message));
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
    const { error } = await signUp(email, password, { group_name: groupName.trim() });
    if (error) {
      setError(translateError(error.message));
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
            <h3 className="text-lg font-bold text-foreground text-center">Ist das dein Gruppenname?</h3>
            <div className="text-center py-3 px-4 rounded-xl bg-muted border border-border">
              <span className="text-foreground font-semibold text-base">{groupName.trim()}</span>
            </div>
            <p className="text-muted-foreground text-xs text-center leading-relaxed">
              Bitte checke nochmal in deiner <span className="text-foreground font-medium">WhatsApp-Gruppe</span>, ob der Name exakt übereinstimmt. Der korrekte Gruppenname ist wichtig für deine Abrechnung.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowGroupConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                Nein, ändern
              </button>
              <button
                type="button"
                onClick={handleConfirmGroup}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:scale-[1.02] transition-all"
              >
                Ja, stimmt!
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
            <h3 className="text-lg font-bold text-foreground text-center">Ist das deine Telegram-ID?</h3>
            <div className="text-center py-3 px-4 rounded-xl bg-muted border border-border">
              <span className="text-foreground font-semibold text-base font-mono">{telegramId.replace(/\s+/g, "")}</span>
            </div>
            <p className="text-muted-foreground text-xs text-center leading-relaxed">
              Bitte <span className="text-foreground font-medium">double-checke</span> deine Telegram-ID. Du kannst nur abgerechnet werden, wenn die ID korrekt ist – sonst können wir dich nicht zuordnen.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowTelegramConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                Nein, ändern
              </button>
              <button
                type="button"
                onClick={handleConfirmSignUp}
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {submitting ? "Bitte warten..." : "Ja, stimmt!"}
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
          className="w-full max-w-sm relative z-10"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <h1 className="text-gold-gradient-shimmer text-2xl font-bold text-center tracking-tight leading-tight mb-2">
            {isSignUp ? "Erstelle ein kostenloses Konto bei SheX" : "Willkommen zurück"}
          </h1>
          <p className="text-muted-foreground text-sm text-center mb-7">
            {isSignUp ? "Erstelle dein kostenloses Konto, um deinen Account zu bekommen und damit Geld zu verdienen." : "Melde dich an, um weiterzumachen"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <div className="input-gold-shimmer rounded-xl">
                  <input
                    type="text"
                    name="group_name"
                    id="signup-group-name"
                    autoComplete="off"
                    placeholder="Gruppenname (Beispiel: Max Mustermann)"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowGroupHelp((v) => !v)}
                  className="mt-1.5 w-full text-center text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
                >
                  Wo finde ich meinen Gruppennamen?
                </button>
                {showGroupHelp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-3 rounded-xl bg-card border border-border text-xs text-muted-foreground leading-relaxed space-y-2"
                  >
                    <p>
                      Wir haben mit dir eine <span className="text-foreground font-medium">WhatsApp-Gruppe</span> eröffnet. Den Gruppennamen findest du direkt oben in der Gruppe – kopiere ihn einfach 1:1 und füge ihn hier ein.
                    </p>
                    <p className="text-primary font-semibold">
                      ⚠️ Es ist extrem wichtig, dass du den richtigen Gruppennamen angibst, damit du korrekt abgerechnet werden kannst!
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
                    placeholder="Telegram-ID"
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
                  Wo finde ich meine Telegram-ID?
                </button>
                {showTelegramHelp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 p-3 rounded-xl bg-card border border-border text-xs text-muted-foreground leading-relaxed space-y-2"
                  >
                    <p className="flex flex-wrap items-center gap-1.5">
                      1. Öffne Telegram und starte den Bot{" "}
                      <a
                        href="https://t.me/userinfobot"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/15 border border-primary/40 text-primary text-xs font-bold hover:bg-primary/25 hover:scale-[1.03] transition-all"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                        </svg>
                        Hier klicken – @userinfobot
                      </a>
                    </p>
                    <p>
                      2. Tippe <span className="text-foreground font-medium">/start</span> und schicke es ab.
                    </p>
                    <p>
                      3. Du bekommst eine Antwort mit <span className="text-foreground font-medium">ID: 123456789</span> — klicke einmal auf die Zahl neben „ID:“. Damit ist sie automatisch kopiert.
                    </p>
                    <p>
                      4. Füge sie einfach hier in das Feld ein.
                    </p>
                    <p className="text-primary font-semibold">
                      ⚠️ Nur Zahlen, kein @username – die ID brauchen wir für deine Benachrichtigungen.
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
                placeholder="E-Mail Adresse"
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
                placeholder="Passwort (min. 6 Zeichen)"
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
