import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface Order {
  id: string;
  product_name: string;
  amount: number;
  status: string;
  created_at: string;
}

interface Dispute {
  id: string;
  reason: string;
  status: string;
  created_at: string;
}

interface Merchant {
  id: string;
  business_name: string;
  status: string;
  created_at: string;
}

interface Payout {
  id: string;
  amount: number;
  net_amount: number;
  status: string;
  created_at: string;
}

export function AdminSummaryTables() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const [ordersRes, disputesRes, merchantsRes, payoutsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("id, product_name, amount, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("disputes")
          .select("id, reason, status, created_at")
          .in("status", ["open", "under_review"])
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("merchants")
          .select("id, business_name, status, created_at")
          .eq("status", "pending_verification")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("merchant_payouts")
          .select("id, amount, net_amount, status, created_at")
          .eq("status", "processing")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setOrders(ordersRes.data || []);
      setDisputes(disputesRes.data || []);
      setMerchants(merchantsRes.data || []);
      setPayouts(payoutsRes.data || []);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      open: "destructive",
      under_review: "outline",
      processing: "secondary",
      completed: "default",
      delivered: "default",
      active: "default",
      pending_verification: "secondary",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status.replace(/_/g, " ")}
      </Badge>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Latest Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Latest Orders</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/orders")}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No orders yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <TableCell className="font-medium truncate max-w-[150px]">
                      {order.product_name}
                    </TableCell>
                    <TableCell>₹{Number(order.amount).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Open Disputes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Open Disputes</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/disputes")}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : disputes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No open disputes</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map((dispute) => (
                  <TableRow
                    key={dispute.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/disputes/${dispute.id}`)}
                  >
                    <TableCell className="font-medium truncate max-w-[150px]">
                      {dispute.reason}
                    </TableCell>
                    <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(dispute.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Merchants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pending Merchants</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/merchants?filter=pending")}
          >
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : merchants.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No pending merchants</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merchants.map((merchant) => (
                  <TableRow
                    key={merchant.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/merchants/${merchant.id}`)}
                  >
                    <TableCell className="font-medium truncate max-w-[150px]">
                      {merchant.business_name}
                    </TableCell>
                    <TableCell>{getStatusBadge(merchant.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(merchant.created_at), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pending Withdrawals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pending Withdrawals</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate("/admin/withdrawals")}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pending withdrawals
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Net</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow
                    key={payout.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/withdrawals/${payout.id}`)}
                  >
                    <TableCell>₹{Number(payout.amount).toLocaleString()}</TableCell>
                    <TableCell>₹{Number(payout.net_amount).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(payout.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminSummaryTables;
