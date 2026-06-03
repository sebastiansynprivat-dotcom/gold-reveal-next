import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ensurePlatformsLoaded } from "@/lib/platforms";

// Plattform-Registry beim App-Start aus der DB initialisieren
ensurePlatformsLoaded();

// Lazy-loaded routes — drastically reduces initial JS bundle and TTI
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Quiz = lazy(() => import("./pages/Quiz"));
const OfferA = lazy(() => import("./pages/OfferA"));
const OfferB = lazy(() => import("./pages/OfferB"));
const OfferC = lazy(() => import("./pages/OfferC"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminNotifications = lazy(() => import("./pages/AdminNotifications"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const Auth = lazy(() => import("./pages/Auth"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Invoice = lazy(() => import("./pages/Invoice"));
const ModelLogin = lazy(() => import("./pages/ModelLogin"));
const ModelDashboard = lazy(() => import("./pages/ModelDashboard"));
const AdminModelView = lazy(() => import("./pages/AdminModelView"));
const Leaderboard = lazy(() => import("./pages/Leaderboard"));
const SocialMediaLogin = lazy(() => import("./pages/SocialMediaLogin"));
const SocialMediaDashboard = lazy(() => import("./pages/SocialMediaDashboard"));
const SocialMediaRegister = lazy(() => import("./pages/SocialMediaRegister"));
const SocialMediaContentPlans = lazy(() => import("./pages/SocialMediaContentPlans"));
const SocialMediaModelDashboard = lazy(() => import("./pages/SocialMediaModelDashboard"));
const ChatBreakdown = lazy(() => import("./pages/ChatBreakdown"));
const CoachingBasics = lazy(() => import("./pages/CoachingBasics"));
const SalesScripts = lazy(() => import("./pages/SalesScripts"));
const Library = lazy(() => import("./pages/Library"));

import AutoTranslator from "@/components/AutoTranslator";

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
  </div>
);


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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  
  useEffect(() => {
    if (!user) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.rpc("is_admin").then(({ data }) => setIsAdmin(data === true));
    });
  }, [user]);
  
  if (loading || (user && isAdmin === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user || isAdmin === false) return <Navigate to="/admin/login" replace />;
  
  const verified = localStorage.getItem("admin_2fa_verified") || sessionStorage.getItem("admin_2fa_verified");
  const isValid = verified && (Date.now() - parseInt(verified)) < 30 * 24 * 60 * 60 * 1000;
  
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
  if (isModel === false) return <Navigate to="/model/login" replace />;
  
  return <>{children}</>;
};

const SocialMediaProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.from("user_roles").select("role").eq("user_id", user.id)
        .in("role", ["fanvue_partner", "super_admin", "admin"])
        .maybeSingle()
        .then(({ data }) => setHasAccess(!!data));
    });
  }, [user]);

  if (loading || (user && hasAccess === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/socialmedia/login" replace />;
  if (hasAccess === false) return <Navigate to="/socialmedia/login" replace />;

  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AutoTranslator />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" replace /></ProtectedRoute>} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/offer-a" element={<OfferA />} />
              <Route path="/offer-b" element={<OfferB />} />
              <Route path="/offer-c" element={<OfferC />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin/notifications" element={<AdminProtectedRoute><AdminNotifications /></AdminProtectedRoute>} />
              <Route path="/admin" element={<AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>} />
              <Route path="/admin/model/:modelId/view" element={<AdminProtectedRoute><AdminModelView /></AdminProtectedRoute>} />
              <Route path="/rechnung" element={<ProtectedRoute><Invoice /></ProtectedRoute>} />
              <Route path="/model/login" element={<ModelLogin />} />
              <Route path="/model" element={<ModelProtectedRoute><ModelDashboard /></ModelProtectedRoute>} />
              <Route path="/socialmedia/login" element={<SocialMediaLogin />} />
              <Route path="/socialmedia/register" element={<SocialMediaRegister />} />
              <Route path="/socialmedia/admin" element={<SocialMediaProtectedRoute><SocialMediaDashboard /></SocialMediaProtectedRoute>} />
              <Route path="/socialmedia/admin/plans" element={<SocialMediaProtectedRoute><SocialMediaContentPlans /></SocialMediaProtectedRoute>} />
              <Route path="/socialmedia/model" element={<SocialMediaModelProtectedRoute><SocialMediaModelDashboard /></SocialMediaModelProtectedRoute>} />
              {/* Legacy /fanvue → /socialmedia redirects */}
              <Route path="/fanvue/login" element={<Navigate to="/socialmedia/login" replace />} />
              <Route path="/fanvue" element={<Navigate to="/socialmedia/admin" replace />} />
              <Route path="/bibliothek" element={<ProtectedRoute><Library /></ProtectedRoute>} />
              <Route path="/bibliothek/chat-breakdown-01" element={<ProtectedRoute><ChatBreakdown /></ProtectedRoute>} />
              <Route path="/bibliothek/coaching-basics" element={<ProtectedRoute><CoachingBasics /></ProtectedRoute>} />
              <Route path="/bibliothek/verkaufs-skripte" element={<ProtectedRoute><SalesScripts /></ProtectedRoute>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
