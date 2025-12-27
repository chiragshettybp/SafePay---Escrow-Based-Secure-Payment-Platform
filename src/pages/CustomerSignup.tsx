import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Loader2, Eye, EyeOff, Shield, Check, X } from "lucide-react";
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

const formSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters" }).max(100),
  email: z.string().email({ message: "Please enter a valid email address" }).max(255),
  phone: z.string()
    .min(10, { message: "Phone number must be at least 10 digits" })
    .max(10, { message: "Phone number must be 10 digits" })
    .regex(/^[6-9]\d{9}$/, { message: "Please enter a valid Indian mobile number" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

const CustomerSignup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signup } = useSupabaseAuth();
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
  const isFormValid = form.formState.isValid;

  // Password strength calculation
  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    let score = 0;
    
    if (password.length >= 8) score += 25;
    if (password.length >= 12) score += 10;
    if (/[a-z]/.test(password)) score += 15;
    if (/[A-Z]/.test(password)) score += 15;
    if (/[0-9]/.test(password)) score += 15;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;

    if (score < 40) return { score, label: "Weak", color: "bg-destructive" };
    if (score < 70) return { score, label: "Medium", color: "bg-warning" };
    return { score, label: "Strong", color: "bg-green-500" };
  };

  const passwordStrength = getPasswordStrength(password);

  const passwordRequirements = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains number", met: /[0-9]/.test(password) },
    { label: "Contains special character", met: /[^a-zA-Z0-9]/.test(password) },
  ];

  async function onSubmit(data: FormValues) {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    const { error: signupError } = await signup(
      data.email,
      data.password,
      data.fullName,
      data.phone
    );

    if (signupError) {
      setError(getErrorMessage(signupError.message));
      setIsLoading(false);
      return;
    }

    toast({
      title: "Account created!",
      description: "Please check your email to verify your account.",
    });

    navigate("/customer-verify");
    setIsLoading(false);
  }

  const getErrorMessage = (message: string): string => {
    if (message.includes("already registered")) {
      return "This email is already registered. Please sign in instead.";
    }
    if (message.includes("weak password")) {
      return "Password is too weak. Please choose a stronger password.";
    }
    return message;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageTransition>
        <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-[420px] space-y-6">
            {/* Logo & Header */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Create Account
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Join SafePay for secure payments
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Signup Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John Doe"
                          {...field}
                          autoComplete="name"
                          className="h-12 bg-card border-border focus:border-primary transition-colors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="you@example.com"
                          {...field}
                          type="email"
                          autoComplete="email"
                          className="h-12 bg-card border-border focus:border-primary transition-colors"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                <FormLabel className="text-foreground">
                        Phone Number <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                            +91
                          </span>
                          <Input
                            placeholder="9876543210"
                            {...field}
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            className="h-12 bg-card border-border focus:border-primary transition-colors pl-12"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="••••••••"
                            {...field}
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            className="h-12 bg-card border-border focus:border-primary transition-colors pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                      
                      {/* Password Strength Meter */}
                      {password && (
                        <div className="mt-2 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Password strength</span>
                            <span className={`font-medium ${
                              passwordStrength.label === "Weak" ? "text-destructive" :
                              passwordStrength.label === "Medium" ? "text-yellow-500" :
                              "text-green-500"
                            }`}>
                              {passwordStrength.label}
                            </span>
                          </div>
                          <Progress value={passwordStrength.score} className="h-1.5" />
                          <ul className="grid grid-cols-2 gap-1 mt-2">
                            {passwordRequirements.map((req, index) => (
                              <li
                                key={index}
                                className={`flex items-center text-xs ${
                                  req.met ? "text-green-500" : "text-muted-foreground"
                                }`}
                              >
                                {req.met ? (
                                  <Check className="h-3 w-3 mr-1" />
                                ) : (
                                  <X className="h-3 w-3 mr-1" />
                                )}
                                {req.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground">Confirm Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="••••••••"
                            {...field}
                            type={showConfirmPassword ? "text" : "password"}
                            autoComplete="new-password"
                            className="h-12 bg-card border-border focus:border-primary transition-colors pr-12"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="acceptTerms"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-2 space-y-0 pt-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary mt-0.5"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">
                          I agree to the{" "}
                          <Link to="/terms" className="text-primary hover:underline">
                            Terms of Service
                          </Link>{" "}
                          and{" "}
                          <Link to="/privacy" className="text-primary hover:underline">
                            Privacy Policy
                          </Link>
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium mt-4"
                  disabled={isLoading || !isFormValid}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>
            </Form>

            {/* Sign In Link */}
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/customer-login"
                className="text-primary font-medium hover:text-primary/80 transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </main>
      </PageTransition>
    </div>
  );
};

export default CustomerSignup;
