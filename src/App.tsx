import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PlanProvider } from '@/contexts/PlanContext';
import { BusinessProvider } from '@/contexts/BusinessContext';
import BusinessThemeProvider from '@/contexts/BusinessThemeProvider';
import BusinessDashboard from './pages/business/BusinessDashboard';
import BusinessMembers from './pages/business/BusinessMembers';
import BusinessSettings from './pages/business/BusinessSettings';
import BusinessMemberDashboard from './pages/business/BusinessMemberDashboard';
import BusinessJoin from './pages/business/BusinessJoin';
import BusinessPayments from './pages/business/BusinessPayments';
import BusinessPortfolios from './pages/business/BusinessPortfolios';
import BusinessAnalytics from './pages/business/BusinessAnalytics';
import { useEffect } from 'react';
import { getLoginRedirectUrl } from '@/utils/authUtils';
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Portfolios from "./pages/Portfolios";
import Portfolio from "./pages/Portfolio";
import NFCCards from "./pages/NFCCards";
import NFCCardTypes from "./pages/NFCCardTypes";
import Analytics from "./pages/Analytics";
import NotFound from "./pages/NotFound";
import Blog from './pages/Blog';
import Article from './pages/Article';
import TemplatesAdminLogin from "./pages/TemplatesAdminLogin";
import TemplatesAdminDashboard from "./pages/TemplatesAdminDashboard";
import AdminBlog from "./pages/admin/Blog";
import AdminLegalPages from "./pages/admin/LegalPages";
import TemplateAppProxy from "./pages/TemplateAppProxy";
import Admin from "./pages/Admin";
import AdminLayout from "./components/admin/AdminLayout";
import TokenLogin from "./pages/auth/TokenLogin";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ResetPassword from "./pages/auth/ResetPassword";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminUsers from "./pages/admin/Users";
import AdminPortfolios from "./pages/admin/Portfolios";
import AdminCommandes from "./pages/admin/Commandes";
import AdminCartes from "./pages/admin/Cartes";
import NfcWaitlistPage from "./pages/admin/NfcWaitlistPage";
import AdminPaiements from "./pages/admin/Paiements";
import AdminInvoices from "./pages/admin/Invoices";
import AdminPlans from "./pages/admin/Plans";
import AdminStats from "./pages/admin/Stats";
import AdminNotifications from "./pages/admin/Notifications";
import AdminUpgrades from "./pages/admin/Upgrades";
import FinancialDashboard from "./pages/admin/FinancialDashboard";
import UpgradePlan from "./pages/UpgradePlan";
import Reabonnement from "./pages/Reabonnement";
import CheckoutPage from "./pages/Checkout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import DetailsUsers from "./pages/admin/DetailsUsers";
import UserAdmin from "./pages/admin/UserAdmin";
import ProfilsUserPage from "./pages/Profils_user";
import AccountSettings from "./pages/AccountSettings";
import APropos from "./pages/APropos";
import Carrieres from "./pages/Carrieres";
import Faq from "./pages/Faq";
import Contact from "./pages/Contact";
import Docs from "./pages/Docs";
import HistoriqueUserPaiement from "./pages/HistoriqueUserPaiement";
import PaymentSuccess from "./pages/payment/PaymentSuccess";
import PaymentError from "./pages/payment/PaymentError";
import PaymentReturn from "./pages/payment/PaymentReturn";
import PaymentPending from "./pages/payment/PaymentPending";
import PaymentCancelled from "./pages/payment/PaymentCancelled";
import WavePayments from "./pages/admin/WavePayments";
import WaveValidation from "./pages/admin/WaveValidation";
import ClientsPage from "./pages/admin/ClientsPage";
import { RequirePayment, RequireSubscription } from "@/components/auth/RequirePayment";
import PendingValidation from './pages/PendingValidation';
import RenewSubscription from './pages/RenewSubscription';
import AccountSuspended from './pages/AccountSuspended';

const queryClient = new QueryClient();

