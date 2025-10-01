import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { AlertNotification } from "@/components/calendar/AlertNotification";
import { ClientProjectAlertNotification } from "@/components/calendar/ClientProjectAlertNotification";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ClientsNew from "./pages/ClientsNew";
import Calendar from "./pages/Calendar";


import FinancesNew from "./pages/FinancesNew";
import Accounting from "./pages/Accounting";
import Sales from "./pages/Sales";
import UserManagement from "./pages/UserManagement";
import Design from "./pages/Design";
import { Construction } from "./pages/Construction";
import ClientPortalPreview from "./pages/ClientPortalPreview";


import SuppliersNew from "./pages/SuppliersNew";
import ClientPortal from "./pages/ClientPortal";
import UnifiedTransactions from "./pages/UnifiedTransactions";
import TestTransactionForm from "./pages/TestTransactionForm";
import PresupuestosPlaneacion from "./pages/PresupuestosPlaneacion";
import CronogramaGanttV2 from "./pages/planeacion/CronogramaGanttV2";
import { PLANNING_V2_ENABLED } from "./modules/planning_v2/config/featureFlag";
import PlanningV2Index from "./modules/planning_v2/pages/PlanningV2Index";
import BudgetDetail from "./modules/planning_v2/pages/BudgetDetail";

import PendingApproval from "./components/PendingApproval";
import { UserOnboarding } from "./components/UserOnboarding";
import NotFound from "./pages/NotFound";
import { ScrollToTop } from "@/components/navigation/ScrollToTop";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isApproved, needsOnboarding, profile } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show onboarding if user needs to complete profile
  if (needsOnboarding) {
    return <UserOnboarding user={user} profile={profile} onComplete={() => {
      navigate('/dashboard');
    }} />;
  }

  // Show pending approval screen for non-approved users
  if (!isApproved) {
    return <PendingApproval />;
  }

  return <>{children}</>;
}

function ClientProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isApproved, needsOnboarding, profile } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Show onboarding if user needs to complete profile
  if (needsOnboarding) {
    return <UserOnboarding user={user} profile={profile} onComplete={() => {
      navigate('/dashboard');
    }} />;
  }

  if (!isApproved) {
    return <PendingApproval />;
  }

  return <>{children}</>;
}

/**
 * Safety net component to cleanup stuck overlays and states
 */
function SafetyNetCleanup() {
  const location = useLocation();

  useEffect(() => {
    // Cleanup function to remove any stuck overlays and restore interactivity
    const cleanup = () => {
      // Remove any stuck dialog/alert overlays
      document
        .querySelectorAll('[data-radix-alert-dialog-overlay], [data-radix-dialog-overlay]')
        .forEach(el => el.remove());
      
      // Remove aria-hidden from any elements that might be blocking interaction
      document
        .querySelectorAll('[aria-hidden="true"]')
        .forEach(el => {
          // Only remove aria-hidden from body and root-level elements
          if (el === document.body || el.id === 'root' || el.parentElement === document.body) {
            el.removeAttribute('aria-hidden');
          }
        });
      
      // Ensure pointer events are enabled
      document.body.style.pointerEvents = '';
      document.documentElement.style.pointerEvents = '';
      const root = document.getElementById('root');
      if (root) {
        root.style.pointerEvents = '';
      }
    };

    // Run cleanup on route change (after a small delay to let dialogs close naturally)
    const timeoutId = setTimeout(cleanup, 100);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(timeoutId);
      cleanup();
    };
  }, [location.pathname]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <SafetyNetCleanup />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/calendar" 
              element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/clients" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <ClientsNew />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/finances" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <FinancesNew />
                  </Layout>
                </ProtectedRoute>
              } 
            />
          <Route
            path="/accounting"
            element={
              <ProtectedRoute>
                <Layout>
                  <Accounting />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute>
                <Layout>
                  <SuppliersNew />
                </Layout>
              </ProtectedRoute>
            }
          />
            <Route 
              path="/sales" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Sales />
                  </Layout>
                </ProtectedRoute>
              } 
            />
             <Route 
               path="/user-management" 
               element={
                 <ProtectedRoute>
                   <Layout>
                     <UserManagement />
                   </Layout>
                 </ProtectedRoute>
                } 
              />
          <Route 
            path="/design" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Design />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/presupuestos-planeacion" 
            element={
              <ProtectedRoute>
                <Layout>
                  <PresupuestosPlaneacion />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cronograma-gantt-v2" 
            element={
              <ProtectedRoute>
                <Layout>
                  <CronogramaGanttV2 />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/construction" 
            element={
              <ProtectedRoute>
                <Layout>
                  <Construction />
                </Layout>
              </ProtectedRoute>
            } 
          />
             <Route 
               path="/client-portal" 
               element={
                 <ClientProtectedRoute>
                   <ClientPortal />
                 </ClientProtectedRoute>
               } 
             />
             <Route 
               path="/client-portal-preview" 
               element={
                 <ProtectedRoute>
                   <Layout>
                     <ClientPortalPreview />
                   </Layout>
                 </ProtectedRoute>
               } 
             />
             <Route 
               path="/unified-transactions" 
               element={
                 <ProtectedRoute>
                   <Layout>
                     <UnifiedTransactions />
                   </Layout>
                 </ProtectedRoute>
               } 
             />
             <Route 
               path="/test-transaction-form" 
               element={
                 <ProtectedRoute>
                   <Layout>
                     <TestTransactionForm />
                   </Layout>
                 </ProtectedRoute>
               } 
             />
             
             {/* Planning v2 routes - conditionally rendered based on feature flag */}
             {PLANNING_V2_ENABLED && (
               <>
                 <Route 
                   path="/planning-v2" 
                   element={
                     <ProtectedRoute>
                       <Layout>
                         <PlanningV2Index />
                       </Layout>
                     </ProtectedRoute>
                   } 
                 />
                 <Route 
                   path="/planning-v2/budgets/:id" 
                   element={
                     <ProtectedRoute>
                       <Layout>
                         <BudgetDetail />
                       </Layout>
                     </ProtectedRoute>
                   } 
                 />
               </>
             )}
             
             {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
           </Routes>
         </BrowserRouter>
          <AlertNotification />
          <ClientProjectAlertNotification />
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
