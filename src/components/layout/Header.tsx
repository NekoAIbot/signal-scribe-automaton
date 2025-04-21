
import React from 'react';
import { Button } from "@/components/ui/button";
import { Bell, Menu, User } from 'lucide-react';

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  return (
    <header className="bg-trading-card border-b border-trading-border h-16 flex items-center justify-between px-4">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold ml-4">Trading Dashboard</h1>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive"></span>
        </Button>
        
        <div className="flex items-center ml-4 space-x-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium">John Trader</p>
            <p className="text-xs text-muted-foreground">Pro Account</p>
          </div>
          
          <Button variant="ghost" size="icon" className="rounded-full bg-primary/10">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
