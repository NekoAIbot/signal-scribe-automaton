
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, ActivityIcon, BellIcon, BarChart4Icon, ShieldIcon, SettingsIcon, LineChart } from 'lucide-react';
import { cn } from "@/lib/utils";

interface SidebarProps {
  isCollapsed?: boolean;
}

export function Sidebar({ isCollapsed = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(isCollapsed);
  
  const getLinkClass = ({ isActive }: { isActive: boolean }) => {
    return cn(
      "group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
      isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground"
    );
  };
  
  return (
    <div className="flex h-full max-w-[280px] flex-col border-r bg-secondary">
      <div className="flex-1 space-y-2 p-6">
        <div className="hidden shrink-0 lg:flex items-center space-x-2">
          {/* Your logo or brand */}
          <p className="font-bold text-lg">AI Trading Platform</p>
        </div>
        
        <div className="space-y-1">
          <NavLink to="/" className={getLinkClass}>
            <HomeIcon size={16} className="mr-2" />
            Dashboard
          </NavLink>
          <NavLink to="/signals" className={getLinkClass}>
            <ActivityIcon size={16} className="mr-2" />
            Signals
          </NavLink>
          <NavLink to="/monitoring" className={getLinkClass}>
            <LineChart size={16} className="mr-2" />
            Monitoring
          </NavLink>
          <NavLink to="/alerts" className={getLinkClass}>
            <BellIcon size={16} className="mr-2" />
            Alerts
          </NavLink>
          <NavLink to="/analytics" className={getLinkClass}>
            <BarChart4Icon size={16} className="mr-2" />
            Analytics
          </NavLink>
          <NavLink to="/admin" className={getLinkClass}>
            <ShieldIcon size={16} className="mr-2" />
            Admin
          </NavLink>
          <NavLink to="/settings" className={getLinkClass}>
            <SettingsIcon size={16} className="mr-2" />
            Settings
          </NavLink>
        </div>
      </div>
    </div>
  );
}
