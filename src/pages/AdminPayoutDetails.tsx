import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ArrowLeft, 
  IndianRupee, 
  Building2, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Wallet,
  User,
  FileText,
  ExternalLink
} from "lucide-react";
import { useAdminPayoutDetails } from "@/hooks/useAdminPayouts";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode; color: string }> = {
  processing: { label: "Processing", variant: "secondary", icon: <Clock className="h-4 w-4" />, color: "text-yellow-600" },
  pending: { label: "Pending", variant: "secondary", icon: <Clock className="h-4 w-4" />, color: "text-yellow-600" },
  approved: { label: "Approved", variant: "default", icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600" },
  paid: { label: "Paid", variant: "default", icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600" },
  declined: { label: "Declined", variant: "destructive", icon: <XCircle className="h-4 w-4" />, color: "text-red-600" },
  failed: { label: "Failed", variant: "destructive", icon: <AlertCircle className="h-4 w-4" />, color: "text-red-600" },
};

export default function AdminPayoutDetails() {
  const navigate = useNavigate();
  const { payoutId } = useParams<{ payoutId: string }>();
  const { payout, loading } = useAdminPayoutDetails(payoutId);


  const canReview = payout && ["processing", "pending"].includes(payout.status);
  const status = payout ? (statusConfig[payout.status] || statusConfig.pending) : statusConfig.pending;

  if (loading) {
    return (
      <AdminLayout>
        <Button variant="ghost" className="mb-6" onClick={() => navigate("/admin/payouts")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payouts
        </Button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!payout) {
    return (
      <AdminLayout>
        <Button variant="ghost" className="mb-6" onClick={() => navigate("/admin/payouts")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payouts
        </Button>
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Payout not found</p>
            <p className="text-muted-foreground">The payout you're looking for doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Button variant="ghost" className="mb-6" onClick={() => navigate("/admin/payouts")}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Payouts
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payout Summary */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                <CardTitle className="flex items-center gap-2">
                    <IndianRupee className="h-5 w-5" />
                    Payout Summary
                  </CardTitle>
                  <CardDescription>Request details and status</CardDescription>
                </div>
                <Badge variant={status.variant} className="gap-1 text-sm">
                  {status.icon}
                  {status.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payout ID</p>
                  <p className="font-mono text-sm">{payout.id.slice(0, 12)}...</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requested Amount</p>
                  <p className="font-bold text-lg">{formatCurrency(payout.amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fee</p>
                  <p className="font-medium">{formatCurrency(payout.fee)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Net Amount</p>
                  <p className="font-bold text-lg text-primary">{formatCurrency(payout.net_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Requested On</p>
                  <p className="font-medium">{format(new Date(payout.created_at), "dd MMM yyyy, HH:mm")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="font-medium">{format(new Date(payout.updated_at), "dd MMM yyyy, HH:mm")}</p>
                </div>
                {payout.processed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Processed On</p>
                    <p className="font-medium">{format(new Date(payout.processed_at), "dd MMM yyyy, HH:mm")}</p>
                  </div>
                )}
                {payout.transaction_id && (
                  <div>
                    <p className="text-sm text-muted-foreground">Transaction ID</p>
                    <p className="font-mono text-sm">{payout.transaction_id}</p>
                  </div>
                )}
              </div>

              {payout.failure_reason && (
                <>
                  <Separator className="my-4" />
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-destructive mb-1">Decline Reason</p>
                    <p className="text-sm">{payout.failure_reason}</p>
                  </div>
                </>
              )}

              {payout.notes && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Admin Notes</p>
                    <p className="text-sm">{payout.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Merchant Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Merchant Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{payout.user_type === 'merchant' ? 'Business Name' : 'Customer Name'}</p>
                  <p className="font-medium">{payout.user_name || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{payout.user_type === 'merchant' ? 'Merchant ID' : 'Customer ID'}</p>
                  <p className="font-mono text-sm">{payout.user_id.slice(0, 12)}...</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Type</p>
                  <Badge variant={payout.user_type === 'merchant' ? 'default' : 'secondary'}>
                    {payout.user_type === 'merchant' ? 'Merchant' : 'Customer'}
                  </Badge>
                </div>
                {payout.user_type === 'merchant' && payout.merchant && (
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{payout.merchant?.email || "N/A"}</p>
                  </div>
                )}
                {payout.user_type === 'merchant' && (
                  <div>
                    <p className="text-sm text-muted-foreground">Account Status</p>
                    <Badge variant={payout.merchant?.status === "active" ? "default" : "secondary"}>
                      {payout.merchant?.status || "Unknown"}
                    </Badge>
                  </div>
                )}
              </div>
              {payout.user_type === 'merchant' && (
                <div className="mt-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate(`/admin/merchants/${payout.merchant?.user_id || payout.user_id}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Merchant Profile
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bank Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Bank Account Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payout.bank_account ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Bank Name</p>
                    <p className="font-medium">{payout.bank_account.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Holder</p>
                    <p className="font-medium">{payout.bank_account.account_holder_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Account Number</p>
                    <p className="font-mono">****{payout.bank_account.account_number.slice(-4)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">IFSC Code</p>
                    <p className="font-mono">{payout.bank_account.ifsc_code}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Bank account details not available</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Wallet & Actions */}
        <div className="space-y-6">
          {/* Wallet Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Wallet Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {payout.wallet ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold">{formatCurrency(payout.wallet.available_balance)}</p>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="font-medium">{formatCurrency(payout.wallet.pending_balance)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Paid Out</p>
                      <p className="font-medium">{formatCurrency(payout.wallet.total_paid_out)}</p>
                    </div>
                  </div>
                  {canReview && payout.wallet.available_balance < payout.amount && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <p className="text-sm text-destructive font-medium">
                        Insufficient balance for payout
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Wallet information not available</p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {canReview ? (
                <Button 
                  className="w-full"
                  onClick={() => navigate(`/admin/payouts/${payout.id}/verify`)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Review & Decide
                </Button>
              ) : (
                <div className="text-center py-4">
                  <div className={`${status.color} mb-2`}>{status.icon}</div>
                  <p className="text-sm text-muted-foreground">
                    This payout has been {status.label.toLowerCase()}
                  </p>
                </div>
              )}
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate("/admin/payouts")}
              >
                Back to List
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm font-medium">Payout Requested</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(payout.created_at), "dd MMM yyyy, HH:mm")}
                    </p>
                  </div>
                </div>
                {payout.processed_at && (
                  <div className="flex gap-3">
                    <div className={`w-2 h-2 mt-2 rounded-full ${
                      payout.status === "paid" || payout.status === "approved" 
                        ? "bg-green-500" 
                        : "bg-red-500"
                    }`} />
                    <div>
                      <p className="text-sm font-medium">
                        {payout.status === "paid" || payout.status === "approved" 
                          ? "Payout Approved" 
                          : "Payout Declined"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payout.processed_at), "dd MMM yyyy, HH:mm")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
