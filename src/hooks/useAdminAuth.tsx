import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
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

  // Refs for preventing race conditions
  const isLoggingIn = useRef(false);
  const isLoggingOut = useRef(false);
  const isVerifying = useRef(false);
  const mountedRef = useRef(true);

  // Check if current route is an admin route
  const isAdminRoute = location.pathname.startsWith('/admin');

  const verifySession = useCallback(async (): Promise<boolean> => {
    // Prevent concurrent verification
    if (isVerifying.current) return !!user;
    isVerifying.current = true;

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      
      if (!currentSession) {
        if (mountedRef.current) {
          setUser(null);
          setSession(null);
        }
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

      if (!response.ok) {
        if (mountedRef.current) {
          setUser(null);
          setSession(null);
        }
        return false;
      }

      const data = await response.json();

      if (data.valid && mountedRef.current) {
        setUser(data.user);
        setSession(currentSession);
        return true;
      } else {
        if (mountedRef.current) {
          setUser(null);
          setSession(null);
        }
        return false;
      }
    } catch (error) {
      console.error('Session verification error:', error);
      if (mountedRef.current) {
        setUser(null);
        setSession(null);
      }
      return false;
    } finally {
      isVerifying.current = false;
    }
  }, [user]);

  useEffect(() => {
    mountedRef.current = true;

    // Only verify admin session when on admin routes
    if (!isAdminRoute) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mountedRef.current) return;

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
          setIsLoading(false);
        } else if (session) {
          // Defer verification to avoid blocking
          setTimeout(() => {
            if (mountedRef.current) {
              verifySession().finally(() => {
                if (mountedRef.current) {
                  setIsLoading(false);
                }
              });
            }
          }, 0);
        } else {
          setIsLoading(false);
        }
      }
    );

    // Initial session check for admin routes
    verifySession().finally(() => {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [verifySession, isAdminRoute]);

  const login = useCallback(async (email: string, password: string, pin: string): Promise<{ error: string | null }> => {
    // Prevent concurrent login attempts
    if (isLoggingIn.current) {
      return { error: "Login already in progress" };
    }
    isLoggingIn.current = true;

    try {
      // Validate inputs
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !password || !pin) {
        return { error: "Email, password, and PIN are required" };
      }

      // Validate PIN format
      if (!/^\d{6}$/.test(pin)) {
        return { error: "PIN must be 6 digits" };
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          email: trimmedEmail,
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

        if (mountedRef.current) {
          setSession(data.session);
          setUser(data.user);
        }
        return { error: null };
      }

      return { error: 'Login failed' };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Network error. Please try again.' };
    } finally {
      isLoggingIn.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    // Prevent concurrent logout attempts
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    try {
      // Use global scope to invalidate all admin sessions on all devices
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      if (mountedRef.current) {
        setUser(null);
        setSession(null);
      }
      isLoggingOut.current = false;
    }
  }, []);

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
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Prevent multiple redirects
    if (!isLoading && !isAuthenticated && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate('/admin/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Reset redirect flag when authentication changes
  useEffect(() => {
    if (isAuthenticated) {
      hasRedirected.current = false;
    }
  }, [isAuthenticated]);

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
