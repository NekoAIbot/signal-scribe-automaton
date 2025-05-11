
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

// Admin password set as requested
const ADMIN_PASSWORD = "Nathan19@@";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem('adminAuthenticated') === 'true'
  );
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Check password
    setTimeout(() => {
      if (password === ADMIN_PASSWORD) {
        localStorage.setItem('adminAuthenticated', 'true');
        setIsAuthenticated(true);
        toast.success("Admin access granted");
      } else {
        toast.error("Invalid admin password");
      }
      setIsSubmitting(false);
    }, 1000);
  };

  // First check if the user is even logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Authentication Required</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter admin password"
                required
              />
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Login as Admin"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
