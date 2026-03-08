import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Onboarding from "./pages/Onboarding";
import Quiz from "./pages/Quiz";
import OfferA from "./pages/OfferA";
import OfferB from "./pages/OfferB";
import OfferC from "./pages/OfferC";
import Dashboard from "./pages/Dashboard";
import AdminNotifications from "./pages/AdminNotifications";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Invoice from "./pages/Invoice";
import ModelLogin from "./pages/ModelLogin";
import ModelDashboard from "./pages/ModelDashboard";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/admin/login" replace />;
  
  const verified = sessionStorage.getItem("admin_2fa_verified");
  const isValid = verified && (Date.now() - parseInt(verified)) < 8 * 60 * 60 * 1000;
  
  if (!isValid) return <Navigate to="/admin/login" replace />;
  
  return <>{children}</>;
};

const ModelProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [isModel, setIsModel] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (!user) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "model").maybeSingle()
        .then(({ data }) => setIsModel(!!data));
    });
  }, [user]);
  
  if (loading || (user && isModel === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/model/login" replace />;
  if (isModel === false) return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/offer-a" element={<OfferA />} />
            <Route path="/offer-b" element={<OfferB />} />
            <Route path="/offer-c" element={<OfferC />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/notifications" element={<AdminProtectedRoute><AdminNotifications /></AdminProtectedRoute>} />
            <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
            <Route path="/rechnung" element={<ProtectedRoute><Invoice /></ProtectedRoute>} />
            <Route path="/model" element={<Model />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
