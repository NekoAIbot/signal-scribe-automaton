
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from "@/lib/utils";
import {
  BarChart3,
  BellRing,
  LogOut,
  Menu,
  LayoutDashboard,
  Settings,
  AlertTriangle,
  Signal,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarNavProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed: boolean;
}

interface NavItem {
  title: string;
  icon: React.ReactNode;
  href: string;
  variant: "default" | "ghost";
}

export function Sidebar({ isCollapsed }: SidebarNavProps) {
  const pathname = useLocation().pathname;
  const isMobile = useIsMobile();
  
  const navItems: NavItem[] = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      href: "/",
      variant: pathname === "/" ? "default" : "ghost",
    },
    {
      title: "Signals",
      icon: <Signal className="h-4 w-4" />,
      href: "/signals",
      variant: pathname === "/signals" ? "default" : "ghost",
    },
    {
      title: "Analytics",
      icon: <BarChart3 className="h-4 w-4" />,
      href: "/analytics",
      variant: pathname === "/analytics" ? "default" : "ghost",
    },
    {
      title: "Alerts",
      icon: <BellRing className="h-4 w-4" />,
      href: "/alerts",
      variant: pathname === "/alerts" ? "default" : "ghost",
    },
    {
      title: "Risk Management",
      icon: <AlertTriangle className="h-4 w-4" />,
      href: "/risk",
      variant: pathname === "/risk" ? "default" : "ghost",
    },
    {
      title: "Settings",
      icon: <Settings className="h-4 w-4" />,
      href: "/settings",
      variant: pathname === "/settings" ? "default" : "ghost",
    },
    {
      title: "Admin",
      icon: <Lock className="h-4 w-4" />,
      href: "/admin",
      variant: pathname === "/admin" ? "default" : "ghost",
    }
  ];

  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] p-0">
          <div className="flex flex-col h-full">
            <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
              <Link to="/" className="flex items-center gap-2 font-semibold">
                <BarChart3 className="h-6 w-6" />
                <span className="">AI Trading Platform</span>
              </Link>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3">
                <nav className="grid gap-1">
                  {navItems.map((item, index) => (
                    <Link
                      key={index}
                      to={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                        item.variant === "default" &&
                          "bg-muted font-medium text-primary"
                      )}
                    >
                      {item.icon}
                      <span>{item.title}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </ScrollArea>
            <div className="mt-auto p-4">
              <Button variant="outline" className="w-full justify-start gap-2">
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-collapsed={isCollapsed}
      className="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2"
    >
      <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
        {navItems.map((item, index) => (
          <Link
            key={index}
            to={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
              item.variant === "default" && "bg-muted font-medium text-primary",
              isCollapsed &&
                "flex h-9 w-9 shrink-0 items-center justify-center p-0 hover:bg-muted hover:text-primary [&_span]:hidden"
            )}
          >
            {item.icon}
            <span>{item.title}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
