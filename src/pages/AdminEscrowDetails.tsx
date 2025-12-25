import { useParams, useNavigate, Outlet, useLocation, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAdminEscrowDetails } from "@/hooks/useAdminEscrow";
import { ArrowLeft, Wallet, Lock, Unlock, ExternalLink, Building2, Shield, Snowflake, AlertTriangle } from "lucide-react";
export default function AdminEscrowDetails() {
  const { escrow_id } = useParams<{ escrow_id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { escrowAccount, isLoading } = useAdminEscrowDetails(escrow_id || "");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Determine current tab from URL
  const pathSegments = location.pathname.split('/');
  const lastSegment = pathSegments[pathSegments.length - 1];
  const currentTab = ["orders", "history", "actions"].includes(lastSegment) 
    ? lastSegment 
    : "orders";

  // Redirect to /orders if on base escrow detail path
  const isBasePath = location.pathname === `/admin/escrow/${escrow_id}` || 
                     location.pathname === `/admin/escrow/${escrow_id}/`;

  const handleTabChange = (value: string) => {
    navigate(`/admin/escrow/${escrow_id}/${value}`);
  };

  // Redirect to orders tab by default
  if (isBasePath && !isLoading) {
    return <Navigate to={`/admin/escrow/${escrow_id}/orders`} replace />;
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-4 md:p-6 space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!escrowAccount) {
    return (
      <AdminLayout>
        <div className="p-4 md:p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Escrow account not found</p>
              <Button className="mt-4" onClick={() => navigate("/admin/escrow")}>
                Back to Escrow List
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Frozen Account Alert */}
        {escrowAccount.is_frozen && (
          <Alert variant="destructive" className="border-destructive bg-destructive/10">
            <Snowflake className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <strong>This escrow account is FROZEN.</strong> All withdrawals and actions are blocked until unfrozen.
            </AlertDescription>
          </Alert>
        )}

        {/* Risk Flag Alert */}
        {escrowAccount.risk_flag === "high" && (
          <Alert variant="destructive" className="border-amber-500 bg-amber-500/10">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-700 dark:text-amber-400">
              <strong>High Risk Account.</strong> Review all transactions carefully before taking any action.
            </AlertDescription>
          </Alert>
        )}

        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/escrow")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold">
                {escrowAccount.merchant?.business_name || "Unknown Merchant"}
              </h1>
              {escrowAccount.is_frozen && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <Snowflake className="h-3 w-3" /> Frozen
                </Badge>
              )}
              {escrowAccount.risk_flag && (
                <Badge variant={escrowAccount.risk_flag === "high" ? "destructive" : "secondary"}>
                  {escrowAccount.risk_flag} risk
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">Escrow Account Details • ID: {escrow_id?.slice(0, 8)}...</p>
          </div>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Total Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono">{formatCurrency(escrowAccount.total_balance)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4" /> Locked Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono text-amber-600">{formatCurrency(escrowAccount.locked_balance)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Unlock className="h-4 w-4" /> Available Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold font-mono text-green-600">{formatCurrency(escrowAccount.available_balance)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Merchant Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" /> Linked Merchant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Business Name</p>
                <p className="font-medium">{escrowAccount.merchant?.business_name || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{escrowAccount.merchant?.email || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Business Status</p>
                <Badge variant={escrowAccount.merchant?.status === "active" ? "default" : "secondary"}>
                  {escrowAccount.merchant?.status || "N/A"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">KYC Status</p>
                <Badge variant={escrowAccount.kyc_status === "approved" ? "default" : "secondary"} className="flex items-center gap-1 w-fit">
                  <Shield className="h-3 w-3" />
                  {escrowAccount.kyc_status || "not_started"}
                </Badge>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate(`/admin/merchants/${escrowAccount.merchant_id}`)}
            >
              View Merchant Profile <ExternalLink className="ml-2 h-3 w-3" />
            </Button>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={handleTabChange}>
          <TabsList className="w-full md:w-auto">
            <TabsTrigger value="orders" className="flex-1 md:flex-none">Orders</TabsTrigger>
            <TabsTrigger value="history" className="flex-1 md:flex-none">History</TabsTrigger>
            <TabsTrigger value="actions" className="flex-1 md:flex-none">Admin Actions</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Tab Content */}
        <Outlet context={{ escrowAccount }} />
      </div>
    </AdminLayout>
  );
}
