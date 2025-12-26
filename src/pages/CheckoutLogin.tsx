import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Phone, Shield, Loader2, UserCircle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [loading, setLoading] = useState(false);
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
          .select('user_id, status, merchant_id, phone_number')
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
          // If phone already collected, go to checkout
          if (session.phone_number) {
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

  const handleContinue = async () => {
    if (phoneNumber.length !== 10) {
      toast({ title: 'Enter a valid 10-digit phone number', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const formattedPhone = `+91${phoneNumber}`;

      // Update session with phone number and move to address step
      if (sessionId) {
        // Check if user exists with this phone
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', formattedPhone)
          .maybeSingle();

        await supabase
          .from('checkout_sessions')
          .update({ 
            phone_number: formattedPhone,
            current_step: 'address',
            user_id: existingUser?.id || null
          })
          .eq('id', sessionId);

        // Log event
        await supabase.from('checkout_events').insert({
          session_id: sessionId,
          event_type: 'phone_collected',
          event_data: { phone: phoneNumber.slice(-4) }
        });

        toast({ title: 'Phone number saved' });
        navigate(`/checkout/${sessionId}`);
      } else {
        toast({ title: 'No checkout session found', variant: 'destructive' });
      }
    } catch (error: any) {
      console.error('Error saving phone:', error);
      toast({ 
        title: 'Failed to continue',
        description: error.message,
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
            Enter your phone number to proceed
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
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
            onClick={handleContinue} 
            className="w-full gap-2"
            disabled={loading || phoneNumber.length !== 10}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            Continue
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

          {/* Security Notice */}
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Your phone number is used for order updates and support. We use industry-standard encryption.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}