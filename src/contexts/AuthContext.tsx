
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { toast } from "sonner";
import { FirstLoginPasswordModal } from '@/components/auth/FirstLoginPasswordModal';
import { initializeSignalService } from '@/services/notificationService';

interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'user' | 'admin';
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
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
  const login = async (email: string, password: string) => {
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
        return;
      }
      
      // Simulate simple validation
      if (email === 'admin@example.com' && password === 'admin') {
        const adminUser: User = { id: '1', email, name: 'Admin User', role: 'admin' };
        setUser(adminUser);
        localStorage.setItem('user', JSON.stringify(adminUser));
        toast.success('Logged in as admin');
      } else if (email === 'user@example.com' && password === 'password') {
        const normalUser: User = { id: '2', email, name: 'Regular User', role: 'user' };
        setUser(normalUser);
        localStorage.setItem('user', JSON.stringify(normalUser));
        toast.success('Logged in as user');
      } else if (existingUser && existingUser.password === password) {
        // Login for registered users
        const userData: User = { 
          id: existingUser.id, 
          email: existingUser.email, 
          name: existingUser.name, 
          role: existingUser.role || 'user' 
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
        toast.success(`Welcome back, ${existingUser.name || existingUser.email}`);
      } else {
        toast.error('Invalid email or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(`Login failed: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
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
        return;
      }
      
      // Create new user
      const newUser: User & { password: string } = {
        id: `user-${Date.now()}`,
        email,
        name,
        role: 'user',
        password // In a real app, this would be hashed
      };
      
      // Store in "database"
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
      
      // Log user in
      const userData: User = { id: newUser.id, email, name, role: 'user' };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      toast.success('Registration successful');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(`Registration failed: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
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
        role: users[userIndex].role || 'user'
      };
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Hide modal
      setShowFirstLoginModal(false);
      setTempLoginEmail('');
    } else {
      throw new Error('User not found');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>
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
