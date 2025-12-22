import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, AlertCircle, Lock, Mail, Key } from 'lucide-react';
import { z } from 'zod';
import { Seo } from '@/components/seo/Seo';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  pin: z.string().length(6, 'PIN must be 6 digits').regex(/^\d+$/, 'PIN must contain only numbers'),
});

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading: authLoading } = useAdminAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; pin?: string; general?: string }>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const validateForm = (): boolean => {
    try {
      loginSchema.parse({ email, password, pin });
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: typeof errors = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as keyof typeof errors;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setErrors({});
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    const { error } = await login(email, password, pin);

    if (error) {
      setErrors({ general: error });
      setIsLoading(false);
    } else {
      navigate('/admin/dashboard', { replace: true });
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
    if (errors.pin) {
      setErrors((prev) => ({ ...prev, pin: undefined }));
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Seo 
        title="Admin Login"
        description="Secure admin access portal"
        noIndex={true}
      />
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold">Admin Login</CardTitle>
              <CardDescription className="mt-2">
                Restricted access. Authorized personnel only.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {errors.general && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  disabled={isLoading}
                  className={errors.email ? 'border-destructive' : ''}
                  autoComplete="email"
                  autoFocus
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={handlePasswordChange}
                  disabled={isLoading}
                  className={errors.password ? 'border-destructive' : ''}
                  autoComplete="current-password"
                />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="pin" className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  Security PIN (6 digits)
                </Label>
                <Input
                  id="pin"
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="••••••"
                  value={pin}
                  onChange={handlePinChange}
                  disabled={isLoading}
                  className={errors.pin ? 'border-destructive' : ''}
                  maxLength={6}
                  autoComplete="off"
                />
                {errors.pin && (
                  <p className="text-sm text-destructive">{errors.pin}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base font-medium"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <p className="text-xs text-center text-muted-foreground">
                This is a restricted area. All login attempts are monitored and logged.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
