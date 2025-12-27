import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2, Eye, EyeOff, Shield, Check, X, User, Mail, Phone, Lock, AlertCircle } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { PageTransition } from "@/components/layout/PageTransition";
import { Seo } from "@/components/seo/Seo";

const formSchema = z.object({
  fullName: z.string()
    .min(1, "Full name is required")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces"),
  email: z.string()
    .min(1, "Email is required")
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  phone: z.string()
    .min(1, "Phone number is required")
    .regex(/^[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number (starting with 6-9)"),
  password: z.string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string()
    .min(1, "Please confirm your password"),
  acceptTerms: z.boolean()
    .refine(val => val === true, "You must accept the terms and conditions"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const CustomerSignup = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signup, isAuthenticated, isEmailVerified, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
    mode: "onChange",
  });

  const password = form.watch("password");

  // Calculate password strength
  const passwordStrength = useMemo(() => {
    if (!password) return 0;
    
    let strength = 0;
    
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;
    if (password.length >= 16) strength += 10;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
    
    return Math.min(strength, 100);
  }, [password]);

  const passwordRequirements = useMemo(() => [
    { label: "8+ characters", met: password.length >= 8 },
    { label: "Uppercase", met: /[A-Z]/.test(password) },
    { label: "Lowercase", met: /[a-z]/.test(password) },
    { label: "Number", met: /[0-9]/.test(password) },
  ], [password]);

  const getStrengthLabel = () => {
    if (passwordStrength < 40) return { label: "Weak", color: "text-destructive" };
    if (passwordStrength < 70) return { label: "Medium", color: "text-yellow-500" };
    return { label: "Strong", color: "text-green-500" };
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      if (!isEmailVerified) {
        navigate("/customer-verify");
      } else {
        navigate("/");
      }
    }
  }, [isAuthenticated, isEmailVerified, isLoading, navigate]);

  const getErrorMessage = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes("already registered") || message.includes("already exists")) {
      return "This email is already registered. Please sign in instead.";
    }
    if (message.includes("phone number is already registered")) {
      return "This phone number is already registered. Please sign in instead.";
    }
    if (message.includes("weak password")) {
      return "Please choose a stronger password.";
    }
    if (message.includes("rate limit") || message.includes("too many requests")) {
      return "Too many attempts. Please wait a moment and try again.";
    }
    if (message.includes("network")) {
      return "Network error. Please check your connection and try again.";
    }
    
    return error.message || "An error occurred. Please try again.";
  };

  async function onSubmit(data: FormValues) {
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    const { error: signupError } = await signup(
      data.email,
      data.password,
      data.fullName,
      data.phone
    );

    if (signupError) {
      setError(getErrorMessage(signupError));
      setIsSubmitting(false);
      return;
    }

    toast({
      title: "Account created!",
      description: "Please check your email to verify your account.",
    });

    navigate("/customer-verify");
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Seo 
        title="Create Account | SecurePay"
        description="Create your SecurePay account to start making secure payments"
      />
      <div className="min-h-screen bg-background flex flex-col">
        <PageTransition>
          <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
            <Card className="w-full max-w-[480px] border-border/50 shadow-xl">
              <CardHeader className="text-center space-y-2 pb-4">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Create Account
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  Sign up to start making secure payments
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive" className="animate-fade-in">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Signup Form */}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    {/* Full Name Field */}
                    <FormField
                      control={form.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Full Name <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="John Doe"
                                {...field}
                                autoComplete="name"
                                className="pl-10 h-11"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Phone Field */}
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Phone Number <span className="text-destructive">*</span>
                            <span className="text-xs text-muted-foreground ml-1">(Your unique ID)</span>
                          </FormLabel>
                          <FormControl>
                            <div className="flex">
                              <div className="flex items-center justify-center bg-muted border border-r-0 border-input rounded-l-md px-3 text-sm text-muted-foreground">
                                +91
                              </div>
                              <div className="relative flex-1">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                  placeholder="9876543210"
                                  {...field}
                                  type="tel"
                                  inputMode="numeric"
                                  maxLength={10}
                                  autoComplete="tel"
                                  className="pl-10 h-11 rounded-l-none"
                                />
                              </div>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Email Field */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Email Address <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="name@example.com"
                                {...field}
                                type="email"
                                autoComplete="email"
                                className="pl-10 h-11"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Password Field */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Password <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Create a strong password"
                                {...field}
                                type={showPassword ? "text" : "password"}
                                autoComplete="new-password"
                                className="pl-10 pr-10 h-11"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                tabIndex={-1}
                              >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                          
                          {/* Password Strength Meter */}
                          {password && (
                            <div className="mt-2 space-y-2 animate-fade-in">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Password strength</span>
                                <span className={`font-medium ${getStrengthLabel().color}`}>
                                  {getStrengthLabel().label}
                                </span>
                              </div>
                              <Progress value={passwordStrength} className="h-1.5" />
                              <div className="grid grid-cols-2 gap-1">
                                {passwordRequirements.map((req, index) => (
                                  <div
                                    key={index}
                                    className={`flex items-center text-xs ${req.met ? "text-green-500" : "text-muted-foreground"}`}
                                  >
                                    {req.met ? <Check className="h-3 w-3 mr-1" /> : <X className="h-3 w-3 mr-1" />}
                                    {req.label}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </FormItem>
                      )}
                    />

                    {/* Confirm Password Field */}
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Confirm Password <span className="text-destructive">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                placeholder="Confirm your password"
                                {...field}
                                type={showConfirmPassword ? "text" : "password"}
                                autoComplete="new-password"
                                className="pl-10 pr-10 h-11"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                tabIndex={-1}
                              >
                                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Terms and Conditions */}
                    <FormField
                      control={form.control}
                      name="acceptTerms"
                      render={({ field }) => (
                        <FormItem className="flex items-start space-x-2 space-y-0 pt-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-0.5"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer leading-relaxed">
                              I agree to the{" "}
                              <Link to="/terms" className="text-primary hover:text-primary/80 underline">
                                Terms of Service
                              </Link>{" "}
                              and{" "}
                              <Link to="/privacy" className="text-primary hover:text-primary/80 underline">
                                Privacy Policy
                              </Link>
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full h-11 font-medium"
                      disabled={isSubmitting || !form.formState.isValid}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </Form>

                {/* Sign In Link */}
                <p className="text-center text-sm text-muted-foreground pt-2">
                  Already have an account?{" "}
                  <Link
                    to="/customer-login"
                    className="font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    Sign in
                  </Link>
                </p>
              </CardContent>
            </Card>
          </main>
        </PageTransition>
      </div>
    </>
  );
};

export default CustomerSignup;
