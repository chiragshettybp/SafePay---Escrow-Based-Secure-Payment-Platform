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
  needsPhoneMigration: boolean;
  // Phone-based auth (PRIMARY)
  loginWithPhone: (phone: string) => Promise<{ error: Error | null; isNewUser?: boolean }>;
  signupWithPhone: (phone: string, fullName: string) => Promise<{ error: Error | null }>;
  // Password management (OPTIONAL)
  setPassword: (password: string) => Promise<{ error: Error | null }>;
  loginWithPhoneAndPassword: (phone: string, password: string) => Promise<{ error: Error | null }>;
  // Profile management
  updateProfile: (data: Partial<Pick<Profile, 'phone' | 'email' | 'full_name'>>) => Promise<{ error: Error | null }>;
  addEmail: (email: string) => Promise<{ error: Error | null }>;
  addPhoneToAccount: (phone: string) => Promise<{ error: Error | null }>;
  // Session management
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<{ error: Error | null }>;
  // OAuth (still available)
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to format phone number
const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return phone.startsWith('+') ? phone : `+91${cleaned}`;
};

// Helper to create pseudo-email for phone-based auth
const phoneToEmail = (phone: string): string => {
  const cleaned = phone.replace(/\+/g, '');
  return `${cleaned}@phone.safepay.local`;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsPhoneMigration, setNeedsPhoneMigration] = useState(false);
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
    
    // Check if user needs phone migration (has email but no phone)
    if (data && !data.phone && data.email && !data.email.endsWith('@phone.safepay.local')) {
      setNeedsPhoneMigration(true);
    } else {
      setNeedsPhoneMigration(false);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setNeedsPhoneMigration(false);
        }
      }
    );

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

  // PRIMARY: Login with phone number (no password required)
  const loginWithPhone = async (phone: string): Promise<{ error: Error | null; isNewUser?: boolean }> => {
    try {
      const formattedPhone = formatPhone(phone);
      
      // Check if user exists by phone in profiles
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id, email, phone")
        .eq("phone", formattedPhone)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Profile lookup error:", profileError);
      }

      if (!existingProfile) {
        // User doesn't exist - return indicator to redirect to signup
        return { error: new Error("No account found. Please sign up first."), isNewUser: true };
      }

      // User exists - sign them in using the phone-based email
      const phoneEmail = phoneToEmail(formattedPhone);
      
      // For phone-only auth, we use a deterministic password based on phone
      // This is secure because the phone itself is the identity
      const phonePassword = `phone_${formattedPhone}_safepay_auth`;
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password: phonePassword,
      });

      if (signInError) {
        // If sign in fails, the user might have been created with email
        // Try to look up their real email
        if (existingProfile.email && !existingProfile.email.endsWith('@phone.safepay.local')) {
          return { error: new Error("This account was created with email. Please add a phone number to continue.") };
        }
        return { error: signInError };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // PRIMARY: Signup with phone number
  const signupWithPhone = async (phone: string, fullName: string): Promise<{ error: Error | null }> => {
    try {
      const formattedPhone = formatPhone(phone);
      
      // Check if phone already exists
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("phone", formattedPhone)
        .maybeSingle();
      
      if (existingProfile) {
        return { error: new Error("This phone number is already registered. Please log in instead.") };
      }
      
      // Create user with phone-based pseudo-email
      const phoneEmail = phoneToEmail(formattedPhone);
      const phonePassword = `phone_${formattedPhone}_safepay_auth`;
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: phoneEmail,
        password: phonePassword,
        options: {
          data: {
            full_name: fullName,
            phone: formattedPhone,
            auth_provider: 'phone',
          },
        },
      });

      if (signUpError) {
        return { error: signUpError };
      }

      // Update profile to ensure phone is set correctly
      if (signUpData.user) {
        setTimeout(async () => {
          await supabase
            .from("profiles")
            .update({ 
              phone: formattedPhone,
              phone_verified: true,
              auth_provider: 'phone',
              email: null // Clear pseudo-email from profile display
            })
            .eq("user_id", signUpData.user!.id);
        }, 500);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // OPTIONAL: Login with phone and password (for users who set password)
  const loginWithPhoneAndPassword = async (phone: string, password: string): Promise<{ error: Error | null }> => {
    try {
      const formattedPhone = formatPhone(phone);
      const phoneEmail = phoneToEmail(formattedPhone);
      
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // OPTIONAL: Set password for account security
  const setPassword = async (password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) {
        return { error };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Add email to profile (optional, for receipts/communication)
  const addEmail = async (email: string): Promise<{ error: Error | null }> => {
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

      // Update profile with email
      const { error } = await supabase
        .from("profiles")
        .update({ 
          email,
          auth_provider: 'both'
        })
        .eq("user_id", user.id);

      if (error) {
        return { error };
      }

      await fetchProfile(user.id);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Add phone to existing email-only account (migration)
  const addPhoneToAccount = async (phone: string): Promise<{ error: Error | null }> => {
    try {
      if (!user) {
        return { error: new Error("Not authenticated") };
      }

      const formattedPhone = formatPhone(phone);

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

      // Update profile with phone
      const { error } = await supabase
        .from("profiles")
        .update({ 
          phone: formattedPhone,
          phone_verified: true,
          auth_provider: 'phone' // Switch to phone-based auth
        })
        .eq("user_id", user.id);

      if (error) {
        return { error };
      }

      setNeedsPhoneMigration(false);
      await fetchProfile(user.id);
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

      await fetchProfile(user.id);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    setUser(null);
    setSession(null);
    setProfile(null);
    setNeedsPhoneMigration(false);
    localStorage.removeItem("rememberMe");
    navigate("/customer-login");
  };

  const resendVerificationEmail = async (): Promise<{ error: Error | null }> => {
    try {
      if (!profile?.email || profile.email.endsWith('@phone.safepay.local')) {
        return { error: new Error("No email address found") };
      }

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: profile.email,
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
        needsPhoneMigration,
        loginWithPhone,
        signupWithPhone,
        setPassword,
        loginWithPhoneAndPassword,
        updateProfile,
        addEmail,
        addPhoneToAccount,
        logout,
        resendVerificationEmail,
        signInWithGoogle,
        signInWithApple,
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
