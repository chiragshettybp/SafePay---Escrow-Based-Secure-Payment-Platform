import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminMerchants } from "@/hooks/useAdminMerchants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ArrowLeft,
  AlertTriangle,
  Building,
  History,
  ShieldCheck,
  CreditCard,
  CheckCircle,
  XCircle,
  RotateCw,
  FileCheck,
  User,
} from "lucide-react";
import { Seo } from "@/components/seo/Seo";

const actionTypeIcons: Record<string, React.ReactNode> = {
  kyc_approved: <CheckCircle className="h-5 w-5 text-green-600" />,
  kyc_rejected: <XCircle className="h-5 w-5 text-red-600" />,
  kyc_reupload_requested: <RotateCw className="h-5 w-5 text-orange-600" />,
  bank_approved: <CheckCircle className="h-5 w-5 text-green-600" />,
  bank_rejected: <XCircle className="h-5 w-5 text-red-600" />,
  bank_reupload_requested: <RotateCw className="h-5 w-5 text-orange-600" />,
  kyc_submitted: <FileCheck className="h-5 w-5 text-blue-600" />,
  bank_submitted: <CreditCard className="h-5 w-5 text-blue-600" />,
};

const actionTypeLabels: Record<string, string> = {
  kyc_approved: "KYC Approved",
  kyc_rejected: "KYC Rejected",
  kyc_reupload_requested: "KYC Re-upload Requested",
  bank_approved: "Bank Account Verified",
  bank_rejected: "Bank Account Rejected",
  bank_reupload_requested: "Bank Re-upload Requested",
  kyc_submitted: "KYC Documents Submitted",
  bank_submitted: "Bank Account Added",
};

export default function AdminMerchantVerificationHistory() {
  const { merchant_id } = useParams<{ merchant_id: string }>();
  const navigate = useNavigate();
  const { useMerchantDetails, useVerificationHistory } = useAdminMerchants();
  const { data: merchant, isLoading: merchantLoading } = useMerchantDetails(merchant_id || "");
  const { data: history, isLoading: historyLoading } = useVerificationHistory(merchant_id || "");

  const isLoading = merchantLoading || historyLoading;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  if (!merchant) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <p className="text-lg font-medium">Merchant not found</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate("/admin/merchants")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Merchants
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Seo
        title={`Verification History - ${merchant.business_name} | Admin`}
        description="View merchant verification audit trail"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/admin/merchants/${merchant_id}`)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Verification History</h1>
              <p className="text-muted-foreground">{merchant.business_name}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/merchants/${merchant_id}`}>
              <Building className="h-4 w-4 mr-2" />
              Merchant Profile
            </Link>
          </Button>
        </div>

        {/* Quick Navigation */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/merchants/${merchant_id}/kyc`}>
              <ShieldCheck className="h-4 w-4 mr-2" />
              KYC Verification
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/admin/merchants/${merchant_id}/bankdetails-verify`}>
              <CreditCard className="h-4 w-4 mr-2" />
              Bank Details
            </Link>
          </Button>
        </div>

        {/* History Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Audit Trail
            </CardTitle>
          </CardHeader>
          <CardContent>
            {history && history.length > 0 ? (
              <ScrollArea className="h-[600px] pr-4">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

                  <div className="space-y-6">
                    {history.map((entry, index) => (
                      <div
                        key={entry.id || index}
                        className="relative flex gap-4 pl-2"
                      >
                        {/* Timeline dot */}
                        <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background border-2 border-border">
                          {actionTypeIcons[entry.action_type] || (
                            <History className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-6">
                          <div className="rounded-lg border bg-card p-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-medium">
                                  {actionTypeLabels[entry.action_type] || entry.action_type}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(entry.created_at), "PPP 'at' p")}
                                </p>
                              </div>
                              {entry.admin_email && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <User className="h-4 w-4" />
                                  <span>{entry.admin_email}</span>
                                </div>
                              )}
                            </div>

                            {entry.reason && (
                              <div className="mt-3 p-3 rounded bg-muted/50 text-sm">
                                <p className="text-muted-foreground font-medium mb-1">Reason:</p>
                                <p>{entry.reason}</p>
                              </div>
                            )}

                            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {Object.entries(entry.metadata).map(([key, value]) => (
                                  <Badge key={key} variant="outline" className="text-xs">
                                    {key}: {String(value)}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">No History Yet</p>
                <p className="text-sm mt-1">
                  Verification actions will appear here once performed.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> This is an immutable audit trail. All verification actions are logged permanently with timestamps and admin IDs for compliance purposes.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
