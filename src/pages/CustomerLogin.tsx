import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Phone } from "lucide-react";
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
  phone: z.string()
    .min(10, { message: "Please enter a valid phone number" })
    .max(15, { message: "Phone number is too long" })
    .regex(/^[0-9]+$/, { message: "Phone number must contain only digits" }),
  rememberMe: z.boolean().default(false),
});

type FormValues = z.infer<typeof formSchema>;

const CustomerLogin = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loginWithPhone } = useSupabaseAuth();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
      rememberMe: localStorage.getItem("rememberMe") === "true",
    },
  });

  const isFormValid = form.formState.isValid;

  async function onSubmit(data: FormValues) {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);

    const { error: loginError, isNewUser } = await loginWithPhone(data.phone);

    if (loginError) {
      if (isNewUser) {
        // Redirect to signup with phone pre-filled
        navigate(`/customer-signup?phone=${data.phone}`);
        return;
      }
      setError(loginError.message);
      setIsLoading(false);
      return;
    }

    // Handle remember me
    if (data.rememberMe) {
      localStorage.setItem("rememberMe", "true");
    } else {
      localStorage.removeItem("rememberMe");
    }

    toast({
      title: "Welcome back!",
      description: "You have successfully logged in.",
    });

    navigate("/dashboard");
    setIsLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageTransition>
        <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
          <div className="w-full max-w-[420px] space-y-8">
            {/* Logo & Header */}
            <div className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Welcome Back
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Sign in to your SafePay account
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="animate-fade-in">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Phone Login Form */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                            +91
                          </span>
                          <Input
                            placeholder="9876543210"
                            {...field}
                            type="tel"
                            inputMode="numeric"
                            autoComplete="tel"
                            className="h-12 bg-card border-border focus:border-primary transition-colors pl-12 text-lg tracking-wide"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">
                        Remember me
                      </FormLabel>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium"
                  disabled={isLoading || !isFormValid}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            </Form>

            {/* Info Text */}
            <p className="text-center text-xs text-muted-foreground">
              Your phone number is your account identifier. By continuing, you agree to our{" "}
              <Link to="/terms" className="text-primary hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link to="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
            </p>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                to="/customer-signup"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Create account
              </Link>
            </p>
          </div>
        </main>
      </PageTransition>
    </div>
  );
};

export default CustomerLogin;
