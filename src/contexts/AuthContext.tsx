
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { toast } from "sonner";
import { FirstLoginPasswordModal } from '@/components/auth/FirstLoginPasswordModal';
import { initializeSignalService } from '@/services/notificationService';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'user' | 'admin';
  subscriptionTier?: 'free' | 'premium' | 'enterprise';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean; // Added to match ProtectedRoute expectations
  loading: boolean; // Added to match ProtectedRoute expectations
  login: (email: string, password: string, verificationCode: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<{success: boolean, code?: string}>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFirstLoginModal, setShowFirstLoginModal] = useState(false);
  const [tempLoginEmail, setTempLoginEmail] = useState('');

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
    
    // Initialize signal service if it was active
    initializeSignalService();
  }, []);

  // Mock authentication functions
  const login = async (email: string, password: string, verificationCode: string) => {
    setIsLoading(true);
    
    try {
      // In a real app, this would validate against a backend
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if this is a first-time login for an admin-created user
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const existingUser = users.find((u: any) => u.email === email);
      
      if (existingUser && existingUser.temporaryPassword) {
        // Show first login modal for setting password
        setTempLoginEmail(email);
        setShowFirstLoginModal(true);
        setIsLoading(false);
        return false;
      }
      
      // Get verification code from storage
      const storedCodes = JSON.parse(localStorage.getItem('verification_codes') || '{}');
      const expectedCode = storedCodes[email];
      
      console.log("Verification attempt:", { email, providedCode: verificationCode, expectedCode });
      
      // Check if code exists and matches
      if (!expectedCode) {
        toast.error("No verification code found for this email. Please register first.");
        setIsLoading(false);
        return false;
      }
      
      if (email && password && email.includes('@') && verificationCode === expectedCode) {
        const user: User = {
          id: '1',
          name: email.split('@')[0],  // Use part of email as name for demo
          email: email,
          role: 'admin',
          subscriptionTier: 'premium' // Added default subscription tier
        };
        
        setUser(user);
        
        localStorage.setItem('auth_token', 'demo_token');
        localStorage.setItem('auth_user', JSON.stringify(user));
        localStorage.setItem('user', JSON.stringify(user)); // For backwards compatibility
        
        toast.success('Login successful');
        setIsLoading(false);
        return true;
      } else {
        throw new Error('Invalid credentials or verification code');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please check your credentials and verification code.');
      setIsLoading(false);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    
    try {
      // In a real app, this would call a backend API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if user already exists
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      if (users.some((u: any) => u.email === email)) {
        toast.error('Email already in use');
        setIsLoading(false);
        return { success: false };
      }
      
      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store verification code in localStorage for persistence
      const currentCodes = JSON.parse(localStorage.getItem('verification_codes') || '{}');
      currentCodes[email] = verificationCode;
      localStorage.setItem('verification_codes', JSON.stringify(currentCodes));
      
      // Create new user
      const newUser: User & { password: string } = {
        id: `user-${Date.now()}`,
        email,
        name,
        role: 'user',
        subscriptionTier: 'free', // Added default subscription tier
        password // In a real app, this would be hashed
      };
      
      // Store in "database"
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      
      setIsLoading(false);
      return { success: true, code: verificationCode };
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(`Registration failed: ${(error as Error).message}`);
      setIsLoading(false);
      return { success: false };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    localStorage.removeItem('user');
    toast.info('Logged out successfully');
  };

  const handleSetPassword = async (email: string, password: string) => {
    // In a real app, this would call a backend API
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex((u: any) => u.email === email);
    
    if (userIndex >= 0) {
      // Update user password and remove temporary password flag
      users[userIndex].password = password;
      delete users[userIndex].temporaryPassword;
      
      // Save updated users
      localStorage.setItem('users', JSON.stringify(users));
      
      // Log user in
      const userData: User = { 
        id: users[userIndex].id, 
        email, 
        name: users[userIndex].name,
        role: users[userIndex].role || 'user',
        subscriptionTier: 'free' // Default subscription tier
      };
      setUser(userData);
      localStorage.setItem('auth_token', 'demo_token');
      localStorage.setItem('auth_user', JSON.stringify(userData));
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Hide modal
      setShowFirstLoginModal(false);
      setTempLoginEmail('');
    } else {
      throw new Error('User not found');
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      loading: isLoading, 
      login, 
      register, 
      logout 
    }}>
      {children}
      <FirstLoginPasswordModal 
        open={showFirstLoginModal}
        email={tempLoginEmail}
        onSetPassword={handleSetPassword}
        onCancel={() => {
          setShowFirstLoginModal(false);
          setTempLoginEmail('');
        }}
      />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
