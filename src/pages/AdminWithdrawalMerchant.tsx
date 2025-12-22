import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminWithdrawalMerchant() {
  const { withdrawal } = useOutletContext<{ withdrawal: any }>();
  const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Merchant Details</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-sm text-muted-foreground">Business Name</p><p className="font-medium">{withdrawal.merchant?.business_name}</p></div>
          <div><p className="text-sm text-muted-foreground">Email</p><p className="font-medium">{withdrawal.merchant?.email}</p></div>
          <div><p className="text-sm text-muted-foreground">Status</p><Badge>{withdrawal.merchant?.status}</Badge></div>
          <div><p className="text-sm text-muted-foreground">KYC</p><Badge variant="outline">{withdrawal.kyc_status}</Badge></div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Bank Account</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-sm text-muted-foreground">Bank</p><p className="font-medium">{withdrawal.bank_account?.bank_name}</p></div>
          <div><p className="text-sm text-muted-foreground">Account Holder</p><p className="font-medium">{withdrawal.bank_account?.account_holder_name}</p></div>
          <div><p className="text-sm text-muted-foreground">Account Number</p><p className="font-mono">****{withdrawal.bank_account?.account_number?.slice(-4)}</p></div>
          <div><p className="text-sm text-muted-foreground">IFSC</p><p className="font-mono">{withdrawal.bank_account?.ifsc_code}</p></div>
        </CardContent>
      </Card>
      {withdrawal.escrow_account && (
        <Card>
          <CardHeader><CardTitle>Escrow Snapshot</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div><p className="text-sm text-muted-foreground">Total</p><p className="font-mono font-medium">{formatCurrency(withdrawal.escrow_account.total_balance)}</p></div>
            <div><p className="text-sm text-muted-foreground">Locked</p><p className="font-mono font-medium">{formatCurrency(withdrawal.escrow_account.locked_balance)}</p></div>
            <div><p className="text-sm text-muted-foreground">Available</p><p className="font-mono font-medium">{formatCurrency(withdrawal.escrow_account.available_balance)}</p></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
