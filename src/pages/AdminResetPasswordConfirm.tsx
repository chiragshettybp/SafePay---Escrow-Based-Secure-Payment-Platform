import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Lock, KeyRound, ArrowLeft, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/seo/Seo";

const AdminResetPasswordConfirm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [pinErrors, setPinErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
    }
  }, [token]);

  // Password validation
  useEffect(() => {
    const errors: string[] = [];
    if (password) {
      if (password.length < 8) errors.push("At least 8 characters");
      if (!/[A-Z]/.test(password)) errors.push("One uppercase letter");
      if (!/[a-z]/.test(password)) errors.push("One lowercase letter");
      if (!/[0-9]/.test(password)) errors.push("One number");
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push("One special character");
    }
    setPasswordErrors(errors);
  }, [password]);

  // PIN validation
  useEffect(() => {
    const errors: string[] = [];
    if (pin) {
      if (pin.length !== 6) errors.push("Must be exactly 6 digits");
      if (!/^\d+$/.test(pin)) errors.push("Must contain only numbers");
    }
    setPinErrors(errors);
  }, [pin]);

  const isFormValid = () => {
    return (
      token &&
      password &&
      confirmPassword &&
      pin &&
      confirmPin &&
      password === confirmPassword &&
      pin === confirmPin &&
      passwordErrors.length === 0 &&
      pinErrors.length === 0
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset link. Please request a new password reset.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    if (passwordErrors.length > 0) {
      setError("Please fix password requirements");
      return;
    }

    if (pinErrors.length > 0) {
      setError("Please fix PIN requirements");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: funcError } = await supabase.functions.invoke("admin-confirm-reset", {
        body: {
          token,
          password,
          confirmPassword,
          pin,
          confirmPin,
        },
      });

      if (funcError) {
        throw new Error(funcError.message);
      }

      if (data?.error) {
        setError(data.error);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error("Reset confirmation error:", err);
      setError("Failed to reset password. Please try again or request a new reset link.");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Seo 
          title="Password Reset Complete | Admin" 
          description="Your password has been reset successfully"
        />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <CardTitle className="text-2xl">Password Reset Complete</CardTitle>
            <CardDescription>
              Your password and PIN have been updated successfully. All existing sessions have been logged out.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full"
              onClick={() => navigate("/admin/login")}
            >
              Continue to Admin Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 py-8">
      <Seo 
        title="Set New Password | Admin" 
        description="Set a new password and PIN for your admin account"
      />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Set New Credentials</CardTitle>
          <CardDescription>
            Create a new password and PIN for your admin account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={isLoading || !token}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && passwordErrors.length > 0 && (
                <div className="text-xs text-destructive space-y-1">
                  {passwordErrors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              )}
              {password && passwordErrors.length === 0 && (
                <p className="text-xs text-green-600">✓ Password meets all requirements</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10 pr-10"
                  disabled={isLoading || !token}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-destructive">Passwords do not match</p>
              )}
              {confirmPassword && password === confirmPassword && (
                <p className="text-xs text-green-600">✓ Passwords match</p>
              )}
            </div>

            {/* New PIN */}
            <div className="space-y-2">
              <Label htmlFor="pin">New PIN (6 digits)</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pin"
                  type="password"
                  placeholder="Enter 6-digit PIN"
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setPin(value);
                  }}
                  className="pl-10"
                  disabled={isLoading || !token}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="off"
                />
              </div>
              {pin && pinErrors.length > 0 && (
                <div className="text-xs text-destructive space-y-1">
                  {pinErrors.map((err, i) => (
                    <p key={i}>• {err}</p>
                  ))}
                </div>
              )}
              {pin && pinErrors.length === 0 && (
                <p className="text-xs text-green-600">✓ PIN is valid</p>
              )}
            </div>

            {/* Confirm PIN */}
            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPin"
                  type="password"
                  placeholder="Confirm 6-digit PIN"
                  value={confirmPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setConfirmPin(value);
                  }}
                  className="pl-10"
                  disabled={isLoading || !token}
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="off"
                />
              </div>
              {confirmPin && pin !== confirmPin && (
                <p className="text-xs text-destructive">PINs do not match</p>
              )}
              {confirmPin && pin === confirmPin && pinErrors.length === 0 && (
                <p className="text-xs text-green-600">✓ PINs match</p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading || !isFormValid()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Credentials...
                </>
              ) : (
                "Update Password & PIN"
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

export default AdminResetPasswordConfirm;
