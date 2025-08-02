
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CRMNotifications } from "@/components/CRMNotifications";
import { CRMActivityTimeline } from "@/components/CRMActivityTimeline";
import { SmartReminders } from "@/components/SmartReminders";
import { SalesExecutiveDashboard } from "@/components/SalesExecutiveDashboard";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import ClientsNew from "./pages/ClientsNew";
import Projects from "./pages/Projects";
import ProjectFiles from "./pages/ProjectFiles";
import FinancesNew from "./pages/FinancesNew";
import Accounting from "./pages/Accounting";
import ProgressOverview from "./pages/ProgressOverview";
import Sales from "./pages/Sales";
import UserManagement from "./pages/UserManagement";
import Design from "./pages/Design";
import DesignIndex from "./pages/DesignIndex";
import SuppliersNew from "./pages/SuppliersNew";
import ClientPortal from "./pages/ClientPortal";
import CommercialAlliances from "./pages/CommercialAlliances";
import PendingApproval from "./components/PendingApproval";
import { UserOnboarding } from "./components/UserOnboarding";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isApproved, needsOnboarding } = useAuth();

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
    return <UserOnboarding user={user} onComplete={() => window.location.reload()} />;
  }

  // Show pending approval screen for non-approved users
  if (!isApproved) {
    return <PendingApproval />;
  }

  return <>{children}</>;
}

function ClientProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isApproved, needsOnboarding } = useAuth();

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
    return <UserOnboarding user={user} onComplete={() => window.location.reload()} />;
  }

  if (!isApproved) {
    return <PendingApproval />;
  }

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
              path="/projects" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <Projects />
                  </Layout>
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/project-files" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProjectFiles />
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
              path="/progress-overview" 
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProgressOverview />
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
                path="/commercial-alliances" 
                element={
                  <ProtectedRoute>
                    <Layout>
                      <CommercialAlliances />
                    </Layout>
                  </ProtectedRoute>
                } 
              />
             <Route 
               path="/design" 
               element={
                 <ProtectedRoute>
                   <Layout>
                     <DesignIndex />
                   </Layout>
                 </ProtectedRoute>
               } 
             />
             <Route 
               path="/design/:projectId" 
               element={
                 <ProtectedRoute>
                   <Layout>
                     <Design />
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
             {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
             <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
