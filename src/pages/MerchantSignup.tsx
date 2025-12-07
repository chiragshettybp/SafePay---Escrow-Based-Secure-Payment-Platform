import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Store, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const signupSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional().or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  category: z.string().optional(),
  gstNumber: z.string().optional(),
  address: z.string().optional(),
  terms: z.boolean().refine((val) => val === true, "You must agree to the terms"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

const BUSINESS_CATEGORIES = [
  "Electronics",
  "Fashion & Apparel",
  "Home & Garden",
  "Health & Beauty",
  "Food & Beverages",
  "Sports & Outdoors",
  "Books & Media",
  "Automotive",
  "Services",
  "Other",
];

export default function MerchantSignup() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      terms: false,
    },
  });

  const termsValue = watch("terms");

  const passwordStrength = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const strengthScore = Object.values(passwordStrength).filter(Boolean).length;

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true);

    try {
      // Check if email already exists
      const { data: existingMerchant } = await supabase
        .from("merchants" as any)
        .select("id")
        .eq("email", data.email)
        .maybeSingle();

      if (existingMerchant) {
        toast({
          title: "Email Already Registered",
          description: "This email is already registered as a merchant. Please login instead.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/merchant/verify`,
          data: {
            business_name: data.businessName,
            phone: data.phone || null,
            is_merchant: true,
          },
        },
      });

      if (authError) {
        toast({
          title: "Signup Failed",
          description: authError.message,
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        toast({
          title: "Signup Failed",
          description: "Unable to create account. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Create merchant record
      const { error: merchantError } = await supabase.from("merchants" as any).insert({
        user_id: authData.user.id,
        business_name: data.businessName,
        email: data.email,
        phone: data.phone || null,
        category: data.category || null,
        gst_number: data.gstNumber || null,
        address: data.address || null,
        status: "pending_verification",
      });

      if (merchantError) {
        console.error("Merchant creation error:", merchantError);
        toast({
          title: "Account Created",
          description: "Your account was created but there was an issue with the merchant profile. Please contact support.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account.",
      });

      navigate("/merchant/verify");
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="w-full max-w-lg mx-auto">
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center space-y-4 pb-4">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Store className="w-7 h-7 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Create Merchant Account</CardTitle>
              <CardDescription className="mt-1 text-sm">
                Register to receive payments via escrow
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Business Name */}
              <div className="space-y-1.5">
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="Your Business Name"
                  className="h-11"
                  {...register("businessName")}
                />
                {errors.businessName && (
                  <p className="text-xs text-destructive">{errors.businessName.message}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Business Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="merchant@business.com"
                  className="h-11"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <Label htmlFor="phone">Contact Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  className="h-11"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-xs text-destructive">{errors.phone.message}</p>
                )}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="category">Business Category</Label>
                <Select onValueChange={(value) => setValue("category", value)}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* GST Number */}
              <div className="space-y-1.5">
                <Label htmlFor="gstNumber">GST Number (Optional)</Label>
                <Input
                  id="gstNumber"
                  placeholder="22AAAAA0000A1Z5"
                  className="h-11"
                  {...register("gstNumber")}
                />
              </div>

              {/* Address */}
              <div className="space-y-1.5">
                <Label htmlFor="address">Business Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter your business address"
                  className="min-h-[80px] resize-none"
                  {...register("address")}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    className="h-11 pr-12"
                    {...register("password", {
                      onChange: (e) => setPassword(e.target.value),
                    })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}

                {/* Password Strength */}
                {password && (
                  <div className="space-y-2 mt-2">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            strengthScore >= level
                              ? strengthScore <= 2
                                ? "bg-destructive"
                                : strengthScore === 3
                                ? "bg-yellow-500"
                                : "bg-green-500"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex items-center gap-1">
                        {passwordStrength.minLength ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <X className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className={passwordStrength.minLength ? "text-green-500" : "text-muted-foreground"}>
                          8+ characters
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {passwordStrength.hasUppercase ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <X className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className={passwordStrength.hasUppercase ? "text-green-500" : "text-muted-foreground"}>
                          Uppercase
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {passwordStrength.hasLowercase ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <X className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className={passwordStrength.hasLowercase ? "text-green-500" : "text-muted-foreground"}>
                          Lowercase
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {passwordStrength.hasNumber ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <X className="w-3 h-3 text-muted-foreground" />
                        )}
                        <span className={passwordStrength.hasNumber ? "text-green-500" : "text-muted-foreground"}>
                          Number
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    className="h-11 pr-12"
                    {...register("confirmPassword")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              {/* Terms */}
              <div className="flex items-start space-x-2 pt-2">
                <Checkbox
                  id="terms"
                  checked={termsValue}
                  onCheckedChange={(checked) => setValue("terms", checked as boolean)}
                  className="mt-0.5"
                />
                <Label htmlFor="terms" className="text-sm font-normal leading-snug cursor-pointer">
                  I agree to the{" "}
                  <Link to="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link to="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
              {errors.terms && (
                <p className="text-xs text-destructive">{errors.terms.message}</p>
              )}

              <Button type="submit" className="w-full h-11 mt-4" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Merchant Account"
                )}
              </Button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/merchant/login" className="text-primary font-medium hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
