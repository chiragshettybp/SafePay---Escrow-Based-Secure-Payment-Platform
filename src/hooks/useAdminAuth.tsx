import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminUser {
  id: string;
  email: string;
  role: string;
}

interface AdminAuthContextType {
  user: AdminUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, pin: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  verifySession: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

// Use the Supabase project configuration
const SUPABASE_URL = "https://sgpefhfmcykwtfqfwzcq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNncGVmaGZtY3lrd3RmcWZ3emNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NjI2NzUsImV4cCI6MjA4MDMzODY3NX0.qYiFr5kI2UK4uLyw57lvvX-pZsYdiYo1x0E7U9FsSEQ";
// Note: These are public/publishable values, not secrets. The anon key is safe to include in client code.

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  // Check if current route is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  const verifySession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        setUser(null);
        setSession(null);
        return false;
      }

      // Verify with edge function that this is a valid admin session
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-verify-session`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`,
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
      });

      const data = await response.json();

      if (data.valid) {
        setUser(data.user);
        setSession(currentSession);
        return true;
      } else {
        // Not a valid admin session
        setUser(null);
        setSession(null);
        return false;
      }
    } catch (error) {
      console.error('Session verification error:', error);
      setUser(null);
      setSession(null);
      return false;
    }
  }, []);

  useEffect(() => {
    // Only verify admin session when on admin routes
    if (!isAdminRoute) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setIsLoading(false);
        } else if (session) {
          // Defer verification to avoid blocking
          setTimeout(() => {
            verifySession().finally(() => setIsLoading(false));
          }, 0);
        } else {
          setIsLoading(false);
        }
      }
    );

    // Initial session check for admin routes
    verifySession().finally(() => setIsLoading(false));

    return () => subscription.unsubscribe();
  }, [verifySession, isAdminRoute]);

  const login = async (email: string, password: string, pin: string): Promise<{ error: string | null }> => {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email,
          password,
          pin,
          userAgent: navigator.userAgent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.error || 'Login failed' };
      }

      if (data.success && data.session) {
        // Set the session in Supabase client
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });

        setSession(data.session);
        setUser(data.user);
        return { error: null };
      }

      return { error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Network error. Please try again.' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user && !!session,
        login,
        logout,
        verifySession,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}

// Protected route component for admin pages
export function AdminProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/admin/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
