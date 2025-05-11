
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  subscriptionTier?: 'free' | 'basic' | 'premium' | 'enterprise' | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, verificationCode: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<{success: boolean, code?: string}>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check if user is already logged in (from localStorage)
    const storedUser = localStorage.getItem('auth_user');
    const storedToken = localStorage.getItem('auth_token');
    
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    
    setLoading(false);
  }, []);

  // Generate a random verification code for demo purposes
  const generateVerificationCode = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Store verification codes in localStorage for persistence
  const getVerificationCodes = (): Record<string, string> => {
    return JSON.parse(localStorage.getItem('verification_codes') || '{}');
  };
  
  const setVerificationCodesInStorage = (codes: Record<string, string>) => {
    localStorage.setItem('verification_codes', JSON.stringify(codes));
  };

  const register = async (name: string, email: string, password: string): Promise<{success: boolean, code?: string}> => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate verification code
      const verificationCode = generateVerificationCode();
      
      // Store verification code in localStorage
      const currentCodes = getVerificationCodes();
      currentCodes[email] = verificationCode;
      setVerificationCodesInStorage(currentCodes);
      
      setLoading(false);
      
      return { success: true, code: verificationCode };
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
      setLoading(false);
      return { success: false };
    }
  };

  const login = async (email: string, password: string, verificationCode: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Get verification code from storage
      const storedCodes = getVerificationCodes();
      const expectedCode = storedCodes[email];
      
      if (!expectedCode) {
        toast.error("No verification code found for this email. Please register first.");
        setLoading(false);
        return false;
      }
      
      if (email && password && email.includes('@') && verificationCode === expectedCode) {
        const newUser = {
          id: '1',
          name: email.split('@')[0],  // Use part of email as name for demo
          email: email,
          role: email.toLowerCase().includes('admin') ? 'admin' as const : 'user' as const,
          subscriptionTier: 'free'
        };
        
        setUser(newUser);
        localStorage.setItem('auth_token', 'demo_token');
        localStorage.setItem('auth_user', JSON.stringify(newUser));
        toast.success('Login successful');
        setLoading(false);
        return true;
      } else {
        throw new Error('Invalid credentials or verification code');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please check your credentials and verification code.');
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
