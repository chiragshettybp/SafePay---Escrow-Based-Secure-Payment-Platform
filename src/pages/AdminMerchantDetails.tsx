import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminMerchants } from "@/hooks/useAdminMerchants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  ShieldCheck,
  Ban,
  Package,
  IndianRupee,
  AlertTriangle,
  Clock,
  FileCheck,
} from "lucide-react";
import { Seo } from "@/components/seo/Seo";

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  pending_verification: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  suspended: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  banned: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const kycStatusColors: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const orderStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  delivered: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  disputed: "bg-orange-100 text-orange-800",
  refunded: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminMerchantDetails() {
  const { merchant_id } = useParams<{ merchant_id: string }>();
  const navigate = useNavigate();
  const { useMerchantDetails } = useAdminMerchants();
  const { data: merchant, isLoading, error } = useMerchantDetails(merchant_id || "");

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
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

  return (
    <AdminLayout>
      <Seo
        title={`${merchant.business_name} | Admin`}
        description="View merchant details and manage account"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/merchants")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{merchant.business_name}</h1>
              <p className="text-muted-foreground font-mono text-sm">
                ID: {merchant.user_id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={statusColors[merchant.status] || "bg-gray-100"}>
              {merchant.status.replace(/_/g, " ")}
            </Badge>
            <Badge
              className={kycStatusColors[merchant.kyc?.status || "not_started"]}
            >
              KYC: {(merchant.kyc?.status || "not_started").replace(/_/g, " ")}
            </Badge>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {merchant.kyc?.status === "pending" && (
            <Button
              onClick={() =>
                navigate(`/admin/merchants/${merchant_id}/verification`)
              }
            >
              <FileCheck className="h-4 w-4 mr-2" />
              Review Verification
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/merchants/${merchant_id}/ban`)}
          >
            {merchant.status === "banned" || merchant.status === "suspended" ? (
              <>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Manage Restrictions
              </>
            ) : (
              <>
                <Ban className="h-4 w-4 mr-2" />
                Suspend / Ban
              </>
            )}
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{merchant.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <p className="font-medium">{merchant.phone || "Not provided"}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Address</p>
                    <p className="font-medium">{merchant.address || "Not provided"}</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{merchant.category || "Uncategorized"}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">GST Number</p>
                  <p className="font-medium font-mono">
                    {merchant.gst_number || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">
                    {format(new Date(merchant.created_at), "PPP")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Performance Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Total Orders</p>
                  <p className="text-2xl font-bold">{merchant.orderStats.total}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600">
                    {merchant.orderStats.completed}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Cancelled</p>
                  <p className="text-2xl font-bold text-red-600">
                    {merchant.orderStats.cancelled}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-sm text-muted-foreground">Disputed</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {merchant.orderStats.disputed}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-primary/10">
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-2xl font-bold">
                    ₹{merchant.totalRevenue.toLocaleString()}
                  </p>
                </div>
                {merchant.wallet && (
                  <div className="p-4 rounded-lg bg-primary/10">
                    <p className="text-sm text-muted-foreground">Wallet Balance</p>
                    <p className="text-2xl font-bold">
                      ₹{merchant.wallet.available_balance.toLocaleString()}
                    </p>
                    {merchant.wallet.pending_balance > 0 && (
                      <p className="text-xs text-muted-foreground">
                        +₹{merchant.wallet.pending_balance.toLocaleString()} pending
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* KYC Information */}
          {merchant.kyc && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" />
                  KYC Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Legal Business Name</p>
                    <p className="font-medium">
                      {merchant.kyc.legal_business_name || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Business Type</p>
                    <p className="font-medium">
                      {merchant.kyc.business_type || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Owner Name</p>
                    <p className="font-medium">
                      {merchant.kyc.owner_name || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Owner Phone</p>
                    <p className="font-medium">
                      {merchant.kyc.owner_phone || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">PAN Number</p>
                    <p className="font-medium font-mono">
                      {merchant.kyc.pan_number
                        ? `${merchant.kyc.pan_number.slice(0, 4)}****`
                        : "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">GST Number</p>
                    <p className="font-medium font-mono">
                      {merchant.kyc.gst_number || "Not provided"}
                    </p>
                  </div>
                </div>

                {merchant.kyc.rejection_reason && (
                  <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive">
                    <p className="text-sm font-medium">Rejection Reason:</p>
                    <p className="text-sm">{merchant.kyc.rejection_reason}</p>
                  </div>
                )}

                {merchant.kycDocuments.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Documents ({merchant.kycDocuments.length})</p>
                    <div className="space-y-2">
                      {merchant.kycDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-2 rounded bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{doc.document_type}</span>
                          </div>
                          <Badge variant="outline">{doc.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Bank Accounts */}
          {merchant.bankAccounts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IndianRupee className="h-5 w-5" />
                  Bank Accounts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {merchant.bankAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="p-3 rounded-lg bg-muted/50 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{account.bank_name}</span>
                        {account.is_default && (
                          <Badge variant="outline" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground font-mono">
                        ****{account.account_number.slice(-4)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {account.account_holder_name}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {merchant.recentOrders.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchant.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{order.product_name}</TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{order.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={orderStatusColors[order.status] || "bg-gray-100"}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(order.created_at), "MMM d, yyyy")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No orders yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Disputes */}
        {merchant.recentDisputes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Recent Disputes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dispute ID</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {merchant.recentDisputes.map((dispute) => (
                    <TableRow key={dispute.id}>
                      <TableCell className="font-mono text-sm">
                        {dispute.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>{dispute.reason}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{dispute.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(dispute.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/disputes/${dispute.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
