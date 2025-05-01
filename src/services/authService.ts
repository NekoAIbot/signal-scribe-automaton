
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { sendEmailNotification } from './notificationService';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}

// Mock user for demonstration
const mockUser: User = {
  id: '1',
  name: 'John Trader',
  email: 'john@example.com',
  role: 'admin'
};

// Generate a random verification code
const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: localStorage.getItem('auth_token') ? true : false,
    user: localStorage.getItem('auth_user') ? JSON.parse(localStorage.getItem('auth_user') || '{}') : null,
    loading: false
  });

  // Store verification codes in localStorage for persistence
  const getVerificationCodes = (): Record<string, string> => {
    return JSON.parse(localStorage.getItem('verification_codes') || '{}');
  };
  
  const setVerificationCodesInStorage = (codes: Record<string, string>) => {
    localStorage.setItem('verification_codes', JSON.stringify(codes));
  };

  const register = async (name: string, email: string, password: string): Promise<{success: boolean, code?: string}> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate verification code
      const verificationCode = generateVerificationCode();
      
      // Store verification code in localStorage for persistence
      const currentCodes = getVerificationCodes();
      currentCodes[email] = verificationCode;
      setVerificationCodesInStorage(currentCodes);
      
      // Show verification code via toast
      toast.success(`Your verification code is: ${verificationCode}`, {
        duration: 10000,
      });
      
      console.log(`Verification code for ${email}: ${verificationCode}`);
      
      // Attempt to simulate email (this won't actually work in frontend-only)
      sendEmailNotification(
        'Your Trading App Verification Code',
        `Your verification code is: ${verificationCode}. Please use this to complete your login.`,
        email
      ).catch(error => {
        console.log('Email sending simulated:', error);
      });
      
      setAuthState(prev => ({ ...prev, loading: false }));
      
      return { success: true, code: verificationCode };
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
      setAuthState(prev => ({ ...prev, loading: false }));
      return { success: false };
    }
  };

  const login = async (email: string, password: string, verificationCode: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Get verification code from storage
      const storedCodes = getVerificationCodes();
      const expectedCode = storedCodes[email];
      
      console.log("Verification attempt:", { email, providedCode: verificationCode, expectedCode });
      
      // Check if code exists and matches
      if (!expectedCode) {
        toast.error("No verification code found for this email. Please register first.");
        setAuthState(prev => ({ ...prev, loading: false }));
        return false;
      }
      
      if (email && password && email.includes('@') && verificationCode === expectedCode) {
        const user = {
          id: '1',
          name: email.split('@')[0],  // Use part of email as name for demo
          email: email,
          role: 'admin' as const
        };
        
        setAuthState({
          isAuthenticated: true,
          user: user,
          loading: false
        });
        
        localStorage.setItem('auth_token', 'demo_token');
        localStorage.setItem('auth_user', JSON.stringify(user));
        toast.success('Login successful');
        return true;
      } else {
        throw new Error('Invalid credentials or verification code');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please check your credentials and verification code.');
      setAuthState(prev => ({ ...prev, loading: false }));
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false
    });
    toast.success('Logged out successfully');
  };

  return {
    ...authState,
    login,
    logout,
    register
  };
};
