import { useNavigate, useParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminInfoCard } from "@/components/admin/AdminInfoCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  IndianRupee, 
  Building2, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Wallet,
  FileText,
  ExternalLink,
  User
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
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="mobile-grid-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!payout) {
    return (
      <AdminLayout>
        <AdminPageHeader
          title="Payout Not Found"
          backUrl="/admin/payouts"
          backLabel="Back to Payouts"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Payout not found</p>
            <p className="text-muted-foreground text-sm mt-1">
              The payout you're looking for doesn't exist or has been removed.
            </p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const isCustomer = payout.user_type === 'customer';

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <AdminPageHeader
          title="Payout Details"
          subtitle={`ID: ${payout.id.slice(0, 12)}...`}
          backUrl="/admin/payouts"
          backLabel="Payouts"
          badge={
            <Badge variant={status.variant} className="gap-1">
              {status.icon}
              {status.label}
            </Badge>
          }
        />

        {/* Summary Stats */}
        <div className="mobile-grid-4">
          <AdminStatCard
            title="Requested"
            value={formatCurrency(payout.amount)}
            icon={<IndianRupee className="h-4 w-4" />}
          />
          <AdminStatCard
            title="Fee"
            value={formatCurrency(payout.fee)}
          />
          <AdminStatCard
            title="Net Amount"
            value={formatCurrency(payout.net_amount)}
            variant="success"
          />
          <AdminStatCard
            title="Type"
            value={isCustomer ? "Customer" : "Merchant"}
            icon={isCustomer ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Details */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Request Details */}
            <Card className="admin-card-compact">
              <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base">Request Details</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                <div className="admin-info-grid">
                  <div className="admin-info-item">
                    <p className="admin-info-label">Requested On</p>
                    <p className="admin-info-value">{format(new Date(payout.created_at), "dd MMM yyyy, HH:mm")}</p>
                  </div>
                  <div className="admin-info-item">
                    <p className="admin-info-label">Last Updated</p>
                    <p className="admin-info-value">{format(new Date(payout.updated_at), "dd MMM yyyy, HH:mm")}</p>
                  </div>
                  {payout.processed_at && (
                    <div className="admin-info-item">
                      <p className="admin-info-label">Processed On</p>
                      <p className="admin-info-value">{format(new Date(payout.processed_at), "dd MMM yyyy, HH:mm")}</p>
                    </div>
                  )}
                  {payout.transaction_id && (
                    <div className="admin-info-item">
                      <p className="admin-info-label">Transaction ID</p>
                      <p className="admin-info-value font-mono text-xs">{payout.transaction_id}</p>
                    </div>
                  )}
                </div>

                {payout.failure_reason && (
                  <>
                    <Separator className="my-3 sm:my-4" />
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                      <p className="text-xs sm:text-sm font-medium text-destructive mb-1">Decline Reason</p>
                      <p className="text-xs sm:text-sm">{payout.failure_reason}</p>
                    </div>
                  </>
                )}

                {payout.notes && (
                  <>
                    <Separator className="my-3 sm:my-4" />
                    <div className="admin-info-item">
                      <p className="admin-info-label">Admin Notes</p>
                      <p className="admin-info-value text-sm">{payout.notes}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* User Information */}
            <Card className="admin-card-compact">
              <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  {isCustomer ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                  {isCustomer ? "Customer Information" : "Merchant Information"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                <div className="admin-info-grid">
                  <div className="admin-info-item">
                    <p className="admin-info-label">{isCustomer ? "Name" : "Business Name"}</p>
                    <p className="admin-info-value">{payout.user_name || "Unknown"}</p>
                  </div>
                  <div className="admin-info-item">
                    <p className="admin-info-label">ID</p>
                    <p className="admin-info-value font-mono text-xs">{payout.user_id.slice(0, 12)}...</p>
                  </div>
                  {!isCustomer && payout.merchant && (
                    <>
                      <div className="admin-info-item">
                        <p className="admin-info-label">Email</p>
                        <p className="admin-info-value">{payout.merchant?.email || "N/A"}</p>
                      </div>
                      <div className="admin-info-item">
                        <p className="admin-info-label">Status</p>
                        <Badge variant={payout.merchant?.status === "active" ? "default" : "secondary"} className="mt-0.5">
                          {payout.merchant?.status || "Unknown"}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
                {!isCustomer && (
                  <div className="mt-3 sm:mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => navigate(`/admin/merchants/${payout.merchant?.user_id || payout.user_id}`)}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bank Account */}
            <Card className="admin-card-compact">
              <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Bank Account
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                {payout.bank_account ? (
                  <div className="admin-info-grid">
                    <div className="admin-info-item">
                      <p className="admin-info-label">Bank Name</p>
                      <p className="admin-info-value">{payout.bank_account.bank_name}</p>
                    </div>
                    <div className="admin-info-item">
                      <p className="admin-info-label">Account Holder</p>
                      <p className="admin-info-value">{payout.bank_account.account_holder_name}</p>
                    </div>
                    <div className="admin-info-item">
                      <p className="admin-info-label">Account Number</p>
                      <p className="admin-info-value font-mono">****{payout.bank_account.account_number.slice(-4)}</p>
                    </div>
                    <div className="admin-info-item">
                      <p className="admin-info-label">IFSC Code</p>
                      <p className="admin-info-value font-mono">{payout.bank_account.ifsc_code}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Bank account details not available</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Actions & Timeline */}
          <div className="space-y-4 sm:space-y-6">
            {/* Wallet Balance */}
            <Card className="admin-card-compact">
              <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Wallet Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 space-y-3 sm:space-y-4">
                {payout.wallet ? (
                  <>
                    <div>
                      <p className="admin-info-label">Available Balance</p>
                      <p className="text-xl sm:text-2xl font-bold">{formatCurrency(payout.wallet.available_balance)}</p>
                    </div>
                    <Separator />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="admin-info-item">
                        <p className="admin-info-label">Pending</p>
                        <p className="admin-info-value">{formatCurrency(payout.wallet.pending_balance)}</p>
                      </div>
                      <div className="admin-info-item">
                        <p className="admin-info-label">Total Paid</p>
                        <p className="admin-info-value">{formatCurrency(payout.wallet.total_paid_out)}</p>
                      </div>
                    </div>
                    {canReview && payout.wallet.available_balance < payout.amount && (
                      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                        <p className="text-xs sm:text-sm text-destructive font-medium">
                          Insufficient balance for payout
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted-foreground text-sm">Wallet information not available</p>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="admin-card-compact">
              <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0 space-y-2 sm:space-y-3">
                {canReview ? (
                  <Button 
                    className="w-full min-h-[44px]"
                    onClick={() => navigate(`/admin/payouts/${payout.id}/verify`)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Review & Decide
                  </Button>
                ) : (
                  <div className="text-center py-3 sm:py-4">
                    <div className={`${status.color} mb-2 flex justify-center`}>{status.icon}</div>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      This payout has been {status.label.toLowerCase()}
                    </p>
                  </div>
                )}
                <Button 
                  variant="outline" 
                  className="w-full min-h-[44px]"
                  onClick={() => navigate("/admin/payouts")}
                >
                  Back to List
                </Button>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="admin-card-compact">
              <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex gap-2 sm:gap-3">
                    <div className="w-2 h-2 mt-1.5 sm:mt-2 rounded-full bg-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium">Payout Requested</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {format(new Date(payout.created_at), "dd MMM yyyy, HH:mm")}
                      </p>
                    </div>
                  </div>
                  {payout.processed_at && (
                    <div className="flex gap-2 sm:gap-3">
                      <div className={`w-2 h-2 mt-1.5 sm:mt-2 rounded-full flex-shrink-0 ${
                        payout.status === "paid" || payout.status === "approved" 
                          ? "bg-green-500" 
                          : "bg-red-500"
                      }`} />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium">
                          {payout.status === "paid" || payout.status === "approved" 
                            ? "Payout Approved" 
                            : "Payout Declined"}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
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
      </div>
    </AdminLayout>
  );
}
