import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  account_status: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signup: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  updateProfile: (data: Partial<Pick<Profile, 'phone' | 'full_name'>>) => Promise<{ error: Error | null }>;
  refreshSession: () => Promise<void>;
  checkPhoneExists: (phone: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Format phone to +91 format
const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  return `+91${cleaned}`;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching profile:", error);
        return;
      }

      setProfile(data as Profile | null);
    } catch (err) {
      console.error("Profile fetch error:", err);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        // Defer profile fetch to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const refreshSession = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (currentUser) {
      setUser(currentUser);
      await fetchProfile(currentUser.id);
    }
  };

  const checkPhoneExists = async (phone: string): Promise<boolean> => {
    const formattedPhone = formatPhone(phone);
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", formattedPhone)
      .maybeSingle();
    return !!data;
  };

  const login = async (email: string, password: string, rememberMe?: boolean): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        return { error };
      }

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem("rememberMe", "true");
      } else {
        localStorage.removeItem("rememberMe");
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signup = async (
    email: string, 
    password: string, 
    fullName: string, 
    phone: string
  ): Promise<{ error: Error | null }> => {
    try {
      const formattedPhone = formatPhone(phone);
      const trimmedEmail = email.trim().toLowerCase();
      
      // Validate phone format (10 digits starting with 6-9)
      const phoneDigits = phone.replace(/\D/g, '');
      if (phoneDigits.length !== 10 || !/^[6-9]/.test(phoneDigits)) {
        return { error: new Error("Please enter a valid 10-digit Indian mobile number") };
      }

      // Check if phone already exists - phone is the unique identifier
      const phoneExists = await checkPhoneExists(phone);
      if (phoneExists) {
        return { error: new Error("This phone number is already registered. Please sign in instead.") };
      }

      const redirectUrl = `${window.location.origin}/customer-verify`;

      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim(),
            phone: formattedPhone,
          },
        },
      });

      if (error) {
        // Handle specific errors
        if (error.message.includes("already registered")) {
          return { error: new Error("This email is already registered. Please sign in instead.") };
        }
        return { error };
      }

      // Check if user was created but email confirmation is required
      if (data.user && !data.session) {
        // User created, needs email verification
        return { error: null };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
    } catch (err) {
      console.error("Logout error:", err);
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    localStorage.removeItem("rememberMe");
    navigate("/customer-login");
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
          emailRedirectTo: `${window.location.origin}/customer-verify`,
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

  const signInWithGoogle = async (): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
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

  const signInWithApple = async (): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/`,
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

  const updateProfile = async (data: Partial<Pick<Profile, 'phone' | 'full_name'>>): Promise<{ error: Error | null }> => {
    try {
      if (!user) {
        return { error: new Error("Not authenticated") };
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) {
        return { error };
      }

      // Refresh profile
      await fetchProfile(user.id);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const isEmailVerified = user?.email_confirmed_at != null;

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAuthenticated: !!session,
        isEmailVerified,
        login,
        signup,
        logout,
        resendVerificationEmail,
        signInWithGoogle,
        signInWithApple,
        updateProfile,
        refreshSession,
        checkPhoneExists,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useSupabaseAuth must be used within an AuthProvider");
  }
  return context;
}
