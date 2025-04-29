
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { useAuth } from '@/services/authService';
import { useWebSocketMarketData } from '@/services/websocketService';

export function Layout() {
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  
  // Connect to WebSocket for real-time data
  const { isConnected, reconnect } = useWebSocketMarketData();
  const prevConnectedRef = useRef(isConnected);
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // Auto-collapse sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [location.pathname, isMobile]);
  
  // Notify only when WebSocket connection status changes
  useEffect(() => {
    if (prevConnectedRef.current !== isConnected) {
      if (isConnected) {
        console.log('WebSocket connected');
      } else {
        console.log('WebSocket disconnected');
      }
      prevConnectedRef.current = isConnected;
    }
  }, [isConnected]);
  
  // Handle connection issues
  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      const timer = setTimeout(() => {
        reconnect();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, isAuthenticated, reconnect]);
  
  return (
    <div className="flex h-screen bg-trading-bg text-foreground">
      <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
