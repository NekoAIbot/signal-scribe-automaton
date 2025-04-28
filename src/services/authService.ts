
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

// Mock user for demonstration
const mockUser: User = {
  id: '1',
  name: 'John Trader',
  email: 'john@example.com',
  role: 'admin'
};

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: true, // Default to true for demo purposes
    user: mockUser,
    loading: false
  });

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setAuthState(prev => ({ ...prev, loading: true }));
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo, always succeed if proper format
      if (email && password && email.includes('@')) {
        setAuthState({
          isAuthenticated: true,
          user: mockUser,
          loading: false
        });
        
        localStorage.setItem('auth_token', 'demo_token');
        toast.success('Login successful');
        return true;
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please check your credentials.');
      setAuthState(prev => ({ ...prev, loading: false }));
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    setAuthState({
      isAuthenticated: false,
      user: null,
      loading: false
    });
    toast.success('Logged out successfully');
  };

  // Check if token exists on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      setAuthState({
        isAuthenticated: true,
        user: mockUser,
        loading: false
      });
    }
  }, []);

  return {
    ...authState,
    login,
    logout
  };
};
