
import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import { Menu, X, Home, BarChart2, Bell, Settings, Users, Activity, Tv2, LogOut, Newspaper, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { FloatingAIChat } from "@/components/chat/FloatingAIChat";

// Navigation item component
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
          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
          linkActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          className
        )
      }
      end={to === "/"}
    >
      <Icon className="h-4 w-4" />
      <span className="text-sm font-medium">{label}</span>
    </NavLink>
  );
};

// Main Layout component
export function Layout() {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();
  
  // Close mobile menu when route changes
  useEffect(() => {
    setShowMobileMenu(false);
  }, [location.pathname]);
  
  // Handle logout
  const handleLogout = () => {
    logout();
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <div className="flex flex-col sm:grid sm:grid-cols-[220px_1fr] sm:gap-0">
        {/* Sidebar for desktop */}
        <div className="hidden border-r bg-background sm:flex flex-col">
          <ScrollArea className="flex-grow">
            <div className="flex flex-col gap-2 p-4">
              <div className="flex h-16 items-center px-2">
                <NavLink to="/" className="flex items-center gap-2 font-semibold">
                  <Activity className="h-6 w-6" />
                  <span className="text-xl font-bold">TradePilot</span>
                </NavLink>
              </div>
              <nav className="grid gap-1 px-2">
                <NavItem to="/" label="Dashboard" icon={Home} />
                <NavItem to="/signals" label="Signals" icon={Tv2} />
                <NavItem to="/analytics" label="Analytics" icon={BarChart2} />
                <NavItem to="/alerts" label="Alerts" icon={Bell} />
                <NavItem to="/monitoring" label="Monitoring" icon={Activity} />
                <NavItem to="/prop-accounts" label="Prop Accounts" icon={Building2} />
                <NavItem to="/news" label="Forex News" icon={Newspaper} />
                <NavItem to="/admin" label="Admin" icon={Users} />
                <NavItem to="/settings" label="Settings" icon={Settings} />
              </nav>
              <div className="mt-auto px-2 pt-2">
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
        <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-16 sm:hidden">
          <Button
            variant="outline"
            size="icon"
            className="sm:hidden"
            onClick={() => setShowMobileMenu(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle Menu</span>
          </Button>
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6" />
            <span className="text-xl font-bold">TradePilot</span>
          </div>
        </header>
        
        {/* Mobile menu */}
        <Sheet open={showMobileMenu} onOpenChange={setShowMobileMenu}>
          <SheetContent side="left" className="w-[240px] sm:w-[240px] p-0">
            <div className="flex flex-col h-full">
              <div className="flex h-14 items-center px-6 border-b">
                <NavLink to="/" className="flex items-center gap-2 font-semibold">
                  <Activity className="h-6 w-6" />
                  <span className="text-xl font-bold">TradePilot</span>
                </NavLink>
              </div>
              <ScrollArea className="flex-grow">
                <div className="p-4 grid gap-2">
                  <NavItem to="/" label="Dashboard" icon={Home} onClick={() => setShowMobileMenu(false)} />
                  <NavItem to="/signals" label="Signals" icon={Tv2} onClick={() => setShowMobileMenu(false)} />
                  <NavItem to="/analytics" label="Analytics" icon={BarChart2} onClick={() => setShowMobileMenu(false)} />
                  <NavItem to="/alerts" label="Alerts" icon={Bell} onClick={() => setShowMobileMenu(false)} />
                  <NavItem to="/monitoring" label="Monitoring" icon={Activity} onClick={() => setShowMobileMenu(false)} />
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
        <main className="flex flex-col min-h-[calc(100vh-3.5rem)] sm:min-h-screen">
          <div className="flex-1 p-4 sm:p-6">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Global floating AI assistant */}
      <FloatingAIChat />
    </div>
  );
}
