
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
      const verificationCode = generateVerificationCode();
      
      // Store verification code in localStorage for persistence
      currentCodes[email] = verificationCode;
      setVerificationCodesInStorage(currentCodes);
      
      // Send email notification with verification code
      const emailSubject = 'Your Trading Platform Verification Code';
      const emailBody = `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Welcome to Trading Platform!</h2>
          <p>Thank you for registering. To complete your registration, please use the verification code below:</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0; font-size: 24px; letter-spacing: 3px;">
            <strong>${verificationCode}</strong>
          </div>
          <p>This code will expire in 30 minutes. If you did not request this code, please ignore this email.</p>
          <p>Best regards,<br>The Trading Platform Team</p>
        </div>
      `;
      
      // Send email (simulation)
      await sendEmailNotification(emailSubject, emailBody, email);
      
      console.log(`Verification code for ${email}: ${verificationCode}`);
      
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
        
        // Clear the used verification code to prevent reuse
        // In a real app, you might want to implement expiration instead
        // For this demo, we'll allow the code to be reused
        // delete storedCodes[email];
        // setVerificationCodesInStorage(storedCodes);
        
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
