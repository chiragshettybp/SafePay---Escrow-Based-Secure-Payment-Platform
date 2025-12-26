import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  ChevronRight,
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  Flag,
  MessageSquare,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Seo } from '@/components/seo/Seo';
import { useAdminCheckout, SessionFilters, CheckoutSession } from '@/hooks/useAdminCheckout';
import { format } from 'date-fns';

export default function AdminCheckoutSessions() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { sessions, totalCount, isLoading, fetchSessions, flagSession, addSessionNote } =
    useAdminCheckout();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState<SessionFilters>({
    status: searchParams.get('status') ? [searchParams.get('status')!] : undefined,
    riskFlagged: searchParams.get('riskFlagged') === 'true' ? true : undefined,
  });
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [flagDialog, setFlagDialog] = useState<string | null>(null);
  const [noteDialog, setNoteDialog] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('');
  const [noteText, setNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSessions({ ...filters, search: search || undefined }, page);
  }, [filters, page, search, fetchSessions]);

  const handleSearch = () => {
    setPage(1);
    fetchSessions({ ...filters, search: search || undefined }, 1);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearch('');
    setSearchParams({});
    setPage(1);
  };

  const handleFlag = async () => {
    if (!flagDialog || !flagReason.trim()) return;
    setIsSubmitting(true);
    await flagSession(flagDialog, flagReason);
    setIsSubmitting(false);
    setFlagDialog(null);
    setFlagReason('');
  };

  const handleAddNote = async () => {
    if (!noteDialog || !noteText.trim()) return;
    setIsSubmitting(true);
    await addSessionNote(noteDialog, noteText);
    setIsSubmitting(false);
    setNoteDialog(null);
    setNoteText('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case 'abandoned':
        return (
          <Badge variant="outline">
            <Clock className="h-3 w-3 mr-1" />
            Abandoned
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Active
          </Badge>
        );
    }
  };

  const getStepBadge = (step: string) => {
    const colors: Record<string, string> = {
      login: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      address: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
      payment: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      confirmation: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    };
    return (
      <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[step] || 'bg-muted'}`}>
        {step}
      </span>
    );
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

  return (
    <AdminLayout>
      <Seo title="Admin - Checkout Sessions" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin/checkout')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Checkout Sessions</h1>
              <p className="text-muted-foreground">
                {totalCount.toLocaleString()} total sessions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fetchSessions(filters, page)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by ID, phone, or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleSearch}>Search</Button>
              </div>

              <Sheet open={showFilters} onOpenChange={setShowFilters}>
                <SheetTrigger asChild>
                  <Button variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                    {Object.keys(filters).filter((k) => filters[k as keyof SessionFilters]).length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {Object.keys(filters).filter((k) => filters[k as keyof SessionFilters]).length}
                      </Badge>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Filter Sessions</SheetTitle>
                    <SheetDescription>Narrow down your search</SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4 mt-6">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={filters.status?.[0] || 'all'}
                        onValueChange={(v) =>
                          setFilters({ ...filters, status: v === 'all' ? undefined : [v] })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="expired">Expired</SelectItem>
                          <SelectItem value="abandoned">Abandoned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Failure Stage</Label>
                      <Select
                        value={filters.failureStage || 'all'}
                        onValueChange={(v) =>
                          setFilters({ ...filters, failureStage: v === 'all' ? undefined : v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All stages" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Stages</SelectItem>
                          <SelectItem value="login">Login</SelectItem>
                          <SelectItem value="address">Address</SelectItem>
                          <SelectItem value="payment">Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Payment Method</Label>
                      <Select
                        value={filters.paymentMethod || 'all'}
                        onValueChange={(v) =>
                          setFilters({ ...filters, paymentMethod: v === 'all' ? undefined : v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All methods" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Methods</SelectItem>
                          <SelectItem value="upi">UPI</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="wallet">Wallet</SelectItem>
                          <SelectItem value="netbanking">NetBanking</SelectItem>
                          <SelectItem value="emi">EMI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" className="flex-1" onClick={handleClearFilters}>
                        Clear All
                      </Button>
                      <Button className="flex-1" onClick={() => setShowFilters(false)}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Active Filters */}
            {(filters.status || filters.failureStage || filters.paymentMethod) && (
              <div className="flex flex-wrap gap-2 mt-3">
                {filters.status?.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1">
                    Status: {s}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setFilters({ ...filters, status: undefined })}
                    />
                  </Badge>
                ))}
                {filters.failureStage && (
                  <Badge variant="secondary" className="gap-1">
                    Stage: {filters.failureStage}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setFilters({ ...filters, failureStage: undefined })}
                    />
                  </Badge>
                )}
                {filters.paymentMethod && (
                  <Badge variant="secondary" className="gap-1">
                    Method: {filters.paymentMethod}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setFilters({ ...filters, paymentMethod: undefined })}
                    />
                  </Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sessions List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onView={() => navigate(`/admin/checkout/session/${session.id}`)}
                onFlag={() => setFlagDialog(session.id)}
                onNote={() => setNoteDialog(session.id)}
                getStatusBadge={getStatusBadge}
                getStepBadge={getStepBadge}
                maskIdentifier={maskIdentifier}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No sessions found</p>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalCount > 20 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {Math.ceil(totalCount / 20)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(totalCount / 20)}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}

        {/* Flag Dialog */}
        <Dialog open={!!flagDialog} onOpenChange={() => setFlagDialog(null)}>
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
              <Button variant="outline" onClick={() => setFlagDialog(null)}>
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
        <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
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
              <Button variant="outline" onClick={() => setNoteDialog(null)}>
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

function SessionCard({
  session,
  onView,
  onFlag,
  onNote,
  getStatusBadge,
  getStepBadge,
  maskIdentifier,
}: {
  session: CheckoutSession;
  onView: () => void;
  onFlag: () => void;
  onNote: () => void;
  getStatusBadge: (status: string) => React.ReactNode;
  getStepBadge: (step: string) => React.ReactNode;
  maskIdentifier: (value: string | null) => string;
}) {
  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Main Info */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <code className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                {session.id.slice(0, 8)}...
              </code>
              {getStatusBadge(session.status)}
              {getStepBadge(session.current_step)}
              {session.payment_attempts > 3 && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  High Retry
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>
                Merchant: <span className="text-foreground">{session.merchant?.business_name || '-'}</span>
              </span>
              <span>
                User: <span className="text-foreground">{maskIdentifier(session.phone_number || session.email)}</span>
              </span>
              <span>
                Amount: <span className="text-foreground font-medium">₹{session.final_amount.toLocaleString()}</span>
              </span>
              {session.selected_payment_method && (
                <span>
                  Method: <span className="text-foreground capitalize">{session.selected_payment_method}</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Started: {format(new Date(session.created_at), 'MMM d, HH:mm')}</span>
              {session.last_payment_error && (
                <span className="text-red-600">Error: {session.last_payment_error}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={onNote}>
              <MessageSquare className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={onFlag}>
              <Flag className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={onView}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}