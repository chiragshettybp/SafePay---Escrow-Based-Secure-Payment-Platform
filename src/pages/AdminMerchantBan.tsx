import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminMerchants } from "@/hooks/useAdminMerchants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  AlertTriangle,
  Ban,
  Clock,
  ShieldCheck,
  Loader2,
  Package,
  IndianRupee,
} from "lucide-react";
import { Seo } from "@/components/seo/Seo";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending_verification: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  suspended: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  banned: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function AdminMerchantBan() {
  const { merchant_id } = useParams<{ merchant_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { useMerchantDetails, banMerchant } = useAdminMerchants();
  const { data: merchant, isLoading, error } = useMerchantDetails(merchant_id || "");

  const [action, setAction] = useState<"suspend" | "ban" | "activate" | null>(null);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState<string>("");
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = async () => {
    if (!action) {
      toast({
        title: "Select Action",
        description: "Please select an action before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this action.",
        variant: "destructive",
      });
      return;
    }

    if (action === "suspend" && !duration) {
      toast({
        title: "Duration Required",
        description: "Please specify the suspension duration.",
        variant: "destructive",
      });
      return;
    }

    if (!confirmed) {
      toast({
        title: "Confirmation Required",
        description: "Please confirm your decision before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      await banMerchant.mutateAsync({
        merchantId: merchant_id!,
        action,
        reason: reason.trim(),
        duration: duration ? parseInt(duration) : undefined,
      });
      navigate(`/admin/merchants/${merchant_id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-64" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !merchant) {
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

  const isBannedOrSuspended =
    merchant.status === "banned" || merchant.status === "suspended";

  return (
    <AdminLayout>
      <Seo
        title={`Manage ${merchant.business_name} | Admin`}
        description="Suspend or ban merchant account"
      />

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/admin/merchants/${merchant_id}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isBannedOrSuspended ? "Manage Restrictions" : "Suspend / Ban Merchant"}
            </h1>
            <p className="text-muted-foreground">{merchant.business_name}</p>
          </div>
        </div>

        {/* Context Card */}
        <Card>
          <CardHeader>
            <CardTitle>Merchant Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Merchant ID</p>
                <p className="font-mono text-sm">{merchant.user_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Business Name</p>
                <p className="font-medium">{merchant.business_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Current Status</p>
                <Badge className={statusColors[merchant.status] || "bg-gray-100"}>
                  {merchant.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{merchant.email}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="font-bold">{merchant.orderStats.total}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <IndianRupee className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Wallet Balance</p>
                  <p className="font-bold">
                    ₹{merchant.wallet?.available_balance.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning */}
        {!isBannedOrSuspended && (
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Warning</p>
                <p className="text-sm text-destructive/80">
                  Suspending or banning a merchant will prevent them from
                  receiving new orders. Any pending orders may be affected.
                  Wallet funds will be held until the restriction is lifted.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isBannedOrSuspended && (
                <Button
                  variant={action === "activate" ? "default" : "outline"}
                  className={
                    action === "activate"
                      ? "bg-green-600 hover:bg-green-700 h-auto py-4"
                      : "h-auto py-4"
                  }
                  onClick={() => setAction("activate")}
                >
                  <div className="flex flex-col items-center gap-2">
                    <ShieldCheck className="h-6 w-6" />
                    <span>Activate</span>
                    <span className="text-xs opacity-75">Remove restrictions</span>
                  </div>
                </Button>
              )}
              <Button
                variant={action === "suspend" ? "default" : "outline"}
                className={
                  action === "suspend"
                    ? "bg-orange-600 hover:bg-orange-700 h-auto py-4"
                    : "h-auto py-4"
                }
                onClick={() => setAction("suspend")}
              >
                <div className="flex flex-col items-center gap-2">
                  <Clock className="h-6 w-6" />
                  <span>Suspend</span>
                  <span className="text-xs opacity-75">Temporary restriction</span>
                </div>
              </Button>
              <Button
                variant={action === "ban" ? "default" : "outline"}
                className={
                  action === "ban"
                    ? "bg-red-600 hover:bg-red-700 h-auto py-4"
                    : "h-auto py-4"
                }
                onClick={() => setAction("ban")}
              >
                <div className="flex flex-col items-center gap-2">
                  <Ban className="h-6 w-6" />
                  <span>Ban</span>
                  <span className="text-xs opacity-75">Permanent restriction</span>
                </div>
              </Button>
            </div>

            {/* Duration (for suspend) */}
            {action === "suspend" && (
              <div className="space-y-2">
                <Label htmlFor="duration">Suspension Duration *</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day</SelectItem>
                    <SelectItem value="3">3 days</SelectItem>
                    <SelectItem value="7">7 days</SelectItem>
                    <SelectItem value="14">14 days</SelectItem>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Reason Input */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                placeholder="Provide a detailed reason for this action..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>

            {/* Confirmation */}
            <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50">
              <Checkbox
                id="confirm"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked === true)}
              />
              <Label htmlFor="confirm" className="text-sm">
                I understand the impact of this action and confirm that it is
                necessary.
              </Label>
            </div>

            {/* Action-specific warnings */}
            {action === "activate" && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200">
                <p className="text-sm">
                  <strong>Activating</strong> will restore the merchant's ability
                  to receive orders and access their funds.
                </p>
              </div>
            )}

            {action === "suspend" && (
              <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 text-orange-800 dark:text-orange-200">
                <p className="text-sm">
                  <strong>Suspending</strong> will temporarily prevent the
                  merchant from receiving orders for {duration || "X"} days.
                </p>
              </div>
            )}

            {action === "ban" && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200">
                <p className="text-sm">
                  <strong>Banning</strong> will permanently remove the merchant
                  from the platform. This action should only be used for serious
                  violations.
                </p>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(`/admin/merchants/${merchant_id}`)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !action ||
                  !reason.trim() ||
                  !confirmed ||
                  banMerchant.isPending ||
                  (action === "suspend" && !duration)
                }
                variant={
                  action === "ban"
                    ? "destructive"
                    : action === "activate"
                    ? "default"
                    : "default"
                }
              >
                {banMerchant.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : action === "activate" ? (
                  "Activate Merchant"
                ) : action === "suspend" ? (
                  "Suspend Merchant"
                ) : action === "ban" ? (
                  "Ban Merchant"
                ) : (
                  "Submit"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
