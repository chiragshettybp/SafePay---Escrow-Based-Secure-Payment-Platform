import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MerchantOrder, OrderStatus } from "@/hooks/useMerchantOrders";
import {
  Eye,
  MoreHorizontal,
  Truck,
  MessageSquare,
  Loader2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface MerchantOrdersTableProps {
  orders: MerchantOrder[];
  isLoading: boolean;
  onUpdateStatus?: (orderId: string, status: OrderStatus) => void;
  isUpdating?: boolean;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  pending: { label: "Pending", variant: "secondary" },
  escrow_locked: { label: "Payment Locked", variant: "default" },
  in_progress: { label: "In Progress", variant: "default" },
  delivered: { label: "Delivered", variant: "outline" },
  completed: { label: "Completed", variant: "default" },
  disputed: { label: "Disputed", variant: "destructive" },
  refunded: { label: "Refunded", variant: "destructive" },
  cancelled: { label: "Cancelled", variant: "secondary" },
  draft: { label: "Draft", variant: "secondary" },
};

export function MerchantOrdersTable({
  orders,
  isLoading,
  onUpdateStatus,
  isUpdating,
}: MerchantOrdersTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border border-border rounded-lg">
            <Skeleton className="h-12 w-12 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">No Orders Yet</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Orders from customers will appear here once they make a purchase.
        </p>
      </div>
    );
  }

  const canUpdateStatus = (status: OrderStatus) => {
    return ["pending", "escrow_locked", "in_progress"].includes(status);
  };

  // Desktop Table
  const DesktopTable = () => (
    <div className="hidden md:block overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Delivery</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-mono text-xs">
                {order.id.slice(0, 8)}...
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-sm">{order.product_name}</p>
                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                    {order.product_description || "No description"}
                  </p>
                </div>
              </TableCell>
              <TableCell className="font-medium">
                ₹{Number(order.amount).toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant={statusConfig[order.status]?.variant || "default"}>
                  {statusConfig[order.status]?.label || order.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(order.created_at), "MMM dd, yyyy")}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {order.expected_delivery_date
                  ? format(new Date(order.expected_delivery_date), "MMM dd")
                  : "—"}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        to={`/merchant/order/${order.id}`}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Link>
                    </DropdownMenuItem>
                    {canUpdateStatus(order.status) && (
                      <DropdownMenuItem
                        onClick={() => onUpdateStatus?.(order.id, "in_progress")}
                        disabled={isUpdating}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Mark In Progress
                      </DropdownMenuItem>
                    )}
                    {order.status === "in_progress" && (
                      <DropdownMenuItem
                        onClick={() => onUpdateStatus?.(order.id, "delivered")}
                        disabled={isUpdating}
                      >
                        <Truck className="h-4 w-4 mr-2" />
                        Mark as Delivered
                      </DropdownMenuItem>
                    )}
                    {order.status === "disputed" && (
                      <DropdownMenuItem asChild>
                        <Link
                          to={`/merchant/dispute/${order.id}`}
                          className="flex items-center gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Respond to Dispute
                        </Link>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  // Mobile Cards
  const MobileCards = () => (
    <div className="md:hidden space-y-3">
      {orders.map((order) => (
        <div
          key={order.id}
          className="p-4 bg-card border border-border rounded-xl space-y-3"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-sm">{order.product_name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                #{order.id.slice(0, 8)}
              </p>
            </div>
            <Badge variant={statusConfig[order.status]?.variant || "default"}>
              {statusConfig[order.status]?.label || order.status}
            </Badge>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold">
              ₹{Number(order.amount).toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Created</span>
            <span>{format(new Date(order.created_at), "MMM dd, yyyy")}</span>
          </div>

          <div className="flex gap-2 pt-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link to={`/merchant/order/${order.id}`}>
                <Eye className="h-4 w-4 mr-1.5" />
                View
              </Link>
            </Button>
            {canUpdateStatus(order.status) && (
              <Button
                variant="default"
                size="sm"
                className="flex-1"
                onClick={() =>
                  onUpdateStatus?.(
                    order.id,
                    order.status === "in_progress" ? "delivered" : "in_progress"
                  )
                }
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Truck className="h-4 w-4 mr-1.5" />
                    {order.status === "in_progress" ? "Delivered" : "Ship"}
                  </>
                )}
              </Button>
            )}
            {order.status === "disputed" && (
              <Button asChild variant="destructive" size="sm" className="flex-1">
                <Link to={`/merchant/dispute/${order.id}`}>
                  <MessageSquare className="h-4 w-4 mr-1.5" />
                  Respond
                </Link>
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <DesktopTable />
      <MobileCards />
    </>
  );
}
