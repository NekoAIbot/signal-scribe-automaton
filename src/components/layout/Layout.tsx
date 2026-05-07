import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Menu, Home, BarChart2, Bell, Settings, Users, Activity, Tv2, LogOut, Newspaper, Building2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { FloatingAIChat } from "@/components/chat/FloatingAIChat";

const NavItem = ({
  to,
  label,
  icon: Icon,
  className = "",
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ElementType;
  className?: string;
  onClick?: () => void;
}) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));

  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive: linkActive }) =>
        cn(
          "group flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 transition-all duration-200",
          linkActive
            ? "border-border bg-accent text-accent-foreground shadow-sm"
            : "text-muted-foreground hover:border-border/70 hover:bg-secondary/60 hover:text-foreground",
          className
        )
      }
      end={to === "/"}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-background/70 transition-colors group-hover:border-primary/30 group-hover:text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </NavLink>
  );
};

export function Layout() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();

  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col sm:px-4 lg:px-6">
        <div className="flex min-h-screen flex-col sm:grid sm:grid-cols-[290px_1fr] sm:gap-6 sm:py-6">
          {/* Sidebar for desktop */}
          <div className="hidden sm:sticky sm:top-6 sm:flex sm:h-[calc(100vh-3rem)] sm:flex-col sm:overflow-hidden sm:rounded-[2rem] sm:border sm:border-border/80 sm:bg-card/85 sm:backdrop-blur-xl">
            <div className="border-b border-border/70 px-6 py-6">
              <NavLink to="/" className="flex items-center gap-4 font-semibold">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                  <Activity className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[0.68rem] uppercase tracking-[0.28em] text-muted-foreground">Classical AI Desk</span>
                  <span className="text-xl font-semibold">Signal Scribe</span>
                </div>
              </NavLink>
            </div>

            <ScrollArea className="flex-grow">
              <div className="flex h-full flex-col gap-4 p-4">
                <nav className="grid gap-1 px-2">
                  <NavItem to="/" label="Dashboard" icon={Home} />
                  <NavItem to="/signals" label="Signals" icon={Tv2} />
                  <NavItem to="/analytics" label="Analytics" icon={BarChart2} />
                  <NavItem to="/alerts" label="Alerts" icon={Bell} />
                  <NavItem to="/monitoring" label="Monitoring" icon={Activity} />
                  <NavItem to="/audit-log" label="Audit Log" icon={FileText} />
                  <NavItem to="/prop-accounts" label="Prop Accounts" icon={Building2} />
                  <NavItem to="/news" label="Forex News" icon={Newspaper} />
                  <NavItem to="/admin" label="Admin" icon={Users} />
                  <NavItem to="/settings" label="Settings" icon={Settings} />
                </nav>

                <div className="mt-auto space-y-4 px-2 pt-2">
                  <div className="rounded-2xl border border-border/70 bg-secondary/50 p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-muted-foreground">Execution mode</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      Live market analysis, broker-linked execution, and curated AI model selection in one trading workspace.
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Mobile header */}
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border/70 bg-background/85 px-4 backdrop-blur sm:hidden">
            <Button
              variant="outline"
              size="icon"
              className="sm:hidden"
              onClick={() => setShowMobileMenu(true)}
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Activity className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">Classical AI Desk</span>
                <span className="text-lg font-semibold">Signal Scribe</span>
              </div>
            </div>
          </header>

          {/* Mobile menu */}
          <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
            <SheetContent side="left" className="w-[290px] border-border bg-card p-0 sm:w-[290px]">
              <div className="flex flex-col h-full">
                <div className="flex h-20 items-center gap-4 border-b border-border px-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                    <Activity className="h-6 w-6" />
                  </div>
                  <NavLink to="/" className="flex flex-col font-semibold">
                    <span className="text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">Classical AI Desk</span>
                    <span className="text-xl font-semibold">Signal Scribe</span>
                  </NavLink>
                </div>
                <ScrollArea className="flex-grow">
                  <div className="p-4 grid gap-2">
                    <NavItem to="/" label="Dashboard" icon={Home} onClick={() => setShowMobileMenu(false)} />
                    <NavItem to="/signals" label="Signals" icon={Tv2} onClick={() => setShowMobileMenu(false)} />
                    <NavItem to="/analytics" label="Analytics" icon={BarChart2} onClick={() => setShowMobileMenu(false)} />
                    <NavItem to="/alerts" label="Alerts" icon={Bell} onClick={() => setShowMobileMenu(false)} />
                    <NavItem to="/monitoring" label="Monitoring" icon={Activity} onClick={() => setShowMobileMenu(false)} />
                    <NavItem to="/audit-log" label="Audit Log" icon={FileText} onClick={() => setShowMobileMenu(false)} />
                    <NavItem to="/prop-accounts" label="Prop Accounts" icon={Building2} onClick={() => setShowMobileMenu(false)} />
                    <NavItem to="/news" label="Forex News" icon={Newspaper} onClick={() => setShowMobileMenu(false)} />
                    <NavItem to="/admin" label="Admin" icon={Users} onClick={() => setShowMobileMenu(false)} />
                    <NavItem to="/settings" label="Settings" icon={Settings} onClick={() => setShowMobileMenu(false)} />
                  </div>
                </ScrollArea>
                <div className="p-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>

          {/* Main content */}
          <main className="flex min-h-[calc(100vh-4rem)] flex-col sm:min-h-0">
            <div className="app-shell flex-1">
              <div className="h-full overflow-y-auto p-4 sm:p-6 lg:p-8">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Global floating AI assistant */}
      <FloatingAIChat />
    </div>
  );
}
