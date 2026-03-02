import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const Auth = () => {
  const { user, loading, signUp, signIn } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

    const { error } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    if (error) {
      setError(error.message);
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <img src={logo} alt="SheX Logo" className="w-20 h-20 rounded-full mb-8" />

      <h1 className="gold-gradient-text text-2xl md:text-3xl font-bold text-center tracking-tight leading-tight mb-2 max-w-md">
        Erstelle ein kostenloses Konto bei SheX
      </h1>
      <p className="text-muted-foreground text-sm text-center max-w-sm mb-8">
        damit du deinen Fortschritt im Coaching speichern kannst
      </p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div>
          <input
            type="email"
            placeholder="E-Mail Adresse"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Passwort (min. 6 Zeichen)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
          />
        </div>

        {error && (
          <p className="text-destructive text-sm text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold tracking-wide gold-glow hover:gold-glow-strong hover:scale-[1.02] transition-all duration-300 disabled:opacity-50"
        >
          {submitting ? "Bitte warten..." : isSignUp ? "Konto erstellen" : "Anmelden"}
        </button>
      </form>

      <button
        onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
        className="mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {isSignUp ? "Bereits ein Konto? Hier anmelden" : "Noch kein Konto? Hier registrieren"}
      </button>
    </div>
  );
};

export default Auth;
