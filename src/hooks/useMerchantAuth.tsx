import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

  const ensureMerchantProfile = async (u: User) => {
    try {
      if (!u.email) return;

      const { data: existing, error: fetchError } = await merchantSupabase
        .from("merchants")
        .select("id")
        .eq("user_id", u.id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (existing) return;

      // Fallback only: in normal flow, the merchant profile is created server-side.
      const businessName = u.email.split("@")[0] ?? "Merchant";

      const { error } = await merchantSupabase.from("merchants").insert({
        user_id: u.id,
        business_name: businessName,
        email: u.email,
        phone: null,
        category: null,
        gst_number: null,
        address: null,
        status: "active",
      });

      if (error) throw error;
    } catch (error) {
      console.error("Error ensuring merchant profile:", error);
    }
  };

  const fetchMerchant = async (userId: string) => {
    const { data, error } = await merchantSupabase
      .from("merchants")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching merchant:", error);
      return;
    }

    if (data) {
      setMerchant(data as unknown as Merchant);
      setIsMerchant(true);
    } else {
      setMerchant(null);
      setIsMerchant(false);
    }
  };

  const checkMerchantRole = async (userId: string) => {
    const { data } = await merchantSupabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "merchant")
      .maybeSingle();

    return !!data;
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = merchantSupabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Defer Supabase calls with setTimeout to prevent deadlock
        setTimeout(() => {
          void ensureMerchantProfile(session.user).then(() => {
            fetchMerchant(session.user.id);
          });
        }, 0);
      } else {
        setMerchant(null);
        setIsMerchant(false);
      }
    });

    // THEN check for existing session
    merchantSupabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        void ensureMerchantProfile(session.user).then(() => {
          fetchMerchant(session.user.id);
        });
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (
    email: string,
    password: string,
    rememberMe?: boolean
  ): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await merchantSupabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        // Create merchant profile if needed
        await ensureMerchantProfile(data.user);

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
    }
  };

  const signup = async (data: MerchantSignupData): Promise<{ error: Error | null }> => {
    try {
      const { error } = await merchantSupabase.functions.invoke("merchant-signup", {
        body: {
          email: data.email,
          password: data.password,
          businessName: data.businessName,
          phone: data.phone || null,
          category: data.category || null,
          gstNumber: data.gstNumber || null,
          address: data.address || null,
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const logout = async () => {
    await merchantSupabase.auth.signOut();
    setUser(null);
    setSession(null);
    setMerchant(null);
    setIsMerchant(false);
    localStorage.removeItem("merchantRememberMe");
    navigate("/merchant/login");
  };


  const refreshMerchant = async () => {
    if (user) {
      await fetchMerchant(user.id);
    }
  };

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

// TC-AUTH-02: Protected route for merchant pages
export function MerchantProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, isMerchant } = useMerchantAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Skip protection for login/signup pages
    const publicPaths = ['/merchant/login', '/merchant/signup'];
    if (publicPaths.includes(location.pathname)) {
      return;
    }

    if (!isLoading && (!isAuthenticated || !isMerchant)) {
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
