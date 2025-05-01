
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
  const { isConnected, usingMockData, reconnect } = useWebSocketMarketData();
  const prevConnectedRef = useRef(isConnected);
  const connectionNotifiedRef = useRef(false);
  
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // Auto-collapse sidebar on mobile when navigating
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [location.pathname, isMobile]);
  
  // Notify only on initial connection
  useEffect(() => {
    if (isConnected && !connectionNotifiedRef.current) {
      if (usingMockData) {
        console.log('Connected using mock market data');
      } else {
        console.log('WebSocket connected to live data');
      }
      connectionNotifiedRef.current = true;
    } else if (!isConnected && prevConnectedRef.current) {
      console.log('WebSocket disconnected');
      connectionNotifiedRef.current = false; // Reset so we can notify on reconnect
    }
    
    prevConnectedRef.current = isConnected;
  }, [isConnected, usingMockData]);
  
  // Handle connection issues with reduced frequency and only when needed
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (!isConnected && isAuthenticated) {
      timer = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        reconnect();
      }, 15000); // Increased to 15 seconds to reduce reconnection attempts
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
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
