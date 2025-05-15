
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

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

  const register = async (name: string, email: string, password: string): Promise<{success: boolean, showVerification?: boolean}> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      
      // Check if email already exists
      const currentCodes = getVerificationCodes();
      if (currentCodes[email]) {
        toast.error('This email is already registered. Please login instead.');
        setAuthState(prev => ({ ...prev, loading: false }));
        return { success: false };
      }
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store verification code in localStorage for persistence
      currentCodes[email] = verificationCode;
      setVerificationCodesInStorage(currentCodes);
      
      // Send email with verification code
      await sendVerificationEmail(email, verificationCode);
      
      setAuthState(prev => ({ ...prev, loading: false }));
      
      return { success: true, showVerification: true };
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
