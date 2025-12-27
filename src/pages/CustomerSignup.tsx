import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, Phone, User } from "lucide-react";
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
  fullName: z.string()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name is too long" }),
  phone: z.string()
    .min(10, { message: "Please enter a valid phone number" })
    .max(15, { message: "Phone number is too long" })
    .regex(/^[0-9]+$/, { message: "Phone number must contain only digits" }),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and conditions",
  }),
});

type FormValues = z.infer<typeof formSchema>;

const CustomerSignup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signupWithPhone } = useSupabaseAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      phone: searchParams.get("phone") || "",
      acceptTerms: false,
    },
    mode: "onChange",
  });

  const isFormValid = form.formState.isValid;

  // Pre-fill phone from URL if coming from login
  useEffect(() => {
    const phoneFromUrl = searchParams.get("phone");
    if (phoneFromUrl) {
      form.setValue("phone", phoneFromUrl);
    }
  }, [searchParams, form]);

  async function onSubmit(data: FormValues) {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    const { error: signupError } = await signupWithPhone(
      data.phone,
      data.fullName
    );

    if (signupError) {
      if (signupError.message.includes("already registered")) {
        setError("This phone number is already registered. Please log in instead.");
      } else {
        setError(signupError.message);
      }
      setIsLoading(false);
      return;
    }

    toast({
      title: "Account created!",
      description: "Welcome to SafePay. You're now logged in.",
    });

    navigate("/dashboard");
    setIsLoading(false);
  }

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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-foreground flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Full Name
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your name"
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

            {/* Optional Email Note */}
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 You can add an email later in your profile for receipts and notifications
              </p>
            </div>

            {/* Sign In Link */}
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                to="/customer-login"
                className="font-medium text-primary hover:text-primary/80 transition-colors"
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
