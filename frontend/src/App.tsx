import { useState, useEffect, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import CheckIn from "./pages/CheckIn";
import CustomerFeedback from "./pages/CustomerFeedback";
import Inventory from "./pages/Inventory";
import Journey from "./pages/Journey";
import Copilot from "./pages/Copilot";
import Summary from "./pages/Summary";
import LostSales from "./pages/LostSales";
import Performance from "./pages/Performance";
import Insights from "./pages/Insights";
import Login from "./pages/Login";
import OwnerAnalytics from "./pages/OwnerAnalytics";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}

function AppShell({ isDark, onToggleDark }: { isDark: boolean; onToggleDark: () => void }) {
  const location = useLocation();
  const { user, isLoading } = useAuth();
  const isLoginPage = location.pathname === "/login";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-primary/20" />
          <p className="text-sm text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  if (!user && !isLoginPage) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (user && isLoginPage) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={`min-h-screen bg-background text-foreground ${isDark ? "dark" : ""}`}>
      {!isLoginPage && user && <Sidebar isDark={isDark} onToggleDark={onToggleDark} />}
      <main className={isLoginPage ? "min-h-screen" : "ml-64 min-h-screen"}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <Dashboard />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/check-in"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <CheckIn />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/customer-feedback"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <CustomerFeedback />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/inventory"
              element={
                <ProtectedRoute roles={["manager", "owner"]}>
                  <PageTransition>
                    <Inventory />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/journey"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <Journey />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/journey/:id"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <Journey />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/copilot"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <Copilot />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/summary"
              element={
                <ProtectedRoute>
                  <PageTransition>
                    <Summary />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/lost-sales"
              element={
                <ProtectedRoute roles={["manager", "owner"]}>
                  <PageTransition>
                    <LostSales />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/performance"
              element={
                <ProtectedRoute roles={["manager", "owner"]}>
                  <PageTransition>
                    <Performance />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/insights"
              element={
                <ProtectedRoute roles={["manager", "owner"]}>
                  <PageTransition>
                    <Insights />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route
              path="/owner-analytics"
              element={
                <ProtectedRoute roles={["owner"]}>
                  <PageTransition>
                    <OwnerAnalytics />
                  </PageTransition>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function App() {
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    return saved ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(isDark));
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppShell isDark={isDark} onToggleDark={() => setIsDark(!isDark)} />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
