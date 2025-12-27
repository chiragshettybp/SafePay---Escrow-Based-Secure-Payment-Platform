import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Shield, Smartphone, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Schema for phone-based account lookup
const phoneSchema = z.object({
  phone: z.string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^(\+91)?[6-9]\d{9}$/, "Enter a valid Indian mobile number"),
});

// Schema for password setup
const passwordSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type PhoneFormValues = z.infer<typeof phoneSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

type ClaimStep = 'phone' | 'verify' | 'password' | 'success';

const ClaimAccount: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [step, setStep] = useState<ClaimStep>('phone');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if coming from a magic link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Check if account is unclaimed
        const { data: profile } = await supabase
          .from('profiles')
          .select('account_claimed, phone')
          .eq('id', session.user.id)
          .single();
        
        if (profile && !profile.account_claimed) {
          setUserId(session.user.id);
          setPhone(profile.phone || '');
          setStep('password');
        } else if (profile?.account_claimed) {
          // Already claimed, redirect to dashboard
          navigate('/dashboard');
        }
      }
    };
    
    checkSession();
  }, [navigate]);
  
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });
  
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  
  // Format phone to +91 format
  const formatPhone = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.startsWith('91') && digits.length > 10) {
      return '+' + digits;
    }
    if (digits.length === 10) {
      return '+91' + digits;
    }
    return value;
  };
  
  // Step 1: Look up account by phone
  const handlePhoneLookup = async (data: PhoneFormValues) => {
    setLoading(true);
    setError(null);
    
    try {
      const formattedPhone = formatPhone(data.phone);
      
      // Check if account exists with this phone
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, account_claimed, account_source')
        .eq('phone', formattedPhone)
        .single();
      
      if (!profile) {
        setError("No account found with this phone number. Please sign up first.");
        setLoading(false);
        return;
      }
      
      if (profile.account_claimed) {
        setError("This account has already been claimed. Please login instead.");
        setLoading(false);
        return;
      }
      
      // Account exists and is unclaimed - send magic link
      setPhone(formattedPhone);
      
      // For phone-based accounts, we'll use OTP verification
      // Send OTP to phone for verification
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });
      
      if (otpError) {
        // If OTP fails, show alternative instructions
        console.error("OTP error:", otpError);
        setError("Unable to send verification code. Please try again or contact support.");
      } else {
        toast({
          title: "Verification Code Sent",
          description: "Enter the code sent to your phone to continue.",
        });
        setUserId(profile.id);
        setStep('verify');
      }
    } catch (err) {
      console.error("Phone lookup error:", err);
      setError("Failed to look up account. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Step 3: Set password and claim account
  const handleSetPassword = async (data: PasswordFormValues) => {
    setLoading(true);
    setError(null);
    
    try {
      // Update user password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password,
      });
      
      if (updateError) throw updateError;
      
      // Update profile to mark as claimed
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            account_claimed: true,
            auth_provider: 'phone', // They verified via phone, so auth_provider is phone
          })
          .eq('id', user.id);
        
        if (profileError) {
          console.error("Profile update error:", profileError);
        }
        
        // Log the claim event
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Account Claimed',
          message: 'Your account has been successfully claimed. You can now log in with your phone and password.',
          type: 'system',
        });
      }
      
      toast({
        title: "Account Claimed Successfully!",
        description: "Your password has been set. You can now log in.",
      });
      
      setStep('success');
    } catch (err) {
      console.error("Set password error:", err);
      setError("Failed to set password. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate password strength
  const getPasswordStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    if (score <= 2) return { label: 'Weak', color: 'bg-destructive', width: '33%' };
    if (score <= 4) return { label: 'Medium', color: 'bg-yellow-500', width: '66%' };
    return { label: 'Strong', color: 'bg-green-500', width: '100%' };
  };
  
  const passwordValue = passwordForm.watch('password');
  const passwordStrength = getPasswordStrength(passwordValue || '');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Claim Your Account</CardTitle>
          <CardDescription>
            {step === 'phone' && "Enter your phone number to claim your account"}
            {step === 'verify' && "Verify your identity"}
            {step === 'password' && "Set a secure password for your account"}
            {step === 'success' && "Account setup complete!"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {/* Step 1: Phone Lookup */}
          {step === 'phone' && (
            <Form {...phoneForm}>
              <form onSubmit={phoneForm.handleSubmit(handlePhoneLookup)} className="space-y-4">
                <FormField
                  control={phoneForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="tel"
                            placeholder="Enter your 10-digit mobile number"
                            className="pl-10"
                            maxLength={13}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Looking up account...
                    </>
                  ) : (
                    "Find My Account"
                  )}
                </Button>
                
                <div className="text-center text-sm text-muted-foreground">
                  <p>Already have an account?{" "}
                    <Button variant="link" className="p-0 h-auto" onClick={() => navigate('/customer/login')}>
                      Login here
                    </Button>
                  </p>
                </div>
              </form>
            </Form>
          )}
          
          {/* Step 2: Verification Sent */}
          {step === 'verify' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <div>
                <h3 className="font-semibold">Verification Sent</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  We've sent a verification link to your registered contact.
                  Please check and click the link to continue.
                </p>
              </div>
              <Alert>
                <AlertDescription>
                  After verifying, you'll be redirected back here to set your password.
                </AlertDescription>
              </Alert>
              <Button variant="outline" className="w-full" onClick={() => setStep('phone')}>
                Use a different phone number
              </Button>
            </div>
          )}
          
          {/* Step 3: Set Password */}
          {step === 'password' && (
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handleSetPassword)} className="space-y-4">
                {phone && (
                  <Alert>
                    <AlertDescription>
                      Setting password for: <strong>{phone.slice(0, 4)}****{phone.slice(-4)}</strong>
                    </AlertDescription>
                  </Alert>
                )}
                
                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a secure password"
                            className="pl-10 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      {passwordValue && (
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${passwordStrength.color} transition-all duration-300`}
                                style={{ width: passwordStrength.width }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground">{passwordStrength.label}</span>
                          </div>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="Confirm your password"
                            className="pl-10 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Setting up account...
                    </>
                  ) : (
                    "Claim My Account"
                  )}
                </Button>
              </form>
            </Form>
          )}
          
          {/* Step 4: Success */}
          {step === 'success' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Account Claimed Successfully!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  You can now log in with your phone number and password.
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate('/customer/login')}>
                Go to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClaimAccount;
