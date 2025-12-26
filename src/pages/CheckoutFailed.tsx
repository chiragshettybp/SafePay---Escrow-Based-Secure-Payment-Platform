import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { XCircle, RefreshCw, CreditCard, Banknote, MessageCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Seo } from '@/components/seo/Seo';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentAttempt {
  id: string;
  payment_method: string;
  amount: number;
  status: string;
  error_message: string | null;
  initiated_at: string;
  gateway: string | null;
}

interface SessionData {
  id: string;
  status: string;
  merchant_id: string;
  final_amount: number;
  payment_attempts: number;
  last_payment_error: string | null;
  cod_available: boolean;
  user_id: string | null;
  selected_payment_method: string | null;
}

export default function CheckoutFailed() {
  const { session_id } = useParams<{ session_id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [lastAttempt, setLastAttempt] = useState<PaymentAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  const reason = searchParams.get('reason') || 'Payment could not be processed';

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

        // If session is not failed, redirect appropriately
        if (sessionData.status === 'completed') {
          navigate(`/checkout/${session_id}?step=confirmation`);
          return;
        }
        
        if (sessionData.status === 'expired') {
          navigate(`/checkout/${session_id}/expired`);
          return;
        }

        setSession(sessionData as SessionData);

        // Fetch last payment attempt
        const { data: attempts } = await supabase
          .from('checkout_attempts')
          .select('*')
          .eq('session_id', session_id)
          .order('initiated_at', { ascending: false })
          .limit(1);

        if (attempts && attempts.length > 0) {
          setLastAttempt(attempts[0] as PaymentAttempt);
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

  const handleRetryPayment = async () => {
    if (!session) return;
    
    // Check retry limits (max 5 attempts)
    if (session.payment_attempts >= 5) {
      toast({ 
        title: 'Retry limit reached',
        description: 'Please contact support for assistance.',
        variant: 'destructive'
      });
      return;
    }

    setRetrying(true);
    try {
      // Reset session for retry
      await supabase
        .from('checkout_sessions')
        .update({
          status: 'active',
          current_step: 'payment',
          last_payment_error: null
        })
        .eq('id', session_id);

      // Log retry event
      await supabase.from('checkout_events').insert({
        session_id: session_id,
        event_type: 'payment_retry',
        event_data: { attempt_number: session.payment_attempts + 1 }
      });

      toast({ title: 'Retrying payment...' });
      navigate(`/checkout/${session_id}`);
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast({ title: 'Failed to retry', variant: 'destructive' });
    } finally {
      setRetrying(false);
    }
  };

  const handleChangePaymentMethod = async () => {
    if (!session) return;

    try {
      // Clear selected payment method and go back to payment step
      await supabase
        .from('checkout_sessions')
        .update({
          status: 'active',
          current_step: 'payment',
          selected_payment_method: null,
          last_payment_error: null
        })
        .eq('id', session_id);

      // Log event
      await supabase.from('checkout_events').insert({
        session_id: session_id,
        event_type: 'payment_method_change',
        event_data: { previous_method: session.selected_payment_method }
      });

      navigate(`/checkout/${session_id}`);
    } catch (error) {
      console.error('Error changing payment method:', error);
      toast({ title: 'Failed to change payment method', variant: 'destructive' });
    }
  };

  const handleSwitchToCOD = async () => {
    if (!session || !session.cod_available) return;

    try {
      // Switch to COD
      await supabase
        .from('checkout_sessions')
        .update({
          status: 'active',
          current_step: 'payment',
          selected_payment_method: 'cod',
          last_payment_error: null
        })
        .eq('id', session_id);

      // Log COD switch (risk event)
      await supabase.from('checkout_events').insert({
        session_id: session_id,
        event_type: 'cod_switch_after_failure',
        event_data: { 
          previous_method: session.selected_payment_method,
          failure_reason: reason
        }
      });

      toast({ title: 'Switched to Cash on Delivery' });
      navigate(`/checkout/${session_id}`);
    } catch (error) {
      console.error('Error switching to COD:', error);
      toast({ title: 'Failed to switch to COD', variant: 'destructive' });
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

  const canRetry = session && session.payment_attempts < 5;
  const failureTime = lastAttempt?.initiated_at 
    ? new Date(lastAttempt.initiated_at).toLocaleString() 
    : 'Unknown';

  const getPaymentMethodLabel = (method: string | null) => {
    switch (method) {
      case 'upi': return 'UPI';
      case 'card': return 'Card';
      case 'netbanking': return 'Net Banking';
      case 'wallet': return 'Wallet';
      case 'cod': return 'Cash on Delivery';
      default: return method || 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Seo title="Payment Failed" />
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {/* Failure State Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Payment Failed</h2>
            <p className="text-muted-foreground text-sm">
              {reason}
            </p>
          </div>

          {/* Attempt Summary */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Amount</span>
              <span className="font-medium">₹{session?.final_amount?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-muted-foreground">Payment Method</span>
              <span className="text-sm">{getPaymentMethodLabel(session?.selected_payment_method)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Attempts</span>
              <span className="text-sm">{session?.payment_attempts || 0} / 5</span>
            </div>

            {/* Expandable Details */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-1 text-xs text-muted-foreground mt-3 hover:text-foreground transition-colors"
            >
              {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {showDetails ? 'Hide details' : 'Show details'}
            </button>

            {showDetails && lastAttempt && (
              <div className="mt-3 pt-3 border-t border-border space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span>{failureTime}</span>
                </div>
                {lastAttempt.gateway && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gateway</span>
                    <span className="capitalize">{lastAttempt.gateway}</span>
                  </div>
                )}
                {lastAttempt.error_message && (
                  <div className="mt-2">
                    <span className="text-muted-foreground">Error: </span>
                    <span className="text-destructive">{lastAttempt.error_message}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recovery Actions */}
          <div className="flex flex-col gap-2">
            {canRetry && (
              <Button 
                onClick={handleRetryPayment} 
                className="gap-2"
                disabled={retrying}
              >
                {retrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Retry Payment
              </Button>
            )}
            
            <Button 
              variant="outline" 
              onClick={handleChangePaymentMethod}
              className="gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Change Payment Method
            </Button>

            {session?.cod_available && session?.selected_payment_method !== 'cod' && (
              <Button 
                variant="outline" 
                onClick={handleSwitchToCOD}
                className="gap-2"
              >
                <Banknote className="h-4 w-4" />
                Switch to Cash on Delivery
              </Button>
            )}

            <Button 
              variant="ghost" 
              onClick={handleContactSupport}
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Contact Support
            </Button>
          </div>

          {!canRetry && (
            <p className="text-xs text-destructive text-center mt-4">
              Maximum retry attempts reached. Please contact support.
            </p>
          )}

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
