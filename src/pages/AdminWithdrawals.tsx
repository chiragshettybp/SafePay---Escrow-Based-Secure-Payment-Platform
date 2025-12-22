import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminWithdrawals, WithdrawalFilters } from "@/hooks/useAdminWithdrawals";
import { Search, IndianRupee, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";

export default function AdminWithdrawals() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<WithdrawalFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const { withdrawals, metrics, isLoading } = useAdminWithdrawals({ ...filters, search: searchTerm });

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "pending": return "secondary";
      case "approved": return "default";
      case "processing": return "outline";
      case "paid": case "completed": return "default";
      case "failed": case "rejected": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Withdrawals</h1>
          <p className="text-muted-foreground">Manage merchant and customer withdrawal requests</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Pending</p><p className="text-xl font-bold">{formatCurrency(metrics?.totalPending || 0)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Processing</p><p className="text-xl font-bold">{formatCurrency(metrics?.totalProcessing || 0)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Total Paid</p><p className="text-xl font-bold">{formatCurrency(metrics?.totalPaid || 0)}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Failed</p><p className="text-xl font-bold text-destructive">{formatCurrency(metrics?.totalFailed || 0)}</p></CardContent></Card>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
          <Select value={filters.userType || "all"} onValueChange={(v) => setFilters({ ...filters, userType: v === "all" ? undefined : v as "merchant" | "customer" })}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="User Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="merchant">Merchants</SelectItem>
              <SelectItem value="customer">Customers</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}>
            <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? Array.from({ length: 5 }).map((_, i) => <TableRow key={i}>{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>) : withdrawals.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No withdrawals found</TableCell></TableRow>
              ) : withdrawals.map((w) => (
                <TableRow key={w.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/withdrawals/${w.id}`)}>
                  <TableCell><p className="font-medium">{w.user_name || "Unknown"}</p></TableCell>
                  <TableCell><Badge variant={w.user_type === "merchant" ? "default" : "secondary"}>{w.user_type}</Badge></TableCell>
                  <TableCell className="text-right font-mono">{formatCurrency(w.amount)}</TableCell>
                  <TableCell><Badge variant={getStatusVariant(w.status)}>{w.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{format(new Date(w.created_at), "MMM d, yyyy")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </AdminLayout>
  );
}
