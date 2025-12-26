import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, Shield, Loader2, UserCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Seo } from '@/components/seo/Seo';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MerchantData {
  business_name: string;
  logo_url: string | null;
}

export default function CheckoutLogin() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const sessionId = searchParams.get('session');
  const merchantId = searchParams.get('merchant');

  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [guestAllowed, setGuestAllowed] = useState(true);

  // Check for existing session
  useEffect(() => {
    const checkSession = async () => {
      // Check if user is already logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user && sessionId) {
        // User is logged in, redirect to checkout
        navigate(`/checkout/${sessionId}`);
        return;
      }

      // Fetch merchant details if provided
      if (merchantId) {
        const { data } = await supabase
          .from('merchants')
          .select('business_name, logo_url')
          .eq('id', merchantId)
          .single();
        
        if (data) {
          setMerchant(data);
        }
      }

      // If session exists, fetch its details
      if (sessionId) {
        const { data: session } = await supabase
          .from('checkout_sessions')
          .select('user_id, status, merchant_id')
          .eq('id', sessionId)
          .single();

        if (session) {
          if (session.status === 'completed') {
            navigate(`/checkout/${sessionId}?step=confirmation`);
            return;
          }
          if (session.status === 'expired') {
            navigate(`/checkout/${sessionId}/expired`);
            return;
          }
          if (session.user_id) {
            // Session already has a user, redirect to checkout
            navigate(`/checkout/${sessionId}`);
            return;
          }

          // Fetch merchant from session if not provided
          if (!merchantId && session.merchant_id) {
            const { data } = await supabase
              .from('merchants')
              .select('business_name, logo_url')
              .eq('id', session.merchant_id)
              .single();
            
            if (data) {
              setMerchant(data);
            }
          }
        }
      }
    };

    checkSession();
  }, [sessionId, merchantId, navigate]);

  // OTP cooldown timer
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  const handleSendOtp = async () => {
    if (phoneNumber.length !== 10) {
      toast({ title: 'Enter a valid 10-digit phone number', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Check OTP rate limits
      const { count } = await supabase
        .from('checkout_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'otp_sent')
        .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

      if (count && count >= 5) {
        toast({ 
          title: 'Too many OTP requests',
          description: 'Please try again later.',
          variant: 'destructive'
        });
        return;
      }

      // Send OTP via Supabase Auth
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${phoneNumber}`,
      });

      if (error) throw error;

      // Log OTP sent event
      if (sessionId) {
        await supabase.from('checkout_events').insert({
          session_id: sessionId,
          event_type: 'otp_sent',
          event_data: { phone: phoneNumber.slice(-4) }
        });

        await supabase
          .from('checkout_sessions')
          .update({ 
            phone_number: phoneNumber,
            otp_sent_at: new Date().toISOString(),
            otp_attempts: 0
          })
          .eq('id', sessionId);
      }

      setOtpSent(true);
      setStep('otp');
      setOtpCooldown(60);
      toast({ title: 'OTP sent successfully' });
    } catch (error: any) {
      console.error('Error sending OTP:', error);
      toast({ 
        title: 'Failed to send OTP',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({ title: 'Enter the 6-digit OTP', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Verify OTP
      const { data, error } = await supabase.auth.verifyOtp({
        phone: `+91${phoneNumber}`,
        token: otp,
        type: 'sms'
      });

      if (error) throw error;

      if (data.user) {
        // Link user to session
        if (sessionId) {
          await supabase
            .from('checkout_sessions')
            .update({ 
              user_id: data.user.id,
              otp_verified: true,
              current_step: 'address'
            })
            .eq('id', sessionId);

          // Log verification event
          await supabase.from('checkout_events').insert({
            session_id: sessionId,
            event_type: 'otp_verified',
            event_data: { user_id: data.user.id }
          });

          toast({ title: 'Verified successfully' });
          navigate(`/checkout/${sessionId}`);
        } else {
          // No session, just show success
          toast({ title: 'Logged in successfully' });
          navigate('/');
        }
      }
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      
      // Increment OTP attempts - just update directly
      if (sessionId) {
        const { data: currentSession } = await supabase
          .from('checkout_sessions')
          .select('otp_attempts')
          .eq('id', sessionId)
          .single();
        
        if (currentSession) {
          await supabase
            .from('checkout_sessions')
            .update({ otp_attempts: (currentSession.otp_attempts || 0) + 1 })
            .eq('id', sessionId);
        }
      }

      toast({ 
        title: 'Invalid OTP',
        description: 'Please check and try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAsGuest = async () => {
    if (!sessionId) {
      toast({ title: 'No checkout session found', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      // Mark session as guest
      await supabase
        .from('checkout_sessions')
        .update({ 
          is_guest: true,
          current_step: 'address'
        })
        .eq('id', sessionId);

      // Log guest event
      await supabase.from('checkout_events').insert({
        session_id: sessionId,
        event_type: 'guest_checkout',
        event_data: {}
      });

      toast({ title: 'Continuing as guest' });
      navigate(`/checkout/${sessionId}`);
    } catch (error) {
      console.error('Error continuing as guest:', error);
      toast({ title: 'Failed to continue', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Seo title="Continue Checkout" />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-2">
          {/* Merchant Branding */}
          {merchant && (
            <div className="flex items-center justify-center gap-2 mb-4">
              {merchant.logo_url ? (
                <img src={merchant.logo_url} alt={merchant.business_name} className="w-10 h-10 rounded-lg object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">{merchant.business_name[0]}</span>
                </div>
              )}
              <span className="text-sm text-muted-foreground">{merchant.business_name}</span>
            </div>
          )}
          
          <CardTitle className="text-xl">Continue Checkout</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {step === 'phone' 
              ? 'Enter your phone number to proceed'
              : 'Enter the OTP sent to your phone'
            }
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {step === 'phone' ? (
            <>
              {/* Phone Input */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-muted rounded-md border border-input">
                    <span className="text-sm text-muted-foreground">+91</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter 10-digit number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="flex-1"
                  />
                </div>
              </div>

              <Button 
                onClick={handleSendOtp} 
                className="w-full gap-2"
                disabled={loading || phoneNumber.length !== 10}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
                Send OTP
              </Button>

              {/* Guest Option */}
              {guestAllowed && sessionId && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or</span>
                  </div>
                </div>
              )}

              {guestAllowed && sessionId && (
                <Button 
                  variant="outline" 
                  onClick={handleContinueAsGuest}
                  className="w-full gap-2"
                  disabled={loading}
                >
                  <UserCircle className="h-4 w-4" />
                  Continue as Guest
                </Button>
              )}
            </>
          ) : (
            <>
              {/* OTP Input */}
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    OTP sent to +91 {phoneNumber.slice(0, 2)}****{phoneNumber.slice(-4)}
                  </p>
                  <InputOTP
                    value={otp}
                    onChange={setOtp}
                    maxLength={6}
                    className="justify-center"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <Button 
                  onClick={handleVerifyOtp}
                  className="w-full gap-2"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  Verify & Continue
                </Button>

                {/* Resend OTP */}
                <div className="text-center">
                  {otpCooldown > 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Resend OTP in {otpCooldown}s
                    </p>
                  ) : (
                    <Button
                      variant="link"
                      onClick={handleSendOtp}
                      disabled={loading}
                      className="text-sm"
                    >
                      Resend OTP
                    </Button>
                  )}
                </div>

                {/* Change Number */}
                <Button
                  variant="ghost"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                  }}
                  className="w-full text-sm"
                >
                  Change Phone Number
                </Button>
              </div>
            </>
          )}

          {/* Security Notice */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Your order details will be saved securely. We use industry-standard encryption.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
