import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  avatar_url: string | null;
  auth_provider: 'email' | 'phone' | 'both' | 'google' | 'apple';
  email_verified: boolean;
  phone_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  loginWithPhone: (phone: string, password: string, rememberMe?: boolean) => Promise<{ error: Error | null }>;
  signup: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: Error | null }>;
  signupWithPhone: (phone: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  updateProfile: (data: Partial<Pick<Profile, 'phone' | 'email' | 'full_name'>>) => Promise<{ error: Error | null }>;
  linkPhone: (phone: string) => Promise<{ error: Error | null }>;
  linkEmail: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const fetchProfile = async (userId: string) => {
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
  };

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
  }, []);

  const login = async (email: string, password: string, rememberMe?: boolean): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
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

  const loginWithPhone = async (phone: string, password: string, rememberMe?: boolean): Promise<{ error: Error | null }> => {
    try {
      // Format phone number to ensure it has country code
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      
      // First, find user by phone in profiles
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, email")
        .eq("phone", formattedPhone)
        .maybeSingle();

      if (profileError || !profileData) {
        return { error: new Error("No account found with this phone number") };
      }

      // If user has email, use email to login (Supabase standard auth)
      if (profileData.email) {
        const { error } = await supabase.auth.signInWithPassword({
          email: profileData.email,
          password,
        });

        if (error) {
          return { error };
        }
      } else {
        // For phone-only users, use phone as email (Supabase workaround)
        const phoneEmail = `${formattedPhone.replace('+', '')}@phone.safepay.local`;
        const { error } = await supabase.auth.signInWithPassword({
          email: phoneEmail,
          password,
        });

        if (error) {
          return { error };
        }
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
    phone?: string
  ): Promise<{ error: Error | null }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const formattedPhone = phone && !phone.startsWith('+') ? `+91${phone}` : phone;
      
      // Check if phone already exists
      if (formattedPhone) {
        const { data: existingPhone } = await supabase
          .from("profiles")
          .select("id")
          .eq("phone", formattedPhone)
          .maybeSingle();
        
        if (existingPhone) {
          return { error: new Error("This phone number is already registered. Please sign in or use a different number.") };
        }
      }
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            phone: formattedPhone || null,
          },
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

  const signupWithPhone = async (
    phone: string, 
    password: string, 
    fullName: string
  ): Promise<{ error: Error | null }> => {
    try {
      // Format phone number
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      
      // Check if phone already exists
      const { data: existingPhone } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", formattedPhone)
        .maybeSingle();
      
      if (existingPhone) {
        return { error: new Error("This phone number is already registered. Please sign in instead.") };
      }
      
      // Create a pseudo-email for phone-only users (Supabase requires email)
      // We use a local domain that's clearly marked as phone-based
      const phoneEmail = `${formattedPhone.replace('+', '')}@phone.safepay.local`;
      
      const { error } = await supabase.auth.signUp({
        email: phoneEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: formattedPhone,
            auth_provider: 'phone',
          },
        },
      });

      if (error) {
        return { error };
      }

      // Update profile to mark as phone-based and verified (since no email verification needed)
      // This will be handled by the trigger, but we update to ensure phone_verified is true
      setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("profiles")
            .update({ 
              phone: formattedPhone,
              phone_verified: true,
              auth_provider: 'phone',
              email: null // Clear the pseudo-email from profile
            })
            .eq("user_id", user.id);
        }
      }, 1000);

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const logout = async () => {
    // Use global scope to invalidate sessions on all devices for security
    await supabase.auth.signOut({ scope: 'global' });
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
          emailRedirectTo: `${window.location.origin}/`,
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

  const updateProfile = async (data: Partial<Pick<Profile, 'phone' | 'email' | 'full_name'>>): Promise<{ error: Error | null }> => {
    try {
      if (!user) {
        return { error: new Error("Not authenticated") };
      }

      const { error } = await supabase
        .from("profiles")
        .update(data)
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

  const linkPhone = async (phone: string): Promise<{ error: Error | null }> => {
    try {
      if (!user) {
        return { error: new Error("Not authenticated") };
      }

      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;

      // Check if phone already exists
      const { data: existingPhone } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", formattedPhone)
        .neq("user_id", user.id)
        .maybeSingle();
      
      if (existingPhone) {
        return { error: new Error("This phone number is already linked to another account.") };
      }

      const { error } = await supabase
        .from("profiles")
        .update({ 
          phone: formattedPhone,
          auth_provider: profile?.auth_provider === 'email' ? 'both' : profile?.auth_provider
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

  const linkEmail = async (email: string): Promise<{ error: Error | null }> => {
    try {
      if (!user) {
        return { error: new Error("Not authenticated") };
      }

      // Check if email already exists
      const { data: existingEmail } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", email)
        .neq("user_id", user.id)
        .maybeSingle();
      
      if (existingEmail) {
        return { error: new Error("This email is already linked to another account.") };
      }

      // Update Supabase auth email
      const { error: authError } = await supabase.auth.updateUser({ email });
      if (authError) {
        return { error: authError };
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({ 
          email,
          auth_provider: profile?.auth_provider === 'phone' ? 'both' : profile?.auth_provider
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
        loginWithPhone,
        signup,
        signupWithPhone,
        logout,
        resendVerificationEmail,
        signInWithGoogle,
        signInWithApple,
        updateProfile,
        linkPhone,
        linkEmail,
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
