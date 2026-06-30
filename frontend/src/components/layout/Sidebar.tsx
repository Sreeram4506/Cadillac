import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  UserCheck,
  FileText,
  Car,
  Clock,
  Route,
  Bot,
  MessageSquare,
  TrendingDown,
  Users,
  Sparkles,
  Moon,
  Sun,
} from "lucide-react";

interface NavItem {
  title: string;
  href: string;
  icon: any;
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Customer Check-In", href: "/check-in", icon: UserCheck },
  { title: "Customer Feedback", href: "/customer-feedback", icon: FileText },
  { title: "Inventory", href: "/inventory", icon: Car },
  { title: "Appointments", href: "/check-in#appointments", icon: Clock },
  { title: "Customer Journey", href: "/journey", icon: Route },
  { title: "AI Sales Copilot", href: "/copilot", icon: Bot },
  { title: "Conversation Summary", href: "/summary", icon: MessageSquare },
  { title: "Lost Sale Analysis", href: "/lost-sales", icon: TrendingDown },
  { title: "Salesperson Performance", href: "/performance", icon: Users },
  { title: "AI Insights", href: "/insights", icon: Sparkles },
];

interface SidebarProps {
  isDark: boolean;
  onToggleDark: () => void;
}

export function Sidebar({ isDark, onToggleDark }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card p-4">
      <div className="flex h-full flex-col">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Dealership AI</h1>
            <p className="text-xs text-muted-foreground">Intelligence Platform</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const [path, hash] = item.href.split("#");
            const isActive =
              location.pathname === path &&
              ((hash && location.hash === `#${hash}`) || (!hash && !location.hash));

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.title}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border pt-4">
          <button
            onClick={onToggleDark}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {isDark ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            {isDark ? "Light Mode" : "Dark Mode"}
          </button>
        </div>
      </div>
    </aside>
  );
}
