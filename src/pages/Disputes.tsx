import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, AlertTriangle, Clock, CheckCircle, XCircle, Eye } from "lucide-react";
import { useDisputes } from "@/hooks/useDisputes";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig = {
  open: { label: "Open", icon: AlertTriangle, variant: "destructive" as const },
  under_review: { label: "Under Review", icon: Clock, variant: "secondary" as const },
  resolved: { label: "Resolved", icon: CheckCircle, variant: "default" as const },
  closed: { label: "Closed", icon: XCircle, variant: "outline" as const },
};

export default function Disputes() {
  const navigate = useNavigate();
  const { disputes, isLoadingDisputes } = useDisputes();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredDisputes = useMemo(() => {
    if (!disputes) return [];
    return disputes.filter((dispute) => {
      const matchesSearch =
        dispute.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispute.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dispute.order_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || dispute.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [disputes, searchQuery, statusFilter]);

  const metrics = useMemo(() => {
    if (!disputes) return { total: 0, open: 0, underReview: 0, resolved: 0 };
    return {
      total: disputes.length,
      open: disputes.filter((d) => d.status === "open").length,
      underReview: disputes.filter((d) => d.status === "under_review").length,
      resolved: disputes.filter((d) => d.status === "resolved").length,
    };
  }, [disputes]);

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Disputes</h1>
            <p className="text-muted-foreground">Manage and track your order disputes</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{metrics.total}</div>
                <p className="text-xs text-muted-foreground">Total Disputes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-destructive">{metrics.open}</div>
                <p className="text-xs text-muted-foreground">Open</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-secondary-foreground">{metrics.underReview}</div>
                <p className="text-xs text-muted-foreground">Under Review</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-primary">{metrics.resolved}</div>
                <p className="text-xs text-muted-foreground">Resolved</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>All Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search disputes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoadingDisputes ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredDisputes.length === 0 ? (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground">No disputes found</h3>
                  <p className="text-muted-foreground">
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "You haven't raised any disputes yet"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dispute ID</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Issue Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDisputes.map((dispute) => {
                        const config = statusConfig[dispute.status as keyof typeof statusConfig];
                        const StatusIcon = config?.icon || AlertTriangle;
                        return (
                          <TableRow key={dispute.id}>
                            <TableCell className="font-mono text-sm">
                              {dispute.id.slice(0, 8)}...
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {dispute.reason}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{dispute.issue_type || "General"}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={config?.variant || "secondary"} className="gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {config?.label || dispute.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {format(new Date(dispute.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/dispute/${dispute.id}/status`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
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
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
