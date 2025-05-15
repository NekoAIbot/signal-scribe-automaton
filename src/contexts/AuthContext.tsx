
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  subscriptionTier?: 'free' | 'basic' | 'premium' | 'enterprise';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, code?: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<{success: boolean, showVerification: boolean}>;
}

// Create context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Load user from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem('auth_user');
    const token = localStorage.getItem('auth_token');
    
    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('auth_user');
        localStorage.removeItem('auth_token');
      }
    }
    
    setLoading(false);
  }, []);
  
  // Send verification email
  const sendVerificationEmail = async (email: string, verificationCode: string, template = 'verification') => {
    try {
      const response = await fetch(`${window.location.origin}/api/functions/v1/send-verification-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
        },
        body: JSON.stringify({
          email,
          verificationCode,
          template
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to send verification email');
      }
      
      return true;
    } catch (error) {
      console.error('Error sending verification email:', error);
      toast.error(`Failed to send verification email: ${(error as Error).message}`);
      return false;
    }
  };
  
  // Register function
  const register = async (name: string, email: string, password: string): Promise<{success: boolean, showVerification: boolean}> => {
    try {
      setLoading(true);
      
      // Simple validation
      if (!name || !email || !password) {
        throw new Error('All fields are required');
      }
      
      // Check if email is valid
      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      
      // Check if password is strong enough
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      // In a real app, you would call an API endpoint here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store in localStorage for persistence in the demo app
      const verificationCodes = JSON.parse(localStorage.getItem('verification_codes') || '{}');
      verificationCodes[email] = verificationCode;
      localStorage.setItem('verification_codes', JSON.stringify(verificationCodes));
      
      // Send verification email
      await sendVerificationEmail(email, verificationCode);
      
      toast.success('Verification code sent to your email');
      
      return { success: true, showVerification: true };
    } catch (error) {
      toast.error(`Registration failed: ${(error as Error).message}`);
      return { success: false, showVerification: false };
    } finally {
      setLoading(false);
    }
  };
  
  // Login function
  const login = async (email: string, password: string, code = ''): Promise<boolean> => {
    try {
      setLoading(true);
      
      // In a real app, you would call an API endpoint here
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Verify credentials (simplified mock)
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      // Check verification code if provided
      if (code) {
        const verificationCodes = JSON.parse(localStorage.getItem('verification_codes') || '{}');
        const expectedCode = verificationCodes[email];
        
        if (code !== expectedCode) {
          throw new Error('Invalid verification code');
        }
      }
      
      // Create a mock user based on the email
      const mockUser: User = {
        id: '1',
        name: email.split('@')[0],
        email: email,
        role: email.includes('admin') ? 'admin' : 'user',
        subscriptionTier: 'free'
      };
      
      // Store user in state and localStorage
      setUser(mockUser);
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_token', 'mock-jwt-token');
      
      return true;
    } catch (error) {
      toast.error(`Login failed: ${(error as Error).message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
    localStorage.removeItem('auth_token');
    toast.success('You have been logged out');
  };
  
  // Provide auth context
  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      register
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
