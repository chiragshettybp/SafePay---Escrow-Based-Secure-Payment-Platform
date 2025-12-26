import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Link2,
  ArrowLeft,
  Copy,
  Ban,
  CheckCircle,
  Flag,
  Store,
  CreditCard,
  TrendingUp,
  AlertCircle,
  Receipt,
  Clock,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { useAdminPaymentLinkDetails } from "@/hooks/useAdminPaymentLinks";
import { useAdminPaymentLinks } from "@/hooks/useAdminPaymentLinks";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function AdminPaymentLinkDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { link, payments, sessions, isLoading } = useAdminPaymentLinkDetails(id);
  const { disableLink, enableLink, flagForReview } = useAdminPaymentLinks();

  const [actionType, setActionType] = useState<"disable" | "enable" | "flag" | null>(null);
  const [actionReason, setActionReason] = useState("");

  const handleAction = async () => {
    if (!id || !actionType || !actionReason.trim()) return;

    let success = false;
    if (actionType === "disable") {
      success = await disableLink(id, actionReason);
    } else if (actionType === "enable") {
      success = await enableLink(id, actionReason);
    } else if (actionType === "flag") {
      success = await flagForReview(id, actionReason);
    }

    if (success) {
      setActionType(null);
      setActionReason("");
    }
  };

  const copyLinkUrl = () => {
    if (!link?.merchant?.slug) return;
    const url = `${window.location.origin}/pay/${link.merchant.slug}/${link.link_code}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Payment link URL copied to clipboard",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
      case "disabled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Disabled</Badge>;
      case "expired":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Success</Badge>;
      case "failed":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge>;
      case "pending":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Calculate metrics
  const successfulPayments = payments.filter(p => p.status === "success").length;
  const failedPayments = payments.filter(p => p.status === "failed").length;
  const totalCollected = payments
    .filter(p => p.status === "success")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </AdminLayout>
    );
  }

  if (!link) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">Payment Link Not Found</h2>
          <p className="text-muted-foreground mb-4">The payment link you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/admin/checkout/payment-links")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Payment Links
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/checkout/payment-links")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {link.title}
                {getStatusBadge(link.status)}
              </h1>
              <p className="text-muted-foreground font-mono text-sm">{link.link_code}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copyLinkUrl}>
              <Copy className="h-4 w-4 mr-2" />
              Copy URL
            </Button>
            {link.status === "active" ? (
              <Button
                variant="destructive"
                onClick={() => setActionType("disable")}
              >
                <Ban className="h-4 w-4 mr-2" />
                Disable Link
              </Button>
            ) : link.status === "disabled" ? (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => setActionType("enable")}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Enable Link
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => setActionType("flag")}
            >
              <Flag className="h-4 w-4 mr-2" />
              Flag
            </Button>
          </div>
        </div>

        {/* Link Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Link Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Link ID</span>
                <span className="font-mono text-sm">{link.id.slice(0, 8)}...</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-bold text-lg">₹{link.amount.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Currency</span>
                <span>{link.currency}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span>{format(new Date(link.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
              </div>
              {link.expires_at && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires</span>
                    <span>{format(new Date(link.expires_at), "MMM d, yyyy 'at' h:mm a")}</span>
                  </div>
                </>
              )}
              {link.description && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground">Description</span>
                    <span className="text-sm">{link.description}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4" />
                Merchant Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Business Name</span>
                <span className="font-medium">{link.merchant?.business_name || "Unknown"}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Merchant ID</span>
                <span className="font-mono text-sm">{link.merchant?.id?.slice(0, 8)}...</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Slug</span>
                <span className="font-mono text-sm">{link.merchant?.slug || "N/A"}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Public URL</span>
                <Button variant="link" size="sm" className="h-auto p-0" onClick={copyLinkUrl}>
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Copy
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                  <p className="text-xl font-bold">{sessions.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Successful</p>
                  <p className="text-xl font-bold">{successfulPayments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="text-xl font-bold">{failedPayments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Collected</p>
                  <p className="text-xl font-bold">₹{totalCollected.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <RefreshCw className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conversion</p>
                  <p className="text-xl font-bold">
                    {sessions.length > 0 ? Math.round((successfulPayments / sessions.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Payments
            </CardTitle>
            <CardDescription>All payments made through this link</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <div className="p-12 text-center">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No payments yet</h3>
                <p className="text-muted-foreground">No payments have been made through this link</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Payment ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id} className="border-border">
                        <TableCell>
                          <span className="font-mono text-sm">{payment.id.slice(0, 8)}...</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(payment.created_at), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">₹{payment.amount?.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{payment.payment_method || "N/A"}</span>
                        </TableCell>
                        <TableCell>{getPaymentStatusBadge(payment.status)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/payments/${payment.id}`)}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={() => { setActionType(null); setActionReason(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "disable" && "Disable Payment Link"}
              {actionType === "enable" && "Enable Payment Link"}
              {actionType === "flag" && "Flag for Review"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "disable" && "This will immediately prevent new payments through this link. Existing completed payments are not affected."}
              {actionType === "enable" && "This will allow new payments through this link."}
              {actionType === "flag" && "This will create an alert for other admins to review this payment link."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason (required)</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for this action..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={!actionReason.trim()}
              className={
                actionType === "disable"
                  ? "bg-red-600 hover:bg-red-700"
                  : actionType === "enable"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }
            >
              {actionType === "disable" && "Disable Link"}
              {actionType === "enable" && "Enable Link"}
              {actionType === "flag" && "Flag for Review"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
