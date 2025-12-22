import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  User,
  FileText,
  CheckCircle,
  XCircle,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
  Phone,
  Mail,
  Shield,
  History,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';

interface UserKycData {
  id: string;
  user_id: string;
  full_legal_name: string | null;
  date_of_birth: string | null;
  id_number: string | null;
  id_front_url: string | null;
  id_back_url: string | null;
  selfie_url: string | null;
  address: string | null;
  address_proof_url: string | null;
  country: string | null;
  pincode: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  account_status: string;
  created_at: string;
}

export default function AdminUserKyc() {
  const { user_id } = useParams<{ user_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [kycData, setKycData] = useState<UserKycData | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'reupload' | null>(null);
  const [reason, setReason] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);

  const fetchData = useCallback(async () => {
    if (!user_id) return;
    setIsLoading(true);

    try {
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (profileError) throw profileError;
      setUser(profile);

      // Fetch KYC data
      const { data: kyc, error: kycError } = await supabase
        .from('kyc_records')
        .select('*')
        .eq('user_id', user_id)
        .maybeSingle();

      if (kycError) throw kycError;
      setKycData(kyc);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user_id, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!user_id) return;

    const channel = supabase
      .channel(`user-kyc-${user_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'kyc_records', filter: `user_id=eq.${user_id}` },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user_id, fetchData]);

  const handleAction = async () => {
    if (!kycData || !actionType) return;
    if ((actionType === 'reject' || actionType === 'reupload') && !reason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const newStatus = actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'pending';

      // Update KYC status
      const { error: updateError } = await supabase
        .from('kyc_records')
        .update({
          status: newStatus,
          rejection_reason: actionType !== 'approve' ? reason : null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: session.user.id,
        })
        .eq('id', kycData.id);

      if (updateError) throw updateError;

      // Log to verification history
      await supabase.from('user_verification_history').insert({
        user_id: user_id,
        action_type: `kyc_${actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 'reupload_requested'}`,
        admin_id: session.user.id,
        reason: reason || null,
        metadata: { kyc_id: kycData.id },
      });

      toast({
        title: 'Success',
        description: `KYC ${actionType === 'approve' ? 'approved' : actionType === 'reject' ? 'rejected' : 're-upload requested'} successfully`,
      });

      setActionType(null);
      setReason('');
      fetchData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: 'Failed to update KYC status',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><RefreshCw className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Not Started'}</Badge>;
    }
  };

  const maskIdNumber = (idNumber: string | null) => {
    if (!idNumber) return 'N/A';
    if (idNumber.length <= 4) return idNumber;
    return idNumber.slice(0, 4) + '****' + idNumber.slice(-4);
  };

  const DocumentImage = ({ url, label }: { url: string | null; label: string }) => {
    if (!url) {
      return (
        <div className="flex flex-col items-center justify-center h-48 bg-muted rounded-lg border-2 border-dashed">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">{label} not uploaded</p>
        </div>
      );
    }

    return (
      <div className="relative group">
        <img
          src={url}
          alt={label}
          className="w-full h-48 object-cover rounded-lg border"
          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
        />
        <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.25))}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => setZoomLevel(Math.min(3, zoomLevel + 0.25))}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="secondary" className="h-8 w-8">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <img src={url} alt={label} className="w-full h-auto" />
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-sm text-muted-foreground mt-1 text-center">{label}</p>
      </div>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">User not found</p>
          <Button variant="outline" onClick={() => navigate('/admin/users')} className="mt-4">
            Back to Users
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/users/${user_id}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-6 w-6" />
                User KYC Verification
              </h1>
              <p className="text-muted-foreground">{user.full_name || 'Unnamed User'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/bankdetails-verify`)}>
              <CreditCard className="h-4 w-4 mr-2" />
              Bank Verification
            </Button>
            <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/verification-history`)}>
              <History className="h-4 w-4 mr-2" />
              Verification History
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Documents Section */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Identity Documents
                </CardTitle>
                <CardDescription>Review submitted identity documents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DocumentImage url={kycData?.id_front_url || null} label="ID Front" />
                  <DocumentImage url={kycData?.id_back_url || null} label="ID Back" />
                </div>
                <DocumentImage url={kycData?.selfie_url || null} label="Selfie / Live Photo" />
                <DocumentImage url={kycData?.address_proof_url || null} label="Address Proof" />
              </CardContent>
            </Card>
          </div>

          {/* User Info & Actions */}
          <div className="space-y-6">
            {/* User Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  User Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Full Name</div>
                    <div className="font-medium">{user.full_name || 'Not provided'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Phone</div>
                    <div className="font-medium flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {user.phone || 'Not provided'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Account Status</div>
                    <Badge variant={user.account_status === 'active' ? 'default' : 'secondary'}>
                      {user.account_status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">KYC Status</div>
                    {getStatusBadge(kycData?.status || 'not_started')}
                  </div>
                </div>
                <Button
                  variant="link"
                  className="p-0 h-auto"
                  onClick={() => navigate(`/admin/users/${user_id}`)}
                >
                  View Full Profile →
                </Button>
              </CardContent>
            </Card>

            {/* KYC Details */}
            <Card>
              <CardHeader>
                <CardTitle>Submitted KYC Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {kycData ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Legal Name</div>
                        <div className="font-medium">{kycData.full_legal_name || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Date of Birth</div>
                        <div className="font-medium">
                          {kycData.date_of_birth ? format(new Date(kycData.date_of_birth), 'MMM d, yyyy') : 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">ID Number (Masked)</div>
                        <div className="font-medium font-mono">{maskIdNumber(kycData.id_number)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Country</div>
                        <div className="font-medium">{kycData.country || 'N/A'}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-sm text-muted-foreground">Address</div>
                        <div className="font-medium">{kycData.address || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Pincode</div>
                        <div className="font-medium">{kycData.pincode || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Submitted</div>
                        <div className="font-medium flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(kycData.created_at), 'MMM d, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                    {kycData.rejection_reason && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-center gap-2 text-red-400 mb-1">
                          <AlertTriangle className="h-4 w-4" />
                          Previous Rejection Reason
                        </div>
                        <p className="text-sm">{kycData.rejection_reason}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No KYC data submitted yet</p>
                )}
              </CardContent>
            </Card>

            {/* Admin Actions */}
            {kycData && (
              <Card>
                <CardHeader>
                  <CardTitle>Admin Actions</CardTitle>
                  <CardDescription>Review and take action on this KYC submission</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {actionType ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <span className="font-medium">Action: </span>
                        {actionType === 'approve' && <span className="text-green-400">Approve KYC</span>}
                        {actionType === 'reject' && <span className="text-red-400">Reject KYC</span>}
                        {actionType === 'reupload' && <span className="text-yellow-400">Request Re-Upload</span>}
                      </div>
                      {actionType !== 'approve' && (
                        <div className="space-y-2">
                          <Label htmlFor="reason">Reason (Required)</Label>
                          <Textarea
                            id="reason"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Provide a reason for this action..."
                            rows={3}
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          onClick={handleAction}
                          disabled={isSubmitting || (actionType !== 'approve' && !reason.trim())}
                          className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : actionType === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                        >
                          {isSubmitting ? 'Processing...' : 'Confirm Action'}
                        </Button>
                        <Button variant="outline" onClick={() => { setActionType(null); setReason(''); }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={() => setActionType('approve')}
                        className="bg-green-600 hover:bg-green-700"
                        disabled={kycData.status === 'approved'}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve KYC
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => setActionType('reject')}
                        disabled={kycData.status === 'rejected'}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject KYC
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setActionType('reupload')}
                        className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Request Re-Upload
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}