function App() {
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args: any) => {
      try {
        const resp = await originalFetch(...args);
        if (resp && resp.status === 401) {
          try {
            const cloned = resp.clone();
            const json = await cloned.json().catch(() => null);
            const err = json && (json.error || json.message || '');
            if (typeof err === 'string' && err.toLowerCase().includes('invalid token')) {
              try {
                const loginUrl = getLoginRedirectUrl();
                localStorage.removeItem('token');
                window.location.href = loginUrl;
              } catch (e) { }
            }
          } catch (e) {
            // ignore parsing errors
          }
        }
        return resp;
      } catch (e) {
        // network errors, rethrow
        throw e;
      }
    };

    return () => {
      try { window.fetch = originalFetch; } catch (e) { }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PlanProvider>
            <BusinessProvider>
              <BusinessThemeProvider>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <Routes>
                    <Route path="/" element={<Landing />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/auth/token/:token" element={<TokenLogin />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/pending-validation" element={<PendingValidation />} />
                    <Route path="/renouveler" element={<RenewSubscription />} />
                    <Route path="/compte-suspendu" element={<AccountSuspended />} />
                    <Route path="/dashboard" element={<RequirePayment><RequireSubscription><Dashboard /></RequireSubscription></RequirePayment>} />
                    <Route path="/dashboard/portfolios" element={<RequirePayment><RequireSubscription><Portfolios /></RequireSubscription></RequirePayment>} />
                    <Route path="/dashboard/nfc-cards" element={<NFCCards />} />
                    <Route path="/nfc-types" element={<NFCCardTypes />} />
                    <Route path="/upgrade" element={<UpgradePlan />} />
                    <Route path="/reabonnement" element={<Reabonnement />} />
                    <Route path="/checkout" element={<CheckoutPage />} />
                    <Route path="/payment/success" element={<PaymentSuccess />} />
                    <Route path="/payment/error" element={<PaymentError />} />
                    <Route path="/payment/return" element={<PaymentReturn />} />
                    <Route path="/payment/pending" element={<PaymentPending />} />
                    <Route path="/payment/cancelled" element={<PaymentCancelled />} />
                    <Route path="/dashboard/analytics/:portfolioId" element={<RequirePayment><RequireSubscription><Analytics /></RequireSubscription></RequirePayment>} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/admin/sama_connection_page" element={<AdminLogin />} />
                    {/* Admin layout with persistent vertical sidebar */}
                    <Route element={<AdminLayout />}>
                      <Route path="/admin/dashboard" element={<AdminDashboard />} />
                      <Route path="/admin/users" element={<AdminUsers />} />
                      <Route path="/admin/users-admin" element={<UserAdmin />} />
                      <Route path="/admin/users/:id" element={<DetailsUsers />} />
                      <Route path="/admin/portfolios" element={<AdminPortfolios />} />
                      <Route path="/admin/commandes" element={<AdminCommandes />} />
                      <Route path="/admin/plans" element={<AdminPlans />} />
                      <Route path="/admin/cartes" element={<AdminCartes />} />
                      <Route path="/admin/nfc-waitlist" element={<NfcWaitlistPage />} />
                      <Route path="/admin/paiements" element={<AdminPaiements />} />
                      <Route path="/admin/wave-payments" element={<WavePayments />} />
                      <Route path="/admin/wave-validation" element={<WaveValidation />} />
                      <Route path="/admin/invoices" element={<AdminInvoices />} />
                      <Route path="/admin/blog" element={<AdminBlog />} />
                      <Route path="/admin/pages" element={<AdminLegalPages />} />
                      <Route path="/admin/notifications" element={<AdminNotifications />} />
                      <Route path="/admin/stats" element={<AdminStats />} />
                      <Route path="/admin/upgrades" element={<AdminUpgrades />} />
                      <Route path="/admin/finance" element={<FinancialDashboard />} />
                      <Route path="/admin/clients" element={<ClientsPage />} />
                    </Route>
                    <Route path="/dashboard/profile" element={<RequirePayment><RequireSubscription><ProfilsUserPage /></RequireSubscription></RequirePayment>} />
                    <Route path="/dashboard/settings" element={<AccountSettings />} />
                    <Route path="/dashboard/paiements" element={<RequirePayment><RequireSubscription><HistoriqueUserPaiement /></RequireSubscription></RequirePayment>} />
                    <Route path="/templates-gestion/login" element={<TemplatesAdminLogin />} />
                    <Route path="/templates-gestion/dashboard" element={<TemplatesAdminDashboard />} />
                    <Route path="/Tempate-Portefolio/*" element={<TemplateAppProxy />} />
                    <Route path="/portfolio/:slug" element={<Portfolio />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/blog/:slug" element={<Article />} />
                    <Route path="/apropos" element={<APropos />} />
                    <Route path="/carrieres" element={<Carrieres />} />
                    <Route path="/faq" element={<Faq />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/docs" element={<Docs />} />
                    {/* Business plan routes */}
                    <Route path="/business/join" element={<BusinessJoin />} />
                    <Route path="/business/dashboard" element={<BusinessDashboard />} />
                    <Route path="/business/members" element={<BusinessMembers />} />
                    <Route path="/business/settings" element={<BusinessSettings />} />
                    <Route path="/business/member" element={<BusinessMemberDashboard />} />
                    <Route path="/business/portfolios" element={<BusinessPortfolios />} />
                    <Route path="/business/analytics" element={<BusinessAnalytics />} />
                    <Route path="/business/payments" element={<BusinessPayments />} />
                    <Route path="/business/profile" element={<ProfilsUserPage />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </TooltipProvider>
              </BusinessThemeProvider>
            </BusinessProvider>
          </PlanProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;