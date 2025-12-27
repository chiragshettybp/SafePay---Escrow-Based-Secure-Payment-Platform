import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { merchantSupabase } from "@/integrations/supabase/merchantClient";

interface Merchant {
  id: string;
  user_id: string;
  business_name: string;
  email: string;
  phone: string | null;
  category: string | null;
  gst_number: string | null;
  address: string | null;
  status: string;
  slug: string | null;
  logo_url: string | null;
}

interface MerchantAuthContextType {
  user: User | null;
  session: Session | null;
  merchant: Merchant | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isMerchant: boolean;
  isApproved: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signup: (data: MerchantSignupData) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  refreshMerchant: () => Promise<void>;
}

interface MerchantSignupData {
  email: string;
  password: string;
  businessName: string;
  phone?: string;
  category?: string;
  gstNumber?: string;
  address?: string;
}

const MerchantAuthContext = createContext<MerchantAuthContextType | undefined>(undefined);

export function MerchantAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMerchant, setIsMerchant] = useState(false);
  const navigate = useNavigate();

  // Refs for preventing race conditions
  const isLoggingIn = useRef(false);
  const isSigningUp = useRef(false);
  const isLoggingOut = useRef(false);
  const isFetchingMerchant = useRef(false);
  const mountedRef = useRef(true);

  const fetchMerchant = useCallback(async (userId: string) => {
    // Prevent concurrent fetches
    if (isFetchingMerchant.current) return;
    isFetchingMerchant.current = true;

    try {
      const { data, error } = await merchantSupabase
        .from("merchants")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching merchant:", error);
        return;
      }

      if (mountedRef.current) {
        if (data) {
          setMerchant(data as unknown as Merchant);
          setIsMerchant(true);
        } else {
          setMerchant(null);
          setIsMerchant(false);
        }
      }
    } catch (err) {
      console.error("Merchant fetch error:", err);
    } finally {
      isFetchingMerchant.current = false;
    }
  }, []);

  const checkMerchantRole = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data } = await merchantSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "merchant")
        .maybeSingle();

      return !!data;
    } catch (err) {
      console.error("Role check error:", err);
      return false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = merchantSupabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Defer Supabase calls with setTimeout to prevent deadlock
        setTimeout(() => {
          if (mountedRef.current) {
            fetchMerchant(session.user.id);
          }
        }, 0);
      } else {
        setMerchant(null);
        setIsMerchant(false);
      }

      if (event === 'SIGNED_OUT') {
        setMerchant(null);
        setIsMerchant(false);
        setIsLoading(false);
      }
    });

    // THEN check for existing session
    merchantSupabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchMerchant(session.user.id);
      }

      setIsLoading(false);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchMerchant]);

  const login = useCallback(async (
    email: string,
    password: string,
    rememberMe?: boolean
  ): Promise<{ error: Error | null }> => {
    // Prevent concurrent login attempts
    if (isLoggingIn.current) {
      return { error: new Error("Login already in progress") };
    }
    isLoggingIn.current = true;

    try {
      // Validate inputs
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !password) {
        return { error: new Error("Email and password are required") };
      }

      const { data, error } = await merchantSupabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        // Check for merchant role
        const hasMerchantRole = await checkMerchantRole(data.user.id);
        if (!hasMerchantRole) {
          await merchantSupabase.auth.signOut();
          return {
            error: new Error(
              "This account is not registered as a merchant. Please use the merchant signup."
            ),
          };
        }

        // Fetch merchant data
        await fetchMerchant(data.user.id);
      }

      if (rememberMe) {
        localStorage.setItem("merchantRememberMe", "true");
      } else {
        localStorage.removeItem("merchantRememberMe");
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      isLoggingIn.current = false;
    }
  }, [checkMerchantRole, fetchMerchant]);

  const signup = useCallback(async (data: MerchantSignupData): Promise<{ error: Error | null }> => {
    // Prevent concurrent signup attempts
    if (isSigningUp.current) {
      return { error: new Error("Signup already in progress") };
    }
    isSigningUp.current = true;

    try {
      // Validate inputs
      const trimmedEmail = data.email.trim().toLowerCase();
      const trimmedBusinessName = data.businessName.trim();
      
      if (!trimmedEmail || !data.password || !trimmedBusinessName) {
        return { error: new Error("Email, password, and business name are required") };
      }

      const { error } = await merchantSupabase.functions.invoke("merchant-signup", {
        body: {
          email: trimmedEmail,
          password: data.password,
          businessName: trimmedBusinessName,
          phone: data.phone?.trim() || null,
          category: data.category || null,
          gstNumber: data.gstNumber?.trim() || null,
          address: data.address?.trim() || null,
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    } finally {
      isSigningUp.current = false;
    }
  }, []);

  const logout = useCallback(async () => {
    // Prevent concurrent logout attempts
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    try {
      // Use global scope to invalidate sessions on all devices for security
      await merchantSupabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      if (mountedRef.current) {
        setUser(null);
        setSession(null);
        setMerchant(null);
        setIsMerchant(false);
      }
      localStorage.removeItem("merchantRememberMe");
      isLoggingOut.current = false;
      navigate("/merchant/login");
    }
  }, [navigate]);

  const refreshMerchant = useCallback(async () => {
    if (user) {
      await fetchMerchant(user.id);
    }
  }, [user, fetchMerchant]);

  const isApproved = merchant?.status === "active";

  return (
    <MerchantAuthContext.Provider
      value={{
        user,
        session,
        merchant,
        isLoading,
        isAuthenticated: !!session,
        isMerchant,
        isApproved,
        login,
        signup,
        logout,
        refreshMerchant,
      }}
    >
      {children}
    </MerchantAuthContext.Provider>
  );
}

export function useMerchantAuth() {
  const context = useContext(MerchantAuthContext);
  if (context === undefined) {
    throw new Error("useMerchantAuth must be used within a MerchantAuthProvider");
  }
  return context;
}

// Protected route for merchant pages
export function MerchantProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, isMerchant } = useMerchantAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Skip protection for login/signup pages
    const publicPaths = ['/merchant/login', '/merchant/signup'];
    if (publicPaths.includes(location.pathname)) {
      hasRedirected.current = false;
      return;
    }

    // Prevent multiple redirects
    if (!isLoading && (!isAuthenticated || !isMerchant) && !hasRedirected.current) {
      hasRedirected.current = true;
      navigate('/merchant/login', { replace: true });
    }
  }, [isAuthenticated, isLoading, isMerchant, navigate, location.pathname]);

  // Skip loading state for public paths
  const publicPaths = ['/merchant/login', '/merchant/signup'];
  if (publicPaths.includes(location.pathname)) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !isMerchant) {
    return null;
  }

  return <>{children}</>;
}
