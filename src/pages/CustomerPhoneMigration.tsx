import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Phone, Shield, Info } from "lucide-react";
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
});

type FormValues = z.infer<typeof formSchema>;

const CustomerPhoneMigration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addPhoneToAccount, profile, logout } = useSupabaseAuth();
  const navigate = useNavigate();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      phone: "",
    },
    mode: "onChange",
  });

  const isFormValid = form.formState.isValid;

  async function onSubmit(data: FormValues) {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    const { error: migrationError } = await addPhoneToAccount(data.phone);

    if (migrationError) {
      setError(migrationError.message);
      setIsLoading(false);
      return;
    }

    toast({
      title: "Phone number added!",
      description: "Your account has been updated. You can now log in with your phone number.",
    });

    navigate("/dashboard");
    setIsLoading(false);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageTransition>
        <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
          <Card className="w-full max-w-[420px]">
            <CardHeader className="text-center space-y-2">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Add Phone Number</CardTitle>
              <CardDescription>
                We've updated our login system. Please add your phone number to continue using your account.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Info Box */}
              <div className="flex gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium">Why is this needed?</p>
                  <p className="text-blue-600 dark:text-blue-300 mt-1">
                    Phone number is now the primary way to log in. Your email ({profile?.email}) will still be used for receipts and notifications.
                  </p>
                </div>
              </div>

              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="animate-fade-in">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-medium"
                    disabled={isLoading || !isFormValid}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Adding phone number...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </Button>
                </form>
              </Form>

              {/* Logout Option */}
              <div className="text-center pt-2">
                <button
                  onClick={logout}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign out instead
                </button>
              </div>
            </CardContent>
          </Card>
        </main>
      </PageTransition>
    </div>
  );
};

export default CustomerPhoneMigration;
