
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useWebSocketMarketData } from '@/services/websocketService';

export function Layout() {
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(isMobile);
  const { user } = useAuth();
  const location = useLocation();
  const mainContentRef = useRef<HTMLDivElement>(null);
  
  // Connect to WebSocket for real-time data
  const { isConnected, usingMockData, reconnect } = useWebSocketMarketData();
  const prevConnectedRef = useRef(isConnected);
  const notificationDisplayedRef = useRef(false);
  const lastReconnectAttemptRef = useRef(0);
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // Auto-scroll to top when location changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);
  
  // Auto-collapse sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [location.pathname, isMobile]);
  
  // Handle WebSocket connection status notifications only on significant changes
  useEffect(() => {
    // Only notify on significant connection state changes to reduce notification spam
    if (isConnected && !notificationDisplayedRef.current) {
      notificationDisplayedRef.current = true;
      // Only show toast if it's a real connection, not on initial load
      if (prevConnectedRef.current === false) {
        toast.success(usingMockData ? 'Connected to market data (mock)' : 'Connected to live market data');
      }
    } else if (!isConnected && prevConnectedRef.current) {
      // Reset notification flag only when disconnected after being connected
      notificationDisplayedRef.current = false;
    }
    
    prevConnectedRef.current = isConnected;
  }, [isConnected, usingMockData]);
  
  // Handle connection issues with reduced frequency
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (!isConnected && user) {
      const now = Date.now();
      // Only attempt reconnect at most once every 30 seconds
      if (now - lastReconnectAttemptRef.current > 30000) {
        lastReconnectAttemptRef.current = now;
        timer = setTimeout(() => {
          reconnect();
        }, 15000); // 15 seconds to reduce reconnection attempts
      }
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isConnected, user, reconnect]);
  
  return (
    <div className="flex h-screen bg-trading-bg text-foreground">
      <Sidebar isCollapsed={sidebarCollapsed} />
      
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header toggleSidebar={toggleSidebar} />
        
        <main className="flex-1 overflow-auto p-4" ref={mainContentRef}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
