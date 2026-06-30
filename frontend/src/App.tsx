import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { Sidebar } from "@/components/layout/Sidebar";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageTransition({ children }: { children: React.ReactNode }) {
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
      <BrowserRouter>
        <div className={`min-h-screen bg-background text-foreground ${isDark ? "dark" : ""}`}>
          <Sidebar isDark={isDark} onToggleDark={() => setIsDark(!isDark)} />
          <main className="ml-64 min-h-screen">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<PageTransition><Dashboard /></PageTransition>} />
                <Route path="/check-in" element={<PageTransition><CheckIn /></PageTransition>} />
                <Route path="/customer-feedback" element={<PageTransition><CustomerFeedback /></PageTransition>} />
                <Route path="/inventory" element={<PageTransition><Inventory /></PageTransition>} />
                <Route path="/journey" element={<PageTransition><Journey /></PageTransition>} />
                <Route path="/journey/:id" element={<PageTransition><Journey /></PageTransition>} />
                <Route path="/copilot" element={<PageTransition><Copilot /></PageTransition>} />
                <Route path="/summary" element={<PageTransition><Summary /></PageTransition>} />
                <Route path="/lost-sales" element={<PageTransition><LostSales /></PageTransition>} />
                <Route path="/performance" element={<PageTransition><Performance /></PageTransition>} />
                <Route path="/insights" element={<PageTransition><Insights /></PageTransition>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AnimatePresence>
          </main>
          <Toaster position="top-right" richColors />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
