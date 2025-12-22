import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminSupport, SupportFilters } from "@/hooks/useAdminSupport";
import { 
  Search, 
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

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <AdminPageHeader
          title="Support Management"
          subtitle="Manage all customer and merchant support tickets"
        />

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          ) : (
            <>
              <AdminStatCard title="Total Tickets" value={metrics.total} icon={<MessageSquare className="h-4 w-4" />} />
              <AdminStatCard title="Open" value={metrics.open} icon={<AlertTriangle className="h-4 w-4" />} variant="destructive" />
              <AdminStatCard title="In Progress" value={metrics.inProgress} icon={<Clock className="h-4 w-4" />} />
              <AdminStatCard title="Waiting" value={metrics.waiting} icon={<Clock className="h-4 w-4" />} />
              <AdminStatCard title="Critical" value={metrics.critical} icon={<AlertTriangle className="h-4 w-4" />} variant="destructive" />
              <AdminStatCard title="High Priority" value={metrics.high} icon={<ArrowUpRight className="h-4 w-4" />} variant="warning" />
            </>
          )}
        </div>

        {/* Filters */}
        <Card className="admin-card-compact">
          <CardContent className="p-3 sm:p-4">
            <div className="admin-filters">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tickets..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:gap-2">
                <Select value={filters.status || "all"} onValueChange={(v) => handleFilterChange("status", v)}>
                  <SelectTrigger className="admin-filter-item h-10 text-xs sm:text-sm">
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
                  <SelectTrigger className="admin-filter-item h-10 text-xs sm:text-sm">
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
                  <SelectTrigger className="admin-filter-item h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
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

        {/* Desktop Table */}
        <Card className="hidden md:block admin-card-compact">
          <CardHeader className="p-3 sm:p-4 pb-2">
            <CardTitle className="text-sm sm:text-base">Support Tickets</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No support tickets found</p>
              </div>
            ) : (
              <div className="admin-table-scroll">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Ticket</TableHead>
                      <TableHead className="text-xs">Subject</TableHead>
                      <TableHead className="text-xs">User</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs">Priority</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs">Created</TableHead>
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
                          <TableCell className="font-mono text-xs">{ticket.ticket_number}</TableCell>
                          <TableCell className="max-w-[180px] truncate text-sm">{ticket.subject}</TableCell>
                          <TableCell className="text-sm">{ticket.profile?.full_name || "Unknown"}</TableCell>
                          <TableCell className="capitalize text-sm">{ticket.category}</TableCell>
                          <TableCell>
                            <span className={`text-xs ${priority.color}`}>{priority.label}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant} className="gap-1 text-xs">
                              {status.icon}
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(ticket.created_at), "MMM d, HH:mm")}
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
        <div className="md:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))
          ) : tickets.length === 0 ? (
            <Card className="admin-card-compact">
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No support tickets found</p>
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => {
              const status = statusConfig[ticket.status] || statusConfig.open;
              const priority = priorityConfig[ticket.priority] || priorityConfig.medium;
              return (
                <Card
                  key={ticket.id}
                  className="admin-card-compact cursor-pointer active:bg-muted/50 transition-colors touch-highlight"
                  onClick={() => navigate(`/admin/support/${ticket.id}`)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] text-muted-foreground">{ticket.ticket_number}</p>
                        <p className="font-medium text-sm truncate">{ticket.subject}</p>
                      </div>
                      <Badge variant={status.variant} className="gap-1 text-[10px] flex-shrink-0">
                        {status.icon}
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground truncate">{ticket.profile?.full_name || "Unknown"}</span>
                      <span className={priority.color}>{priority.label}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5">
                      <span>{format(new Date(ticket.created_at), "MMM d, yyyy")}</span>
                      <span className="capitalize">{ticket.category}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
