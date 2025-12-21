import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Order, OrderStatus } from "@/hooks/useOrders";
import { Eye, MoreHorizontal, CheckCircle, AlertTriangle, Loader2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrdersTableProps {
  orders: Order[];
  isLoading: boolean;
  onConfirmDelivery: (orderId: string) => void;
  isConfirming: boolean;
}

const statusConfig: Record<OrderStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  in_progress: { label: "In Progress", variant: "default" },
  delivered: { label: "Delivered", variant: "default" },
  completed: { label: "Completed", variant: "outline" },
  disputed: { label: "Disputed", variant: "destructive" },
  refunded: { label: "Refunded", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
  draft: { label: "Draft", variant: "secondary" },
  escrow_locked: { label: "Escrow Locked", variant: "default" },
};

export function OrdersTable({ orders, isLoading, onConfirmDelivery, isConfirming }: OrdersTableProps) {
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (confirmOrderId) {
      onConfirmDelivery(confirmOrderId);
      setConfirmOrderId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">No Orders Found</h3>
        <p className="text-muted-foreground mb-4">
          You don't have any orders yet. Start shopping to see your orders here.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Order ID</TableHead>
              <TableHead>Merchant</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} className="hover:bg-muted/30">
                <TableCell className="font-mono text-sm">
                  {order.id.slice(0, 8)}...
                </TableCell>
                <TableCell className="font-medium">{order.merchant_name}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {order.product_name}
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${order.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  <Badge variant={statusConfig[order.status].variant}>
                    {statusConfig[order.status].label}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(order.created_at), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/order/${order.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/order/${order.id}/tracking`}>
                          <Truck className="h-4 w-4 mr-2" />
                          Track Order
                        </Link>
                      </DropdownMenuItem>
                      {order.status === "delivered" && (
                        <DropdownMenuItem 
                          onClick={() => setConfirmOrderId(order.id)}
                          className="text-green-600"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Confirm Delivery
                        </DropdownMenuItem>
                      )}
                      {(order.status === "escrow_locked" || order.status === "in_progress") && (
                        <DropdownMenuItem asChild>
                          <Link to={`/order/${order.id}/confirm`}>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirm Delivery
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {(order.status === "pending" || order.status === "in_progress" || order.status === "delivered" || order.status === "escrow_locked") && (
                        <DropdownMenuItem asChild>
                          <Link to={`/order/${order.id}/report`}>
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Report Issue
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

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="p-4 rounded-xl border border-border bg-card space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-foreground">{order.product_name}</p>
                <p className="text-sm text-muted-foreground">{order.merchant_name}</p>
              </div>
              <Badge variant={statusConfig[order.status].variant}>
                {statusConfig[order.status].label}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {format(new Date(order.created_at), "MMM d, yyyy")}
              </span>
              <span className="font-semibold text-foreground">
                ${order.amount.toFixed(2)}
              </span>
            </div>

            <div className="flex gap-2 pt-2 border-t border-border">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <Link to={`/order/${order.id}`}>View Details</Link>
              </Button>
              {order.status === "delivered" && (
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setConfirmOrderId(order.id)}
                  disabled={isConfirming}
                >
                  {isConfirming ? "..." : "Confirm"}
                </Button>
              )}
              {(order.status === "escrow_locked" || order.status === "in_progress") && (
                <Button asChild size="sm" className="flex-1">
                  <Link to={`/order/${order.id}/confirm`}>Confirm</Link>
                </Button>
              )}
              {(order.status === "pending" || order.status === "in_progress" || order.status === "delivered" || order.status === "escrow_locked") && (
                <Button asChild variant="destructive" size="sm" className="flex-1">
                  <Link to={`/order/${order.id}/report`}>Report</Link>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Confirm Dialog */}
      <AlertDialog open={!!confirmOrderId} onOpenChange={() => setConfirmOrderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Delivery</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to confirm delivery? This will release the payment to the merchant. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isConfirming}>
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Confirming...
                </>
              ) : (
                "Confirm Delivery"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
