import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminInfoCard } from "@/components/admin/AdminInfoCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminWithdrawalDetails } from "@/hooks/useAdminWithdrawals";
import { IndianRupee, Building2, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function AdminWithdrawalDetails() {
  const { withdrawal_id } = useParams<{ withdrawal_id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { withdrawal, isLoading } = useAdminWithdrawalDetails(withdrawal_id || "");

  const currentTab = location.pathname.includes("/merchant") 
    ? "merchant" 
    : location.pathname.includes("/history") 
    ? "history" 
    : location.pathname.includes("/actions") 
    ? "actions" 
    : "merchant";

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-48" />
          <div className="mobile-grid-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!withdrawal) {
    return (
      <AdminLayout>
        <AdminPageHeader
          title="Withdrawal Not Found"
          backUrl="/admin/withdrawals"
          backLabel="Back to Withdrawals"
        />
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">This withdrawal request could not be found.</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  const statusVariant = {
    pending: "secondary",
    processing: "secondary",
    approved: "default",
    completed: "default",
    rejected: "destructive",
    failed: "destructive",
  }[withdrawal.status] as "default" | "secondary" | "destructive";

  const userName = withdrawal.merchant?.business_name || "Unknown";
  const userEmail = withdrawal.merchant?.email || "N/A";

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        <AdminPageHeader
          title="Withdrawal Request"
          subtitle={withdrawal.id}
          backUrl="/admin/withdrawals"
          backLabel="Withdrawals"
          badge={
            <Badge variant={statusVariant} className="capitalize">
              {withdrawal.status}
            </Badge>
          }
        />

        {/* Summary Cards */}
        <div className="mobile-grid-3">
          <AdminStatCard
            title="Amount"
            value={formatCurrency(withdrawal.amount)}
            subtitle={`Net: ${formatCurrency(withdrawal.net_amount)} | Fee: ${formatCurrency(withdrawal.fee)} | GST: ${formatCurrency(withdrawal.gst || 0)}`}
            icon={<IndianRupee className="h-4 w-4" />}
          />
          
          <AdminInfoCard
            title="Merchant"
            icon={<Building2 className="h-4 w-4" />}
            items={[
              { label: "Name", value: userName },
              { label: "Email", value: userEmail, mono: true },
            ]}
          />
          
          <AdminInfoCard
            title="Bank Account"
            icon={<CreditCard className="h-4 w-4" />}
            items={[
              { label: "Bank", value: withdrawal.bank_account?.bank_name || "N/A" },
              { label: "Account", value: `****${withdrawal.bank_account?.account_number?.slice(-4) || "****"}`, mono: true },
            ]}
          />
        </div>

        {/* Tabs - Scrollable on mobile */}
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <Tabs 
            value={currentTab} 
            onValueChange={(v) => navigate(`/admin/withdrawals/${withdrawal_id}/${v}`)}
          >
            <TabsList className="w-full sm:w-auto min-w-max">
              <TabsTrigger value="merchant" className="flex-1 sm:flex-none min-h-[40px]">
                Merchant
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 sm:flex-none min-h-[40px]">
                History
              </TabsTrigger>
              <TabsTrigger value="actions" className="flex-1 sm:flex-none min-h-[40px]">
                Actions
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        <Outlet context={{ withdrawal }} />
      </div>
    </AdminLayout>
  );
}
