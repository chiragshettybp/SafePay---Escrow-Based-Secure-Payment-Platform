import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, ArrowLeft, AlertCircle } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  email: z.string()
    .min(1, "Email is required")
    .email({ message: "Please enter a valid email address" })
    .max(255, "Email must be less than 255 characters"),
});

type FormValues = z.infer<typeof formSchema>;

export function ResetPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmittingRef = useRef(false);
  const { resetPassword } = useSupabaseAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
    mode: "onChange",
  });

  async function onSubmit(data: FormValues) {
    // Prevent concurrent submissions
    if (isSubmittingRef.current || isLoading) return;
    isSubmittingRef.current = true;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { error: resetError } = await resetPassword(data.email);

      if (resetError) {
        // Handle rate limiting
        if (resetError.message.includes("wait") || resetError.message.includes("Rate")) {
          setError(resetError.message);
        } else {
          setError(resetError.message);
        }
        return;
      }
      
      setIsSubmitted(true);
    } catch (err) {
      setError("Could not send reset email. Please try again.");
      console.error("Reset password error:", err);
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
        <p className="text-muted-foreground">
          We've sent a password reset link to your email address.
        </p>
        <div className="pt-4">
          <Link to="/customer-login">
            <Button variant="outline" className="mt-2 border-border">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive" className="animate-fade-in">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="mb-4">
        <p className="text-muted-foreground">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          
          <Button 
            type="submit" 
            className="w-full h-12" 
            disabled={isLoading || !form.formState.isValid}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending reset link
              </>
            ) : (
              "Send reset link"
            )}
          </Button>
          
          <div className="text-center">
            <Link to="/customer-login" className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center">
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back to login
            </Link>
          </div>
        </form>
      </Form>
    </div>
  );
}
