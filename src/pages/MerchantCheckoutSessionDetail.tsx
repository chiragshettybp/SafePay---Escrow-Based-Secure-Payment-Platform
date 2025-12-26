import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Clock, 
  User, 
  MapPin, 
  CreditCard, 
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Flag,
  MessageCircle,
  Smartphone,
  Globe,
  ShieldAlert,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantCheckoutSession, CheckoutEvent, CheckoutAttempt } from '@/hooks/useMerchantCheckout';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';

const STEPS = ['login', 'address', 'payment', 'confirmation'];

export default function MerchantCheckoutSessionDetail() {
  const { session_id } = useParams<{ session_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { session, events, attempts, riskFlags, isLoading, refetch } = useMerchantCheckoutSession(session_id);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    steps: true,
    timeline: true,
    payment: true,
    actions: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleRetryPayment = async () => {
    if (!session) return;
    
    if (session.payment_attempts >= 5) {
      toast({ title: 'Maximum retry attempts reached', variant: 'destructive' });
      return;
    }

    try {
      await supabase
        .from('checkout_sessions')
        .update({
          status: 'active',
          current_step: 'payment',
          last_payment_error: null,
        })
        .eq('id', session.id);

      await supabase.from('checkout_events').insert({
        session_id: session.id,
        event_type: 'merchant_retry_initiated',
        event_data: { attempt_number: session.payment_attempts + 1 },
      });

      toast({ title: 'Session reopened for payment retry' });
      refetch();
    } catch (error) {
      toast({ title: 'Failed to retry payment', variant: 'destructive' });
    }
  };

  const handleMarkReviewed = async () => {
    if (!session) return;

    try {
      await supabase.from('checkout_events').insert({
        session_id: session.id,
        event_type: 'merchant_reviewed',
        event_data: { reviewed_at: new Date().toISOString() },
      });

      toast({ title: 'Session marked as reviewed' });
      refetch();
    } catch (error) {
      toast({ title: 'Failed to mark as reviewed', variant: 'destructive' });
    }
  };

  const handleAddNote = async () => {
    if (!session || !note.trim()) return;

    setSavingNote(true);
    try {
      await supabase.from('checkout_events').insert({
        session_id: session.id,
        event_type: 'merchant_note',
        event_data: { note: note.trim() },
      });

      toast({ title: 'Note added' });
      setNote('');
      refetch();
    } catch (error) {
      toast({ title: 'Failed to add note', variant: 'destructive' });
    } finally {
      setSavingNote(false);
    }
  };

  const handleFlagIssue = async () => {
    if (!session) return;

    try {
      await supabase.from('checkout_risk_flags').insert({
        session_id: session.id,
        flag_type: 'merchant_flagged',
        severity: 'high',
        description: 'Flagged for review by merchant',
      });

      toast({ title: 'Session flagged' });
      refetch();
    } catch (error) {
      toast({ title: 'Failed to flag session', variant: 'destructive' });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'expired':
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      default:
        return <Clock className="h-5 w-5 text-primary" />;
    }
  };

  const getStepStatus = (step: string) => {
    if (!session) return 'pending';
    const stepIndex = STEPS.indexOf(step);
    const currentIndex = STEPS.indexOf(session.current_step);
    
    if (session.status === 'completed') return 'completed';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) {
      if (session.status === 'failed' && step === 'payment') return 'failed';
      return 'current';
    }
    return 'pending';
  };

  const getEventIcon = (eventType: string) => {
    if (eventType.includes('otp')) return User;
    if (eventType.includes('address')) return MapPin;
    if (eventType.includes('payment')) return CreditCard;
    if (eventType.includes('error') || eventType.includes('fail')) return XCircle;
    if (eventType.includes('success') || eventType.includes('complete')) return CheckCircle;
    return Clock;
  };

  const maskData = (data: string | null, type: 'phone' | 'email' | 'ip') => {
    if (!data) return '-';
    switch (type) {
      case 'phone':
        return data.slice(0, 3) + '****' + data.slice(-4);
      case 'email':
        const [local, domain] = data.split('@');
        return local ? local.slice(0, 2) + '***@' + (domain || '') : data;
      case 'ip':
        return data.split('.').slice(0, 2).join('.') + '.*.*';
    }
  };

  if (isLoading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MerchantLayout>
    );
  }

  if (!session) {
    return (
      <MerchantLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Session not found</p>
          <Button className="mt-4" onClick={() => navigate('/merchant/checkout/sessions')}>
            Back to Sessions
          </Button>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Seo title={`Session ${session.id.slice(0, 8)}`} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/merchant/checkout/sessions')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {getStatusIcon(session.status)}
              <h1 className="text-xl font-bold">Session Details</h1>
              <Badge variant={session.status === 'completed' ? 'secondary' : session.status === 'failed' ? 'destructive' : 'outline'}>
                {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-1">{session.id}</p>
          </div>
        </div>

        {/* Risk Flags */}
        {riskFlags && riskFlags.length > 0 && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <ShieldAlert className="h-5 w-5" />
                <span className="font-medium">Risk Flags ({riskFlags.length})</span>
              </div>
              <div className="mt-2 space-y-1">
                {riskFlags.map((flag: any) => (
                  <p key={flag.id} className="text-sm text-amber-600 dark:text-amber-300">
                    • {flag.flag_type}: {flag.description || 'No description'}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Session Overview */}
            <CollapsibleSection
              title="Session Overview"
              expanded={expandedSections.overview}
              onToggle={() => toggleSection('overview')}
            >
              <div className="grid sm:grid-cols-2 gap-4">
                <InfoItem label="Session ID" value={session.id.slice(0, 16) + '...'} mono />
                <InfoItem label="Status" value={session.status} />
                <InfoItem label="Amount" value={`₹${session.final_amount.toLocaleString()}`} />
                <InfoItem label="Cart Total" value={`₹${session.cart_total.toLocaleString()}`} />
                <InfoItem label="User" value={maskData(session.phone_number, 'phone')} />
                <InfoItem label="Email" value={maskData(session.email, 'email')} />
                <InfoItem label="Guest" value={session.is_guest ? 'Yes' : 'No'} />
                <InfoItem label="COD Available" value={session.cod_available ? 'Yes' : 'No'} />
                <InfoItem label="Created" value={format(new Date(session.created_at), 'MMM d, yyyy HH:mm')} />
                <InfoItem label="Updated" value={format(new Date(session.updated_at), 'MMM d, yyyy HH:mm')} />
                {session.completed_at && (
                  <InfoItem label="Completed" value={format(new Date(session.completed_at), 'MMM d, yyyy HH:mm')} />
                )}
                <InfoItem label="Expires" value={format(new Date(session.expires_at), 'MMM d, yyyy HH:mm')} />
              </div>
              
              {/* Device Info */}
              <Separator className="my-4" />
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Device:</span>
                  <span className="truncate">{session.user_agent?.slice(0, 50) || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">IP:</span>
                  <span>{maskData(session.ip_address, 'ip')}</span>
                </div>
              </div>
            </CollapsibleSection>

            {/* Step Progress */}
            <CollapsibleSection
              title="Checkout Progress"
              expanded={expandedSections.steps}
              onToggle={() => toggleSection('steps')}
            >
              <div className="flex items-center justify-between">
                {STEPS.map((step, index) => {
                  const status = getStepStatus(step);
                  return (
                    <div key={step} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            status === 'completed'
                              ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
                              : status === 'current'
                              ? 'bg-primary text-primary-foreground'
                              : status === 'failed'
                              ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {status === 'completed' ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : status === 'failed' ? (
                            <XCircle className="h-5 w-5" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <span className="text-xs mt-2 capitalize">{step}</span>
                      </div>
                      {index < STEPS.length - 1 && (
                        <div
                          className={`w-full h-1 mx-2 ${
                            getStepStatus(STEPS[index + 1]) !== 'pending'
                              ? 'bg-green-500'
                              : 'bg-muted'
                          }`}
                          style={{ minWidth: '40px' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CollapsibleSection>

            {/* Event Timeline */}
            <CollapsibleSection
              title="Event Timeline"
              expanded={expandedSections.timeline}
              onToggle={() => toggleSection('timeline')}
            >
              {events && events.length > 0 ? (
                <div className="space-y-3">
                  {events.map((event, index) => (
                    <EventItem key={event.id} event={event} isLast={index === events.length - 1} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No events recorded
                </p>
              )}
            </CollapsibleSection>

            {/* Payment Attempts */}
            <CollapsibleSection
              title="Payment Attempts"
              expanded={expandedSections.payment}
              onToggle={() => toggleSection('payment')}
            >
              {attempts && attempts.length > 0 ? (
                <div className="space-y-3">
                  {attempts.map((attempt) => (
                    <AttemptItem key={attempt.id} attempt={attempt} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No payment attempts
                </p>
              )}
            </CollapsibleSection>
          </div>

          {/* Actions Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {session.status === 'failed' && session.payment_attempts < 5 && (
                  <Button className="w-full gap-2" onClick={handleRetryPayment}>
                    <RefreshCw className="h-4 w-4" />
                    Retry Payment
                  </Button>
                )}
                
                <Button variant="outline" className="w-full gap-2" onClick={handleMarkReviewed}>
                  <CheckCircle className="h-4 w-4" />
                  Mark as Reviewed
                </Button>
                
                <Button variant="outline" className="w-full gap-2" onClick={handleFlagIssue}>
                  <Flag className="h-4 w-4" />
                  Flag Issue
                </Button>
                
                <Button variant="outline" className="w-full gap-2" onClick={() => navigate('/merchant/support/create')}>
                  <MessageCircle className="h-4 w-4" />
                  Create Support Ticket
                </Button>

                {session.order_id && (
                  <Button variant="secondary" className="w-full" onClick={() => navigate(`/merchant/order/${session.order_id}`)}>
                    View Order
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Add Note */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Note</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  placeholder="Add an internal note..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                />
                <Button
                  className="w-full gap-2"
                  onClick={handleAddNote}
                  disabled={!note.trim() || savingNote}
                >
                  {savingNote ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add Note
                </Button>
              </CardContent>
            </Card>

            {/* Quick Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Attempts</span>
                  <span className="font-medium">{session.payment_attempts} / 5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">OTP Attempts</span>
                  <span className="font-medium">{session.otp_attempts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Pincode</span>
                  <span className="font-medium">{session.shipping_pincode || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method</span>
                  <span className="font-medium">{session.selected_payment_method?.toUpperCase() || '-'}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
}

// Collapsible Section Component
function CollapsibleSection({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader
        className="cursor-pointer flex flex-row items-center justify-between py-4"
        onClick={onToggle}
      >
        <CardTitle className="text-lg">{title}</CardTitle>
        {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </CardHeader>
      {expanded && <CardContent>{children}</CardContent>}
    </Card>
  );
}

// Info Item Component
function InfoItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-medium ${mono ? 'font-mono text-sm' : ''}`}>{value}</p>
    </div>
  );
}

// Event Item Component
function EventItem({ event, isLast }: { event: CheckoutEvent; isLast: boolean }) {
  const Icon = (() => {
    if (event.event_type.includes('otp')) return User;
    if (event.event_type.includes('address')) return MapPin;
    if (event.event_type.includes('payment')) return CreditCard;
    if (event.event_type.includes('error') || event.event_type.includes('fail')) return XCircle;
    if (event.event_type.includes('success') || event.event_type.includes('complete')) return CheckCircle;
    if (event.event_type.includes('note')) return MessageCircle;
    return Clock;
  })();

  const isError = event.event_type.includes('error') || event.event_type.includes('fail');
  const isSuccess = event.event_type.includes('success') || event.event_type.includes('complete');

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isError
              ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
              : isSuccess
              ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
              : 'bg-muted'
          }`}
        >
          <Icon className="h-4 w-4" />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-muted my-1" />}
      </div>
      <div className="flex-1 pb-4">
        <p className="font-medium text-sm">{event.event_type.replace(/_/g, ' ')}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(event.created_at), 'MMM d, HH:mm:ss')}
        </p>
        {event.event_data && Object.keys(event.event_data).length > 0 && (
          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">
            {JSON.stringify(event.event_data, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// Attempt Item Component
function AttemptItem({ attempt }: { attempt: CheckoutAttempt }) {
  const isSuccess = attempt.status === 'success';
  const isFailed = attempt.status === 'failed';

  return (
    <div className={`p-3 rounded-lg border ${isFailed ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {isSuccess ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : isFailed ? (
            <XCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Clock className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="font-medium capitalize">{attempt.payment_method}</span>
        </div>
        <Badge variant={isSuccess ? 'secondary' : isFailed ? 'destructive' : 'outline'}>
          {attempt.status}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Amount:</span>
          <span className="ml-1">₹{attempt.amount.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Gateway:</span>
          <span className="ml-1">{attempt.gateway || '-'}</span>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">Time:</span>
          <span className="ml-1">{format(new Date(attempt.initiated_at), 'MMM d, HH:mm:ss')}</span>
        </div>
      </div>
      {attempt.error_message && (
        <p className="text-xs text-red-600 mt-2">
          Error: {attempt.error_code} - {attempt.error_message}
        </p>
      )}
    </div>
  );
}
