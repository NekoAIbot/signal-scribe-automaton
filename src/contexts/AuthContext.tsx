import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { supabase } from "@/integrations/supabase/client";
import { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  subscriptionTier?: 'free' | 'basic' | 'premium' | 'enterprise';
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  register: (name: string, email: string, password: string) => Promise<{success: boolean, showVerification: boolean}>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Fetch user profile and role from database
  const fetchUserProfile = async (userId: string, email: string) => {
    try {
      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, subscription_tier')
        .eq('id', userId)
        .single();
      
      // Fetch role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      const userRole = roleData?.role === 'admin' ? 'admin' : 'user';
      
      const userData: User = {
        id: userId,
        name: profile?.name || email.split('@')[0],
        email: email,
        role: userRole,
        subscriptionTier: (profile?.subscription_tier as User['subscriptionTier']) || 'free'
      };
      
      setUser(userData);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      // Set basic user data if profile fetch fails
      setUser({
        id: userId,
        name: email.split('@')[0],
        email: email,
        role: 'user',
        subscriptionTier: 'free'
      });
    }
  };
  
  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Defer profile fetch to avoid deadlock
          setTimeout(() => {
            fetchUserProfile(currentSession.user.id, currentSession.user.email || '');
          }, 0);
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      
      if (existingSession?.user) {
        fetchUserProfile(existingSession.user.id, existingSession.user.email || '');
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);
  
  // Register function
  const register = async (name: string, email: string, password: string): Promise<{success: boolean, showVerification: boolean}> => {
    try {
      setLoading(true);
      
      if (!name || !email || !password) {
        throw new Error('All fields are required');
      }
      
      if (!email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: name
          }
        }
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('This email is already registered. Please login instead.');
        }
        throw error;
      }
      
      if (data.user) {
        toast.success('Account created successfully! You can now log in.');
        return { success: true, showVerification: false };
      }
      
      return { success: false, showVerification: false };
    } catch (error) {
      toast.error(`Registration failed: ${(error as Error).message}`);
      return { success: false, showVerification: false };
    } finally {
      setLoading(false);
    }
  };
  
  // Login function
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      if (data.user) {
        toast.success('Login successful!');
        return true;
      }
      
      return false;
    } catch (error) {
      toast.error(`Login failed: ${(error as Error).message}`);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  // Logout function
  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      toast.success('You have been logged out');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to log out');
    }
  };
  
  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isAuthenticated: !!session && !!user,
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
