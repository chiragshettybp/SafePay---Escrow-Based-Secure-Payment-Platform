import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Clock, RefreshCw, Home, MessageCircle, ShoppingBag, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Seo } from '@/components/seo/Seo';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  name: string;
  quantity: number;
  price: number;
}

interface SessionData {
  id: string;
  status: string;
  merchant_id: string;
  cart_data: { items: CartItem[] };
  cart_total: number;
  final_amount: number;
  expires_at: string;
  user_id: string | null;
  phone_number: string | null;
}

interface MerchantData {
  business_name: string;
  logo_url: string | null;
}

export default function CheckoutExpired() {
  const { session_id } = useParams<{ session_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    if (!session_id) {
      navigate('/');
      return;
    }

    const fetchSession = async () => {
      try {
        const { data: sessionData, error: sessionError } = await supabase
          .from('checkout_sessions')
          .select('*')
          .eq('id', session_id)
          .single();

        if (sessionError || !sessionData) {
          toast({ title: 'Session not found', variant: 'destructive' });
          navigate('/');
          return;
        }

        // If session is not expired, redirect back to checkout
        if (sessionData.status !== 'expired') {
          navigate(`/checkout/${session_id}`);
          return;
        }

        const cartData = typeof sessionData.cart_data === 'object' && sessionData.cart_data !== null
          ? sessionData.cart_data as unknown as { items: CartItem[] }
          : { items: [] };
        
        setSession({
          ...sessionData,
          cart_data: cartData
        });

        // Fetch merchant details
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('business_name, logo_url')
          .eq('id', sessionData.merchant_id)
          .single();

        if (merchantData) {
          setMerchant(merchantData);
        }
      } catch (error) {
        console.error('Error fetching session:', error);
        toast({ title: 'Failed to load session', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [session_id, navigate, toast]);

  const handleRestartCheckout = async () => {
    if (!session) return;
    
    setRestarting(true);
    try {
      // Create new checkout session with same cart data
      const currentStep = session.user_id ? 'address' : 'login';
      
      const { data: newSession, error } = await supabase
        .from('checkout_sessions')
        .insert({
          merchant_id: session.merchant_id,
          cart_data: session.cart_data as any,
          cart_total: session.cart_total,
          final_amount: session.final_amount,
          user_id: session.user_id,
          phone_number: session.phone_number,
          status: 'active' as const,
          current_step: currentStep as any,
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          metadata: { supersedes: session_id } as any
        })
        .select('id')
        .single();

      if (error) throw error;

      // Mark old session as superseded
      await supabase
        .from('checkout_sessions')
        .update({ 
          status: 'abandoned',
          metadata: { superseded_by: newSession.id }
        })
        .eq('id', session_id);

      // Log event
      await supabase.from('checkout_events').insert({
        session_id: session_id,
        event_type: 'session_restarted',
        event_data: { new_session_id: newSession.id }
      });

      toast({ title: 'New checkout session created' });
      navigate(`/checkout/${newSession.id}`);
    } catch (error) {
      console.error('Error restarting checkout:', error);
      toast({ title: 'Failed to restart checkout', variant: 'destructive' });
    } finally {
      setRestarting(false);
    }
  };

  const handleContactSupport = () => {
    toast({
      title: 'Contact support for assistance',
      description: `Session ID: ${session_id?.slice(0, 8)}...`
    });
    navigate('/support');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cartItems = session?.cart_data?.items || [];
  const expiryTime = session?.expires_at ? new Date(session.expires_at).toLocaleString() : 'Unknown';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Seo title="Session Expired" />
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {/* Status Indicator */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Checkout Session Expired</h2>
            <p className="text-muted-foreground text-sm">
              This session expired due to inactivity or timeout.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Expired at: {expiryTime}
            </p>
          </div>

          {/* Session Summary */}
          {merchant && (
            <div className="bg-muted/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-3 mb-3">
                {merchant.logo_url ? (
                  <img src={merchant.logo_url} alt={merchant.business_name} className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{merchant.business_name}</p>
                  <p className="text-xs text-muted-foreground">{cartItems.length} item(s)</p>
                </div>
              </div>
              
              {cartItems.length > 0 && (
                <div className="space-y-2 border-t border-border pt-3">
                  {cartItems.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                      <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                  {cartItems.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{cartItems.length - 3} more items</p>
                  )}
                  <div className="flex justify-between font-medium pt-2 border-t border-border">
                    <span>Total</span>
                    <span>₹{session?.final_amount?.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleRestartCheckout} 
              className="gap-2"
              disabled={restarting}
            >
              {restarting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Restart Checkout
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="gap-2">
              <Home className="h-4 w-4" />
              Go Back to Store
            </Button>
            <Button variant="ghost" onClick={handleContactSupport} className="gap-2">
              <MessageCircle className="h-4 w-4" />
              Contact Support
            </Button>
          </div>

          {/* Session ID */}
          {session_id && (
            <p className="text-xs text-muted-foreground text-center mt-6">
              Session ID: {session_id.slice(0, 8)}...
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
