import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminEscrowDetails } from "@/hooks/useAdminEscrow";
import { format } from "date-fns";
import { History, ArrowUpRight, ArrowDownRight, Lock, Unlock, Settings } from "lucide-react";

export default function AdminEscrowHistory() {
  const { escrow_id } = useParams<{ escrow_id: string }>();
  const { transactions, isLoading } = useAdminEscrowDetails(escrow_id || "");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(Math.abs(amount));
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "credit":
        return <ArrowDownRight className="h-4 w-4 text-green-500" />;
      case "debit":
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case "lock":
        return <Lock className="h-4 w-4 text-amber-500" />;
      case "unlock":
        return <Unlock className="h-4 w-4 text-blue-500" />;
      case "adjustment":
        return <Settings className="h-4 w-4 text-purple-500" />;
      default:
        return <History className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case "credit":
        return "Credit";
      case "debit":
        return "Debit";
      case "lock":
        return "Funds Locked";
      case "unlock":
        return "Funds Unlocked";
      case "adjustment":
        return "Balance Adjustment";
      case "freeze":
        return "Account Frozen";
      case "unfreeze":
        return "Account Unfrozen";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Transaction History</h2>
        <Badge variant="outline">{transactions.length} transactions</Badge>
      </div>

      {transactions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No transaction history found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <Card key={tx.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-muted">
                    {getTransactionIcon(tx.transaction_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{getTransactionLabel(tx.transaction_type)}</p>
                        {tx.reason && (
                          <p className="text-sm text-muted-foreground">{tx.reason}</p>
                        )}
                        {tx.order && (
                          <p className="text-sm text-muted-foreground">
                            Order: {tx.order.product_name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`font-mono font-bold ${
                          tx.transaction_type === "credit" || tx.transaction_type === "unlock"
                            ? "text-green-600"
                            : tx.transaction_type === "debit" || tx.transaction_type === "lock"
                            ? "text-red-600"
                            : ""
                        }`}>
                          {tx.transaction_type === "credit" || tx.transaction_type === "unlock" ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2 text-sm text-muted-foreground">
                      <span>
                        Balance: {formatCurrency(tx.balance_before)} → {formatCurrency(tx.balance_after)}
                      </span>
                      <span>{format(new Date(tx.created_at), "MMM d, yyyy HH:mm")}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
