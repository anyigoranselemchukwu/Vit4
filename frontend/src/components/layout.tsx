import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  Activity,
  BarChart2,
  BookOpen,
  CheckSquare,
  Coins,
  Code2,
  CreditCard,
  Home,
  Lock,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Shield,
  ArrowLeftRight,
  Trophy,
  Vote,
  X,
  TrendingUp,
  Layers,
} from "lucide-react";
import { Button } from "./ui/button";
import { NotificationBell } from "./notification-bell";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) {
    return <>{children}</>;
  }

  const navigation = [
    { name: "Dashboard",     href: "/dashboard",    icon: Home },
    { name: "Matches",       href: "/matches",       icon: Activity },
    { name: "Predictions",   href: "/predictions",   icon: CheckSquare },
    { name: "Wallet",        href: "/wallet",        icon: Coins },
    { name: "Validators",    href: "/validators",    icon: ShieldCheck },
    { name: "Training",      href: "/training",      icon: BookOpen },
    { name: "Analytics",     href: "/analytics",     icon: BarChart2 },
    { name: "Marketplace",   href: "/marketplace",   icon: ShoppingBag },
    { name: "Trust & Safety",href: "/trust",         icon: Shield },
    { name: "Bridge",        href: "/bridge",        icon: ArrowLeftRight },
    { name: "Developer",     href: "/developer",     icon: Code2 },
    { name: "Governance",    href: "/governance",    icon: Vote },
    { name: "Accumulator",   href: "/accumulator",   icon: Layers },
    { name: "Odds Intel",    href: "/odds",           icon: TrendingUp },
    { name: "Subscription",  href: "/subscription",  icon: CreditCard },
    ...(user?.role === "admin"
      ? [{ name: "Admin Panel", href: "/admin", icon: Lock }]
      : []),
  ];

  const NavItems = ({ onClick }: { onClick?: () => void }) => (
    <>
      {navigation.map((item) => {
        const isActive = location.startsWith(item.href);
        return (
          <Link key={item.name} href={item.href}>
            <span
              onClick={onClick}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-mono font-medium transition-colors cursor-pointer ${
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent"
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {item.name}
            </span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">

      {/* ── Mobile top bar ─────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          <span className="font-bold font-mono tracking-tight text-foreground">VIT Sports</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* ── Mobile slide-over drawer ────────────────────────────────── */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Panel */}
          <div className="absolute left-0 top-0 h-full w-72 bg-sidebar border-r border-sidebar-border flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                <span className="font-bold font-mono tracking-tight">VIT Sports</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              <NavItems onClick={() => setMobileOpen(false)} />
            </nav>
            <div className="p-4 border-t border-sidebar-border">
              <div className="flex items-center justify-between px-2">
                <div>
                  <div className="text-sm font-mono font-medium text-foreground">{user.username}</div>
                  <div className="text-xs text-muted-foreground capitalize font-mono">{user.role}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={logout}>
                  <LogOut className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Desktop sidebar ─────────────────────────────────────────── */}
      <div className="hidden md:flex w-64 bg-sidebar border-r border-sidebar-border flex-shrink-0 flex-col">
        <div className="p-6 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          <span className="font-bold text-lg font-mono tracking-tight text-foreground">VIT Sports</span>
        </div>

        <nav className="flex-1 px-3 pb-4 space-y-1 overflow-y-auto">
          <NavItems />
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <div className="flex items-center justify-between px-2 mb-2">
            <div>
              <div className="text-sm font-mono font-medium text-foreground">{user.username}</div>
              <div className="text-xs text-muted-foreground capitalize font-mono">{user.role}</div>
            </div>
            <div className="flex items-center gap-1">
              <NotificationBell />
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="w-4 h-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto bg-background min-h-0">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
