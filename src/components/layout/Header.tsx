
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, Menu, User, AlertCircle, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '@/services/authService';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  toggleSidebar: () => void;
}

export function Header({ toggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'New trading signal', read: false },
    { id: 2, title: 'Risk level update', read: true },
  ]);
  
  const handleNotificationClick = () => {
    toast.info('Viewing notifications');
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };
  
  const handleSettingsClick = () => {
    navigate('/settings');
  };
  
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <header className="bg-trading-card border-b border-trading-border h-16 flex items-center justify-between px-4">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold ml-4">Trading Dashboard</h1>
      </div>
      
      <div className="flex items-center space-x-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive"></span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length > 0 ? (
              notifications.map(notification => (
                <DropdownMenuItem key={notification.id} className="flex items-center py-2 cursor-pointer">
                  <div className="flex items-center space-x-2">
                    {!notification.read && <AlertCircle className="h-4 w-4 text-destructive" />}
                    <span className={notification.read ? 'text-muted-foreground' : 'font-medium'}>
                      {notification.title}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))
            ) : (
              <div className="py-2 px-2 text-sm text-center text-muted-foreground">
                No notifications
              </div>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-center cursor-pointer" onClick={handleNotificationClick}>
              Mark all as read
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="flex items-center ml-4 space-x-3">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium">{user?.name || 'Guest'}</p>
            <p className="text-xs text-muted-foreground">Pro Account</p>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full bg-primary/10">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSettingsClick}>
                <SettingsIcon className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
