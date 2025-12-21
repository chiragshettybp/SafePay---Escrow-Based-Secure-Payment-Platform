import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, AlertTriangle, Clock, CheckCircle, XCircle, Eye, ChevronRight } from "lucide-react";
import { useDisputes } from "@/hooks/useDisputes";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig = {
  open: { label: "Open", icon: AlertTriangle, variant: "destructive" as const, color: "text-destructive" },
  under_review: { label: "Under Review", icon: Clock, variant: "secondary" as const, color: "text-amber-500" },
  resolved: { label: "Resolved", icon: CheckCircle, variant: "default" as const, color: "text-green-500" },
  closed: { label: "Closed", icon: XCircle, variant: "outline" as const, color: "text-muted-foreground" },
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
        <div className="space-y-4 sm:space-y-6 pb-6">
          {/* Page Header */}
          <div className="px-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Disputes</h1>
            <p className="text-sm text-muted-foreground">Manage and track your order disputes</p>
          </div>

          {/* Metrics - Compact Grid */}
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            <Card className="bg-card/50">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold">{metrics.total}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Total</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-destructive">{metrics.open}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Open</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-amber-500">{metrics.underReview}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Review</p>
              </CardContent>
            </Card>
            <Card className="bg-card/50">
              <CardContent className="p-3 sm:p-4 text-center">
                <div className="text-lg sm:text-2xl font-bold text-green-500">{metrics.resolved}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-tight">Resolved</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters - Mobile Optimized */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search disputes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[160px] h-11">
                <SelectValue placeholder="Filter status" />
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

          {/* Disputes List - Mobile Cards */}
          {isLoadingDisputes ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredDisputes.length === 0 ? (
            <Card className="bg-card/50">
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-medium text-foreground mb-1">No disputes found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "You haven't raised any disputes yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredDisputes.map((dispute) => {
                const config = statusConfig[dispute.status as keyof typeof statusConfig];
                const StatusIcon = config?.icon || AlertTriangle;
                
                return (
                  <Card 
                    key={dispute.id} 
                    className="bg-card/50 active:scale-[0.99] transition-transform cursor-pointer hover:bg-accent/30"
                    onClick={() => navigate(`/dispute/${dispute.id}/status`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          {/* Status Badge & ID */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={config?.variant || "secondary"} className="gap-1 text-xs">
                              <StatusIcon className="h-3 w-3" />
                              {config?.label || dispute.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">
                              #{dispute.id.slice(0, 8)}
                            </span>
                          </div>
                          
                          {/* Reason */}
                          <p className="font-medium text-sm line-clamp-1">{dispute.reason}</p>
                          
                          {/* Issue Type & Date */}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {dispute.issue_type || "General"}
                              </Badge>
                            </span>
                            <span>•</span>
                            <span>{format(new Date(dispute.created_at), "MMM d, yyyy")}</span>
                          </div>
                        </div>
                        
                        {/* Arrow */}
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
