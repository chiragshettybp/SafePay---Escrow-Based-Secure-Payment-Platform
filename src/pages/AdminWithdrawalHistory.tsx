import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminWithdrawalDetails } from "@/hooks/useAdminWithdrawals";
import { format } from "date-fns";
import { History } from "lucide-react";

export default function AdminWithdrawalHistory() {
  const { withdrawal_id } = useParams<{ withdrawal_id: string }>();
  const { transactions } = useAdminWithdrawalDetails(withdrawal_id || "");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><History className="h-5 w-5" /><h2 className="text-lg font-semibold">Withdrawal History</h2></div>
      {transactions.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-muted-foreground">No history</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <Card key={tx.id}>
              <CardContent className="p-4 flex justify-between items-start">
                <div><Badge variant="outline">{tx.status}</Badge>{tx.message && <p className="text-sm text-muted-foreground mt-1">{tx.message}</p>}</div>
                <span className="text-sm text-muted-foreground">{format(new Date(tx.created_at), "MMM d, HH:mm")}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
