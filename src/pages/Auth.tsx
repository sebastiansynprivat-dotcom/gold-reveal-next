import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.png";

const Auth = () => {
  const { user, loading, signUp, signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    if (isSignUp) {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error.message);
      } else {
        setSignUpSuccess(true);
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <motion.img
        src={logo}
        alt="SheX Logo"
        className="w-20 h-20 rounded-full mb-8"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
      />

      <AnimatePresence mode="wait">
        {signUpSuccess ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-sm space-y-4"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-3xl">✉️</span>
            </div>
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
              }}
              className="mt-4 text-sm text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
            >
              Zurück zur Anmeldung
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-sm"
          >
            <h1 className="gold-gradient-text text-2xl md:text-3xl font-bold text-center tracking-tight leading-tight mb-2">
              {isSignUp
                ? "Erstelle ein kostenloses Konto bei SheX"
                : "Willkommen zurück"}
            </h1>
            <p className="text-muted-foreground text-sm text-center mb-8">
              {isSignUp
                ? "damit du deinen Fortschritt im Coaching speichern kannst"
                : "Melde dich an, um weiterzumachen"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="E-Mail Adresse"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
              <input
                type="password"
                placeholder="Passwort (min. 6 Zeichen)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="text-destructive text-sm text-center"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold tracking-wide gold-glow hover:gold-glow-strong hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
              >
                {submitting
                  ? "Bitte warten..."
                  : isSignUp
                  ? "Konto erstellen"
                  : "Anmelden"}
              </button>
            </form>

            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center"
            >
              {isSignUp
                ? "Bereits ein Konto? Hier anmelden"
                : "Noch kein Konto? Hier registrieren"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Auth;
