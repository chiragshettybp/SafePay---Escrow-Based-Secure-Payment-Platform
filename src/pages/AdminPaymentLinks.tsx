import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Link2,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Ban,
  CheckCircle,
  Flag,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Copy,
} from "lucide-react";
import { useAdminPaymentLinks, type PaymentLinkFilters } from "@/hooks/useAdminPaymentLinks";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function AdminPaymentLinks() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [selectedLink, setSelectedLink] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"disable" | "enable" | "flag" | null>(null);
  const [actionReason, setActionReason] = useState("");

  const filters: PaymentLinkFilters = {
    search: searchQuery || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  };

  const { links, stats, isLoading, disableLink, enableLink, flagForReview } = useAdminPaymentLinks(filters);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    setSearchParams(params);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    const params = new URLSearchParams(searchParams);
    if (value !== "all") {
      params.set("status", value);
    } else {
      params.delete("status");
    }
    setSearchParams(params);
  };

  const handleAction = async () => {
    if (!selectedLink || !actionType || !actionReason.trim()) return;

    let success = false;
    if (actionType === "disable") {
      success = await disableLink(selectedLink, actionReason);
    } else if (actionType === "enable") {
      success = await enableLink(selectedLink, actionReason);
    } else if (actionType === "flag") {
      success = await flagForReview(selectedLink, actionReason);
    }

    if (success) {
      setSelectedLink(null);
      setActionType(null);
      setActionReason("");
    }
  };

  const copyLinkUrl = (linkCode: string, merchantSlug: string) => {
    const url = `${window.location.origin}/pay/${merchantSlug}/${linkCode}`;
    navigator.clipboard.writeText(url);
    toast({
      title: "Link Copied",
      description: "Payment link URL copied to clipboard",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>;
      case "disabled":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Disabled</Badge>;
      case "expired":
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Payment Links"
          subtitle="Monitor and manage all merchant payment links"
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Link2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Links</p>
                  <p className="text-xl font-bold">{stats.total_links}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="text-xl font-bold">{stats.active_links}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Ban className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Disabled</p>
                  <p className="text-xl font-bold">{stats.disabled_links}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-500/10">
                  <AlertTriangle className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expired</p>
                  <p className="text-xl font-bold">{stats.expired_links}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payments</p>
                  <p className="text-xl font-bold">{stats.total_payments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Collected</p>
                  <p className="text-xl font-bold">₹{stats.total_collected.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title, code, or merchant..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payment Links Table */}
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : links.length === 0 ? (
              <div className="p-12 text-center">
                <Link2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No payment links found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "No payment links have been created yet"}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Link</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payments</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {links.map((link) => (
                      <TableRow key={link.id} className="border-border">
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{link.title}</span>
                            <span className="text-xs text-muted-foreground font-mono">{link.link_code}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{link.merchant?.business_name || "Unknown"}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">₹{link.amount.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>{getStatusBadge(link.status)}</TableCell>
                        <TableCell>
                          <span className="text-sm">{link.total_payments}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-emerald-400">
                            ₹{(link.total_collected || 0).toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(link.created_at), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/checkout/payment-links/${link.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {link.merchant?.slug && (
                                <DropdownMenuItem onClick={() => copyLinkUrl(link.link_code, link.merchant!.slug)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy Link
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => navigate(`/admin/checkout/payment-links/${link.id}/payments`)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                View Payments
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {link.status === "active" ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedLink(link.id);
                                    setActionType("disable");
                                  }}
                                  className="text-red-400"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Disable Link
                                </DropdownMenuItem>
                              ) : link.status === "disabled" ? (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedLink(link.id);
                                    setActionType("enable");
                                  }}
                                  className="text-emerald-400"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Enable Link
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedLink(link.id);
                                  setActionType("flag");
                                }}
                                className="text-amber-400"
                              >
                                <Flag className="h-4 w-4 mr-2" />
                                Flag for Review
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={() => { setActionType(null); setActionReason(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "disable" && "Disable Payment Link"}
              {actionType === "enable" && "Enable Payment Link"}
              {actionType === "flag" && "Flag for Review"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === "disable" && "This will immediately prevent new payments through this link. Existing completed payments are not affected."}
              {actionType === "enable" && "This will allow new payments through this link."}
              {actionType === "flag" && "This will create an alert for other admins to review this payment link."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason (required)</Label>
            <Textarea
              id="reason"
              placeholder="Enter the reason for this action..."
              value={actionReason}
              onChange={(e) => setActionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={!actionReason.trim()}
              className={
                actionType === "disable"
                  ? "bg-red-600 hover:bg-red-700"
                  : actionType === "enable"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }
            >
              {actionType === "disable" && "Disable Link"}
              {actionType === "enable" && "Enable Link"}
              {actionType === "flag" && "Flag for Review"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
