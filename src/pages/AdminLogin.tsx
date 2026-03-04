import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Lock, KeyRound, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

const AdminLogin = () => {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"login" | "totp" | "setup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [setupData, setSetupData] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [totpVerified, setTotpVerified] = useState(false);
  const [loginCompleted, setLoginCompleted] = useState(false);

  // Only check admin status AFTER explicit login on this page
  useEffect(() => {
    if (!user || !loginCompleted) return;
    
    const checkAdmin = async () => {
      const { data } = await supabase.rpc("is_admin");
      if (!data) {
        setError("Kein Admin-Zugang. Du hast keine Berechtigung.");
        setIsAdmin(false);
        return;
      }
      setIsAdmin(true);

      // Check TOTP status
      const { data: totpData } = await supabase
        .from("admin_totp_secrets" as any)
        .select("is_verified")
        .eq("user_id", user.id)
        .maybeSingle();

      if (totpData && (totpData as any).is_verified) {
        setStep("totp");
      } else {
        setStep("setup");
        await initTotpSetup();
      }
    };

    checkAdmin();
  }, [user, loginCompleted]);

  // If admin verified TOTP, redirect
  useEffect(() => {
    if (totpVerified) {
      sessionStorage.setItem("admin_2fa_verified", Date.now().toString());
      navigate("/admin", { replace: true });
    }
  }, [totpVerified, navigate]);

  const initTotpSetup = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await supabase.functions.invoke("admin-totp-setup", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) {
        const body = res.data;
        if (body?.already_setup) {
          setStep("totp");
          return;
        }
        throw new Error(body?.error || "Setup fehlgeschlagen");
      }

      setSetupData(res.data);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const { error } = await signIn(email, password);
    if (error) {
      setError(
        error.message.includes("Invalid login")
          ? "E-Mail oder Passwort ist falsch."
          : error.message
      );
    } else {
      setLoginCompleted(true);
    }
    setSubmitting(false);
  };

  const handleTotpVerify = async () => {
    if (totpCode.length !== 6) return;
    setError("");
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Keine Session");

      const res = await supabase.functions.invoke("admin-totp-verify", {
        body: { token: totpCode, is_setup: step === "setup" },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error || !res.data?.valid) {
        setError(res.data?.error || "Ungültiger Code. Versuche es erneut.");
        setTotpCode("");
      } else {
        if (step === "setup") {
          toast.success("2FA erfolgreich eingerichtet!");
        }
        setTotpVerified(true);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If user is logged in but not admin, show error
  if (user && isAdmin === false) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
        <Shield className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-xl font-bold text-foreground mb-2">Zugriff verweigert</h1>
        <p className="text-muted-foreground text-sm text-center mb-6">
          Du hast keine Admin-Berechtigung.
        </p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>
          Zum Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo & Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <img src={logo} alt="SheX Logo" className="w-16 h-16 rounded-full" />
            <div className="absolute -bottom-1 -right-1 bg-accent rounded-full p-1">
              <Shield className="h-4 w-4 text-accent-foreground" />
            </div>
          </div>
          <h1 className="gold-gradient-text text-2xl font-bold tracking-tight">
            Admin-Zugang
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Geschützter Bereich – Zwei-Faktor-Authentifizierung
          </p>
        </div>

        {/* Step 1: Login */}
        {step === "login" && !user && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Input
                type="email"
                placeholder="Admin E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
              />
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 pr-10"
              />
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <p className="text-destructive text-sm text-center animate-fade-in">{error}</p>
            )}

            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Anmelden..." : "Admin-Login"}
            </Button>
          </form>
        )}

        {/* Step 2: TOTP Setup */}
        {step === "setup" && setupData && (
          <div className="space-y-6 text-center">
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-sm font-semibold text-foreground mb-3">
                2FA einrichten
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Scanne den QR-Code mit deiner Authenticator-App (Google Authenticator, Authy, etc.)
              </p>
              
              {/* QR Code via external API */}
              <div className="flex justify-center mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otpauth_url)}`}
                  alt="TOTP QR Code"
                  className="rounded-lg border border-border"
                  width={200}
                  height={200}
                />
              </div>

              <div className="bg-muted rounded-lg p-3 mb-4">
                <p className="text-[10px] text-muted-foreground mb-1">Manueller Schlüssel:</p>
                <p className="text-xs font-mono text-foreground break-all select-all">
                  {setupData.secret}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-3">
                Gib den 6-stelligen Code aus deiner App ein:
              </p>
              <div className="flex justify-center mb-4">
                <InputOTP
                  maxLength={6}
                  value={totpCode}
                  onChange={setTotpCode}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {error && (
                <p className="text-destructive text-sm text-center mb-3 animate-fade-in">{error}</p>
              )}

              <Button
                onClick={handleTotpVerify}
                disabled={totpCode.length !== 6 || submitting}
                className="w-full"
              >
                {submitting ? "Prüfe..." : "2FA aktivieren & bestätigen"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: TOTP Verify (returning admin) */}
        {step === "totp" && user && (
          <div className="space-y-6 text-center">
            <div className="bg-card border border-border rounded-xl p-6">
              <Shield className="h-10 w-10 text-accent mx-auto mb-3" />
              <h2 className="text-sm font-semibold text-foreground mb-1">
                Zwei-Faktor-Authentifizierung
              </h2>
              <p className="text-xs text-muted-foreground">
                Gib den Code aus deiner Authenticator-App ein.
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={totpCode}
                onChange={setTotpCode}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {error && (
              <p className="text-destructive text-sm text-center animate-fade-in">{error}</p>
            )}

            <Button
              onClick={handleTotpVerify}
              disabled={totpCode.length !== 6 || submitting}
              className="w-full"
            >
              {submitting ? "Prüfe..." : "Bestätigen"}
            </Button>
          </div>
        )}

        {/* Loading state while checking admin */}
        {user && isAdmin === null && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
