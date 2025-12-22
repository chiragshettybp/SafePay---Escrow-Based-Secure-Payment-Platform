import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";

const AdminResetPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setDevToken(null);

    if (!email) {
      setError("Please enter your admin email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: funcError } = await supabase.functions.invoke("admin-request-reset", {
        body: { email: email.trim().toLowerCase() },
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (data?.error) {
        setError(data.error);
      } else {
        setSuccess(true);
        // In development mode, show the token for testing
        if (data?.devToken) {
          setDevToken(data.devToken);
        }
      }
    } catch (err) {
      console.error("Reset request error:", err);
      setError("Failed to send reset request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Seo 
          title="Reset Link Sent | Admin" 
          description="Password reset link has been sent"
        />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Check Your Email</CardTitle>
            <CardDescription>
              If the email address is associated with an admin account, you will receive a password reset link shortly.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              <p>The link will expire in 15 minutes.</p>
              <p className="mt-2">If you don't receive an email, check your spam folder.</p>
            </div>
            
            {devToken && (
              <Alert className="bg-amber-500/10 border-amber-500/20">
                <AlertDescription className="text-xs">
                  <strong>Development Mode:</strong> RESEND_API_KEY not configured.
                  <br />
                  <Link 
                    to={`/admin/reset-password/confirm?token=${devToken}`}
                    className="text-primary underline mt-2 inline-block"
                  >
                    Click here to reset password →
                  </Link>
                </AlertDescription>
              </Alert>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/admin/login")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Seo 
        title="Admin Password Reset | Secure Access" 
        description="Reset your admin password securely"
      />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Admin Password Reset</CardTitle>
          <CardDescription>
            Enter the admin email address to receive a secure reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Admin Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter admin email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Only the authorized admin email can request a password reset.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Reset Link...
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>

            <div className="text-center">
              <Link
                to="/admin/login"
                className="text-sm text-muted-foreground hover:text-primary transition-colors inline-flex items-center"
              >
                <ArrowLeft className="mr-1 h-3 w-3" />
                Back to Admin Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminResetPassword;
