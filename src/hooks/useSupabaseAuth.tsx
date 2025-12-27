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
  auth_provider: 'email' | 'phone' | 'both' | 'google' | 'apple' | 'phone_password';
  email_verified: boolean;
  phone_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsPhoneMigration: boolean;
  // Phone + Password auth (PRIMARY - ONLY method for customers)
  loginWithPhoneAndPassword: (phone: string, password: string) => Promise<{ error: Error | null; isNewUser?: boolean }>;
  signupWithPhoneAndPassword: (phone: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  resetPassword: (phone: string, newPassword: string) => Promise<{ error: Error | null }>;
  // Profile management
  updateProfile: (data: Partial<Pick<Profile, 'phone' | 'email' | 'full_name'>>) => Promise<{ error: Error | null }>;
  addEmail: (email: string) => Promise<{ error: Error | null }>;
  addPhoneToAccount: (phone: string) => Promise<{ error: Error | null }>;
  // Session management
  logout: () => Promise<void>;
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

// Helper to create pseudo-email for phone-based auth (Supabase requires email)
// Using example.com which is a reserved domain that Supabase accepts
const phoneToEmail = (phone: string): string => {
  const cleaned = phone.replace(/\+/g, '');
  return `phone.${cleaned}@example.com`;
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
    if (data && !data.phone && data.email && !data.email.startsWith('phone.')) {
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

  // PRIMARY: Login with phone number and password
  const loginWithPhoneAndPassword = async (phone: string, password: string): Promise<{ error: Error | null; isNewUser?: boolean }> => {
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
        return { error: new Error("No account found with this phone number. Please sign up first."), isNewUser: true };
      }

      // User exists - sign them in using the phone-based email and their password
      const phoneEmail = phoneToEmail(formattedPhone);
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: phoneEmail,
        password,
      });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          return { error: new Error("Incorrect phone number or password. Please try again.") };
        }
        return { error: signInError };
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // PRIMARY: Signup with phone number and password
  const signupWithPhoneAndPassword = async (phone: string, password: string, fullName: string): Promise<{ error: Error | null }> => {
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
      
      // Create user with phone-based pseudo-email and user's password
      const phoneEmail = phoneToEmail(formattedPhone);
      
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: phoneEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: formattedPhone,
            auth_provider: 'phone_password',
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
              auth_provider: 'phone_password',
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

  // Reset password using phone number
  const resetPassword = async (phone: string, newPassword: string): Promise<{ error: Error | null }> => {
    try {
      const formattedPhone = formatPhone(phone);
      
      // Check if user exists by phone
      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("phone", formattedPhone)
        .maybeSingle();

      if (profileError || !existingProfile) {
        return { error: new Error("No account found with this phone number.") };
      }

      // For password reset, user must already be logged in or we need admin action
      // Since we're implementing a simplified reset, we'll sign them in first
      // In production, this would typically involve SMS verification
      
      // For now, if user is already authenticated, update their password
      if (session) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          return { error };
        }
        return { error: null };
      }

      return { error: new Error("Please contact support to reset your password.") };
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
        .update({ email })
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
          auth_provider: 'phone_password'
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

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAuthenticated: !!session,
        needsPhoneMigration,
        loginWithPhoneAndPassword,
        signupWithPhoneAndPassword,
        resetPassword,
        updateProfile,
        addEmail,
        addPhoneToAccount,
        logout,
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
