import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <img src={logo} alt="SheX Logo" className="w-24 h-24 mb-8" />
      <h1 className="gold-gradient-text text-3xl md:text-4xl font-bold text-center mb-4">
        Willkommen bei SheX
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-10">
        Dein Coaching Dashboard
      </p>
      <Button
        size="lg"
        className="gold-glow hover:gold-glow-strong text-lg px-10"
        onClick={() => navigate(user ? "/dashboard" : "/auth")}
      >
        {user ? "Zum Dashboard" : "Jetzt einloggen"}
      </Button>
    </div>
  );
};

export default Index;
