import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ShieldCheck, Sparkles, LogIn, Crown, UserCog, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const demoAccounts = [
  { role: "Owner", email: "owner@demo.local", password: "owner123", icon: Crown },
  { role: "Manager", email: "manager@demo.local", password: "manager123", icon: UserCog },
  { role: "Salesperson", email: "salesperson@demo.local", password: "sales123", icon: User },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState("owner@demo.local");
  const [password, setPassword] = useState("owner123");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from || "/";

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
      toast.success("Welcome back.");
      navigate(from, { replace: true });
    } catch (error) {
      toast.error("Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(15,23,42,0.92),_rgba(2,6,23,1)_50%,_rgba(15,23,42,1))] px-4 py-10 text-white">
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl grid-cols-1 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl backdrop-blur md:grid-cols-[1.1fr_0.9fr]">
        <div className="relative flex flex-col justify-between p-8 md:p-12">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm">
              <ShieldCheck className="h-4 w-4" />
              Role-based access for dealership teams
            </div>
            <div className="space-y-4">
              <h1 className="max-w-xl text-4xl font-black leading-tight md:text-6xl">
                Simple sign-in.
                <br />
                Owner-level intelligence.
              </h1>
              <p className="max-w-2xl text-base text-white/75 md:text-lg">
                One login flow for owner, manager, and salesperson. Each role sees the right depth of data, from customer capture to AI analytics and performance review.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {demoAccounts.map((account) => {
              const Icon = account.icon;
              return (
                <button
                  key={account.role}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(account.password);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/8 p-4 text-left transition hover:bg-white/12"
                >
                  <Icon className="h-5 w-5 text-emerald-300" />
                  <p className="mt-3 font-semibold">{account.role}</p>
                  <p className="text-xs text-white/65">{account.email}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center bg-slate-950/60 p-6 md:p-10">
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-slate-900/90 p-8 shadow-2xl"
          >
            <div className="mb-8 space-y-3 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">Sign in to continue</h2>
              <p className="text-sm text-white/65">
                Use your role account to enter the dealership workspace.
              </p>
            </div>

            <div className="space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-white/85">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none ring-0 placeholder:text-white/35 focus:border-primary"
                  placeholder="owner@demo.local"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-white/85">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none ring-0 placeholder:text-white/35 focus:border-primary"
                  placeholder="••••••••"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LogIn className="h-4 w-4" />
                {isSubmitting ? "Signing in..." : "Sign in"}
              </button>
            </div>

            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
              <p className="font-semibold text-white/90">Demo credentials</p>
              <p className="mt-1">Owner: owner@demo.local / owner123</p>
              <p>Manager: manager@demo.local / manager123</p>
              <p>Salesperson: salesperson@demo.local / sales123</p>
            </div>
          </motion.form>
        </div>
      </div>
    </div>
  );
}
