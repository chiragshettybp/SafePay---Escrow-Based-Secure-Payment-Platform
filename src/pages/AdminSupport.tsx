import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSupport, SupportFilters } from "@/hooks/useAdminSupport";
import { 
  Search, 
  Filter, 
  Headphones, 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  ArrowUpRight
} from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  open: { label: "Open", variant: "destructive", icon: <AlertTriangle className="h-3 w-3" /> },
  in_progress: { label: "In Progress", variant: "default", icon: <Clock className="h-3 w-3" /> },
  waiting: { label: "Waiting", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  resolved: { label: "Resolved", variant: "outline", icon: <CheckCircle className="h-3 w-3" /> },
  closed: { label: "Closed", variant: "secondary", icon: <XCircle className="h-3 w-3" /> },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-muted-foreground" },
  medium: { label: "Medium", color: "text-blue-500" },
  high: { label: "High", color: "text-amber-500" },
  critical: { label: "Critical", color: "text-red-500 font-bold" },
};

export default function AdminSupport() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<SupportFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const { tickets, isLoading, metrics } = useAdminSupport({ ...filters, search: searchTerm });

  const handleFilterChange = (key: keyof SupportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value === "all" ? undefined : value }));
  };

  const MetricCard = ({ title, value, icon: Icon, className }: { title: string; value: number; icon: React.ElementType; className?: string }) => (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Headphones className="h-6 w-6" />
              Support Management
            </h1>
            <p className="text-muted-foreground">Manage all customer and merchant support tickets</p>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : (
            <>
              <MetricCard title="Total Tickets" value={metrics.total} icon={MessageSquare} />
              <MetricCard title="Open" value={metrics.open} icon={AlertTriangle} className="border-red-500/30" />
              <MetricCard title="In Progress" value={metrics.inProgress} icon={Clock} />
              <MetricCard title="Waiting" value={metrics.waiting} icon={Clock} />
              <MetricCard title="Critical" value={metrics.critical} icon={AlertTriangle} className="border-red-500/50" />
              <MetricCard title="High Priority" value={metrics.high} icon={ArrowUpRight} className="border-amber-500/30" />
            </>
          )}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ticket number or subject..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Select value={filters.status || "all"} onValueChange={(v) => handleFilterChange("status", v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting">Waiting</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.priority || "all"} onValueChange={(v) => handleFilterChange("priority", v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filters.category || "all"} onValueChange={(v) => handleFilterChange("category", v)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card>
          <CardHeader>
            <CardTitle>Support Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No support tickets found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => {
                      const status = statusConfig[ticket.status] || statusConfig.open;
                      const priority = priorityConfig[ticket.priority] || priorityConfig.medium;
                      return (
                        <TableRow
                          key={ticket.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => navigate(`/admin/support/${ticket.id}`)}
                        >
                          <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{ticket.subject}</TableCell>
                          <TableCell>{ticket.profile?.full_name || "Unknown"}</TableCell>
                          <TableCell className="capitalize">{ticket.category}</TableCell>
                          <TableCell>
                            <span className={priority.color}>{priority.label}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="gap-1">
                              {status.icon}
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(ticket.created_at), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(ticket.updated_at), "MMM d, HH:mm")}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {tickets.map((ticket) => {
            const status = statusConfig[ticket.status] || statusConfig.open;
            const priority = priorityConfig[ticket.priority] || priorityConfig.medium;
            return (
              <Card
                key={ticket.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/admin/support/${ticket.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-mono text-sm text-muted-foreground">{ticket.ticket_number}</p>
                      <p className="font-medium">{ticket.subject}</p>
                    </div>
                    <Badge variant={status.variant} className="gap-1">
                      {status.icon}
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{ticket.profile?.full_name || "Unknown"}</span>
                    <span className={priority.color}>{priority.label}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                    <span>{format(new Date(ticket.created_at), "MMM d, yyyy")}</span>
                    <span className="capitalize">{ticket.category}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
