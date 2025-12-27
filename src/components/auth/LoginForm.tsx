import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";

/**
 * SECURITY: This legacy LoginForm now redirects to the secure Supabase-based customer login.
 * All authentication MUST go through Supabase Auth, not localStorage.
 */
export function LoginForm() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to secure Supabase-based authentication
    navigate("/customer-login", { replace: true });
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        Redirecting to secure login...
      </p>
      <p className="text-xs text-muted-foreground">
        If not redirected, <Link to="/customer-login" className="text-primary hover:underline">click here</Link>
      </p>
    </div>
  );
}
