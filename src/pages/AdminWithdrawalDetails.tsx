import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminWithdrawalDetails } from "@/hooks/useAdminWithdrawals";
import { ArrowLeft, DollarSign, Building2, CreditCard } from "lucide-react";
import { format } from "date-fns";

export default function AdminWithdrawalDetails() {
  const { withdrawal_id } = useParams<{ withdrawal_id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { withdrawal, isLoading } = useAdminWithdrawalDetails(withdrawal_id || "");

  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

  const currentTab = location.pathname.includes("/merchant") ? "merchant" : location.pathname.includes("/history") ? "history" : location.pathname.includes("/actions") ? "actions" : "merchant";

  if (isLoading) return <AdminLayout><div className="p-6"><Skeleton className="h-64" /></div></AdminLayout>;
  if (!withdrawal) return <AdminLayout><div className="p-6"><Card><CardContent className="py-12 text-center"><p>Withdrawal not found</p><Button className="mt-4" onClick={() => navigate("/admin/withdrawals")}>Back</Button></CardContent></Card></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/withdrawals")}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">Withdrawal Request</h1>
              <Badge>{withdrawal.status}</Badge>
            </div>
            <p className="text-muted-foreground font-mono text-sm">{withdrawal.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><DollarSign className="h-4 w-4" />Amount</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold font-mono">{formatCurrency(withdrawal.amount)}</p><p className="text-sm text-muted-foreground">Net: {formatCurrency(withdrawal.net_amount)} (Fee: {formatCurrency(withdrawal.fee)})</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><Building2 className="h-4 w-4" />Merchant</CardTitle></CardHeader><CardContent><p className="font-medium">{withdrawal.merchant?.business_name}</p><p className="text-sm text-muted-foreground">{withdrawal.merchant?.email}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-2"><CreditCard className="h-4 w-4" />Bank Account</CardTitle></CardHeader><CardContent><p className="font-medium">{withdrawal.bank_account?.bank_name}</p><p className="text-sm text-muted-foreground font-mono">****{withdrawal.bank_account?.account_number?.slice(-4)}</p></CardContent></Card>
        </div>

        <Tabs value={currentTab} onValueChange={(v) => navigate(`/admin/withdrawals/${withdrawal_id}/${v}`)}>
          <TabsList><TabsTrigger value="merchant">Merchant</TabsTrigger><TabsTrigger value="history">History</TabsTrigger><TabsTrigger value="actions">Actions</TabsTrigger></TabsList>
        </Tabs>
        <Outlet context={{ withdrawal }} />
      </div>
    </AdminLayout>
  );
}
