import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminEscrowDetails } from "@/hooks/useAdminEscrow";
import { format } from "date-fns";
import { Package, AlertTriangle } from "lucide-react";

export default function AdminEscrowOrders() {
  const { escrow_id } = useParams<{ escrow_id: string }>();
  const navigate = useNavigate();
  const { orders, isLoading } = useAdminEscrowDetails(escrow_id || "");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "escrow_locked":
        return "default";
      case "in_progress":
        return "secondary";
      case "delivered":
        return "outline";
      case "completed":
        return "default";
      case "disputed":
        return "destructive";
      case "refunded":
        return "destructive";
      default:
        return "secondary";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Orders Contributing to Escrow</h2>
        <Badge variant="outline">{orders.length} orders</Badge>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Order Status</TableHead>
                <TableHead>Dispute</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No orders found
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}...</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{order.product_name}</p>
                        {order.product_description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{order.product_description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(order.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {order.disputes && order.disputes.length > 0 ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" />
                          {order.disputes[0].status}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(order.created_at), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No orders found
            </CardContent>
          </Card>
        ) : (
          orders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => navigate(`/admin/orders/${order.id}`)}
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium">{order.product_name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{order.id.slice(0, 8)}...</p>
                  </div>
                  <p className="font-mono font-bold">{formatCurrency(order.amount)}</p>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge>
                    {order.disputes && order.disputes.length > 0 && (
                      <Badge variant="destructive">Disputed</Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), "MMM d")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
