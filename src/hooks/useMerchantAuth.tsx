import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
  logo_url: string | null;
}

interface MerchantAuthContextType {
  user: User | null;
  session: Session | null;
  merchant: Merchant | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  isMerchant: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signup: (data: MerchantSignupData) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
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

  const fetchMerchant = async (userId: string) => {
    const { data, error } = await supabase
      .from("merchants" as any)
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
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "merchant")
      .maybeSingle();

    return !!data;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchMerchant(session.user.id);
          }, 0);
        } else {
          setMerchant(null);
          setIsMerchant(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchMerchant(session.user.id);
      }

      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string, rememberMe?: boolean): Promise<{ error: Error | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      // Verify this user is a merchant
      if (data.user) {
        const hasMerchantRole = await checkMerchantRole(data.user.id);
        if (!hasMerchantRole) {
          await supabase.auth.signOut();
          return { error: new Error("This account is not registered as a merchant. Please use the merchant signup.") };
        }
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
      const redirectUrl = `${window.location.origin}/merchant/verify`;

      // Create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            business_name: data.businessName,
            phone: data.phone || null,
            is_merchant: true,
          },
        },
      });

      if (authError) {
        return { error: authError };
      }

      if (!authData.user) {
        return { error: new Error("Failed to create user account") };
      }

      // Create the merchant record
      const { error: merchantError } = await supabase.from("merchants" as any).insert({
        user_id: authData.user.id,
        business_name: data.businessName,
        email: data.email,
        phone: data.phone || null,
        category: data.category || null,
        gst_number: data.gstNumber || null,
        address: data.address || null,
        status: "pending_verification",
      });

      if (merchantError) {
        console.error("Error creating merchant record:", merchantError);
        return { error: merchantError };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setMerchant(null);
    setIsMerchant(false);
    localStorage.removeItem("merchantRememberMe");
    navigate("/merchant/login");
  };

  const resendVerificationEmail = async (): Promise<{ error: Error | null }> => {
    try {
      if (!user?.email) {
        return { error: new Error("No email address found") };
      }

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: user.email,
        options: {
          emailRedirectTo: `${window.location.origin}/merchant/verify`,
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

  const refreshMerchant = async () => {
    if (user) {
      await fetchMerchant(user.id);
    }
  };

  const isEmailVerified = user?.email_confirmed_at != null;

  return (
    <MerchantAuthContext.Provider
      value={{
        user,
        session,
        merchant,
        isLoading,
        isAuthenticated: !!session,
        isEmailVerified,
        isMerchant,
        login,
        signup,
        logout,
        resendVerificationEmail,
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
