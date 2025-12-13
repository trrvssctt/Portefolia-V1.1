
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PlanProvider } from '@/contexts/PlanContext';
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Portfolios from "./pages/Portfolios";
import Portfolio from "./pages/Portfolio";
import NFCCards from "./pages/NFCCards";
import NFCCardTypes from "./pages/NFCCardTypes";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import TemplatesAdminLogin from "./pages/TemplatesAdminLogin";
import TemplatesAdminDashboard from "./pages/TemplatesAdminDashboard";
import TemplateAppProxy from "./pages/TemplateAppProxy";
import Admin from "./pages/Admin";
import AdminUsers from "./pages/admin/Users";
import AdminPortfolios from "./pages/admin/Portfolios";
import AdminCommandes from "./pages/admin/Commandes";
import AdminCartes from "./pages/admin/Cartes";
import AdminPaiements from "./pages/admin/Paiements";
import AdminPlans from "./pages/admin/Plans";
import AdminStats from "./pages/admin/Stats";
import AdminNotifications from "./pages/admin/Notifications";
import AdminUpgrades from "./pages/admin/Upgrades";
import UpgradePlan from "./pages/UpgradePlan";
import CheckoutPage from "./pages/Checkout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PlanProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/portfolios" element={<Portfolios />} />
            <Route path="/dashboard/nfc-cards" element={<NFCCards />} />
            <Route path="/nfc-types" element={<NFCCardTypes />} />
            <Route path="/upgrade" element={<UpgradePlan />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/dashboard/analytics/:portfolioId" element={<Analytics />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/portfolios" element={<AdminPortfolios />} />
            <Route path="/admin/commandes" element={<AdminCommandes />} />
            <Route path="/admin/plans" element={<AdminPlans />} />
            <Route path="/admin/cartes" element={<AdminCartes />} />
            <Route path="/admin/paiements" element={<AdminPaiements />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/stats" element={<AdminStats />} />
            <Route path="/admin/upgrades" element={<AdminUpgrades />} />
            <Route path="/templates-gestion/login" element={<TemplatesAdminLogin />} />
            <Route path="/templates-gestion/dashboard" element={<TemplatesAdminDashboard />} />
            <Route path="/Tempate-Portefolio/*" element={<TemplateAppProxy />} />
            <Route path="/portfolio/:slug" element={<Portfolio />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </PlanProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
