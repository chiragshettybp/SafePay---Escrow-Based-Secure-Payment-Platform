/**
 * DEPRECATED: This legacy auth hook is no longer used.
 * 
 * SECURITY WARNING: localStorage-based authentication is INSECURE.
 * All authentication MUST go through Supabase Auth.
 * 
 * Use the appropriate auth hook for your user type:
 * - Customer: useSupabaseAuth from '@/hooks/useSupabaseAuth'
 * - Merchant: useMerchantAuth from '@/hooks/useMerchantAuth'  
 * - Admin: useAdminAuth from '@/hooks/useAdminAuth'
 */

import { createContext, useContext, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  name?: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * @deprecated Use Supabase-based AuthProvider from useSupabaseAuth instead
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  // SECURITY: All methods redirect to proper Supabase auth
  const login = async (_email: string, _password: string) => {
    console.warn("SECURITY: Legacy login attempted. Redirecting to secure login.");
    navigate("/customer-login");
  };

  const signup = async (_name: string, _email: string, _password: string) => {
    console.warn("SECURITY: Legacy signup attempted. Redirecting to secure signup.");
    navigate("/customer-signup");
  };

  const logout = () => {
    // Clear any legacy localStorage data
    localStorage.removeItem("user");
    navigate("/customer-login");
  };

  return (
    <AuthContext.Provider
      value={{
        user: null,
        isLoading: false,
        login,
        signup,
        logout,
        isAuthenticated: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/**
 * @deprecated Use useSupabaseAuth, useMerchantAuth, or useAdminAuth instead
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
