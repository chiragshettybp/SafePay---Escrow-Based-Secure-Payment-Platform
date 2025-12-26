import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Flag,
  MessageSquare,
  ExternalLink,
  User,
  MapPin,
  CreditCard,
  Shield,
  FileText,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Seo } from '@/components/seo/Seo';
import {
  useAdminCheckout,
  CheckoutSession,
  CheckoutEvent,
  CheckoutAttempt,
  CheckoutRiskFlag,
  AdminCheckoutNote,
} from '@/hooks/useAdminCheckout';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface SessionDetails {
  session: CheckoutSession;
  events: CheckoutEvent[];
  attempts: CheckoutAttempt[];
  riskFlags: CheckoutRiskFlag[];
  order: any;
}

export default function AdminCheckoutSessionDetails() {
  const navigate = useNavigate();
  const { session_id } = useParams<{ session_id: string }>();
  const { toast } = useToast();
  const { fetchSessionDetails, flagSession, addSessionNote, fetchSessionNotes } = useAdminCheckout();

  const [isLoading, setIsLoading] = useState(true);
  const [details, setDetails] = useState<SessionDetails | null>(null);
  const [notes, setNotes] = useState<AdminCheckoutNote[]>([]);
  const [flagDialog, setFlagDialog] = useState(false);
  const [noteDialog, setNoteDialog] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    events: true,
    attempts: true,
    risk: true,
  });

  useEffect(() => {
    if (session_id) {
      loadDetails();
    }
  }, [session_id]);

  const loadDetails = async () => {
    if (!session_id) return;
    setIsLoading(true);
    const data = await fetchSessionDetails(session_id);
    if (data) {
      setDetails(data);
      const notesData = await fetchSessionNotes(session_id);
      setNotes(notesData);
    }
    setIsLoading(false);
  };

  const handleFlag = async () => {
    if (!session_id || !flagReason.trim()) return;
    setIsSubmitting(true);
    await flagSession(session_id, flagReason);
    setIsSubmitting(false);
    setFlagDialog(false);
    setFlagReason('');
    loadDetails();
  };

  const handleAddNote = async () => {
    if (!session_id || !noteText.trim()) return;
    setIsSubmitting(true);
    await addSessionNote(session_id, noteText);
    setIsSubmitting(false);
    setNoteDialog(false);
    setNoteText('');
    const notesData = await fetchSessionNotes(session_id);
    setNotes(notesData);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Copied to clipboard' });
  };

  const maskIdentifier = (value: string | null): string => {
    if (!value) return '-';
    if (value.includes('@')) {
      const [local, domain] = value.split('@');
      return `${local.slice(0, 2)}***@${domain}`;
    }
    if (value.length >= 10) {
      return `${value.slice(0, 3)}****${value.slice(-3)}`;
    }
    return value.slice(0, 3) + '***';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'expired':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
      case 'abandoned':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Abandoned</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Active</Badge>;
    }
  };

  const steps = ['login', 'address', 'payment', 'confirmation'];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!details) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <p className="text-muted-foreground mb-4">Session not found</p>
          <Button onClick={() => navigate('/admin/checkout/sessions')}>
            Back to Sessions
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const { session, events, attempts, riskFlags, order } = details;

  const getStepStatus = (step: string): 'completed' | 'current' | 'pending' | 'failed' => {
    const stepIndex = steps.indexOf(step);
    const currentIndex = steps.indexOf(session.current_step);
    
    if (session.status === 'completed') return 'completed';
    if (session.status === 'failed' && step === session.current_step) return 'failed';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <AdminLayout>
      <Seo title={`Session ${session_id?.slice(0, 8)} - Admin`} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/checkout/sessions')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Session Details</h1>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono text-muted-foreground">{session_id}</code>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(session_id!)}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadDetails}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNoteDialog(true)}>
              <MessageSquare className="h-4 w-4 mr-2" />
              Add Note
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFlagDialog(true)}>
              <Flag className="h-4 w-4 mr-2" />
              Flag
            </Button>
          </div>
        </div>

        {/* Session Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Session Summary
              </CardTitle>
              {getStatusBadge(session.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Merchant</p>
                <p className="font-medium">{session.merchant?.business_name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">User</p>
                <p className="font-medium">{maskIdentifier(session.phone_number || session.email)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="font-medium">₹{session.final_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-medium capitalize">{session.selected_payment_method || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{format(new Date(session.created_at), 'MMM d, yyyy HH:mm:ss')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Updated</p>
                <p className="font-medium">{format(new Date(session.updated_at), 'MMM d, yyyy HH:mm:ss')}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Attempts</p>
                <p className="font-medium">{session.payment_attempts}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Guest Checkout</p>
                <p className="font-medium">{session.is_guest ? 'Yes' : 'No'}</p>
              </div>
            </div>
            {session.last_payment_error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Last Error</p>
                <p className="text-sm text-red-700 dark:text-red-400">{session.last_payment_error}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step Progress */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Checkout Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const status = getStepStatus(step);
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                          status === 'completed'
                            ? 'bg-green-600 border-green-600 text-white'
                            : status === 'current'
                            ? 'bg-primary border-primary text-primary-foreground'
                            : status === 'failed'
                            ? 'bg-red-600 border-red-600 text-white'
                            : 'bg-muted border-muted-foreground/30'
                        }`}
                      >
                        {status === 'completed' ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : status === 'failed' ? (
                          <XCircle className="h-5 w-5" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <p className="text-xs mt-1 capitalize text-muted-foreground">{step}</p>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-2 ${
                          getStepStatus(steps[index + 1]) !== 'pending' ? 'bg-green-600' : 'bg-muted'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Event Timeline */}
          <Card>
            <Collapsible open={expandedSections.events} onOpenChange={(open) => setExpandedSections({ ...expandedSections, events: open })}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Event Timeline
                    </span>
                    <Badge variant="secondary">{events.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {events.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {events.map((event, index) => (
                        <div key={event.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                            {index < events.length - 1 && <div className="w-0.5 h-full bg-border" />}
                          </div>
                          <div className="flex-1 pb-3">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">{event.event_type}</p>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(event.created_at), 'HH:mm:ss')}
                              </span>
                            </div>
                            {event.step && (
                              <p className="text-xs text-muted-foreground">Step: {event.step}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No events recorded</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Payment Attempts */}
          <Card>
            <Collapsible open={expandedSections.attempts} onOpenChange={(open) => setExpandedSections({ ...expandedSections, attempts: open })}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50">
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Attempts
                    </span>
                    <Badge variant="secondary">{attempts.length}</Badge>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  {attempts.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {attempts.map((attempt) => (
                        <div
                          key={attempt.id}
                          className={`p-3 rounded-lg border ${
                            attempt.status === 'success'
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200'
                              : attempt.status === 'failed'
                              ? 'bg-red-50 dark:bg-red-900/20 border-red-200'
                              : 'bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {attempt.status === 'success' ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : attempt.status === 'failed' ? (
                                <XCircle className="h-4 w-4 text-red-600" />
                              ) : (
                                <Clock className="h-4 w-4 text-muted-foreground" />
                              )}
                              <span className="font-medium capitalize">{attempt.payment_method}</span>
                            </div>
                            <span className="text-sm font-medium">₹{attempt.amount.toLocaleString()}</span>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>Gateway: {attempt.gateway || '-'}</p>
                            <p>Time: {format(new Date(attempt.initiated_at), 'HH:mm:ss')}</p>
                            {attempt.error_message && (
                              <p className="text-red-600">Error: {attempt.error_message}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No payment attempts</p>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        </div>

        {/* Risk Flags */}
        <Card>
          <Collapsible open={expandedSections.risk} onOpenChange={(open) => setExpandedSections({ ...expandedSections, risk: open })}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Risk & Flags
                  </span>
                  <Badge variant={riskFlags.length > 0 ? 'destructive' : 'secondary'}>
                    {riskFlags.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                {riskFlags.length > 0 ? (
                  <div className="space-y-3">
                    {riskFlags.map((flag) => (
                      <div
                        key={flag.id}
                        className={`p-3 rounded-lg border ${
                          flag.severity === 'critical'
                            ? 'bg-red-50 dark:bg-red-900/20 border-red-200'
                            : flag.severity === 'high'
                            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200'
                            : flag.severity === 'medium'
                            ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200'
                            : 'bg-muted/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle
                              className={`h-4 w-4 ${
                                flag.severity === 'critical'
                                  ? 'text-red-600'
                                  : flag.severity === 'high'
                                  ? 'text-orange-600'
                                  : 'text-amber-600'
                              }`}
                            />
                            <span className="font-medium">{flag.flag_type}</span>
                          </div>
                          <Badge
                            variant={
                              flag.severity === 'critical' || flag.severity === 'high'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {flag.severity}
                          </Badge>
                        </div>
                        {flag.description && (
                          <p className="text-sm text-muted-foreground">{flag.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(flag.created_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No risk flags</p>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Admin Notes */}
        {notes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Admin Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {notes.map((note) => (
                  <div key={note.id} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm">{note.note}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(note.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Linked Order */}
        {order && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Linked Order
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                  <p className="text-sm text-muted-foreground">Status: {order.status}</p>
                </div>
                <Button variant="outline" onClick={() => navigate(`/admin/orders/${order.id}`)}>
                  View Order
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Flag Dialog */}
        <Dialog open={flagDialog} onOpenChange={setFlagDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Flag Session for Review</DialogTitle>
              <DialogDescription>
                Add a reason for flagging this session. This action is logged.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  placeholder="Describe why this session should be reviewed..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFlagDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleFlag} disabled={isSubmitting || !flagReason.trim()}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Flag Session
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Note Dialog */}
        <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Admin Note</DialogTitle>
              <DialogDescription>
                Add an internal note to this session. Visible to all admins.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter your note..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddNote} disabled={isSubmitting || !noteText.trim()}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}