import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { useCustomerDrafts, DraftPayment } from "@/hooks/useDraftPayments";
import { Seo } from "@/components/seo/Seo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Send,
  RotateCcw,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  FileText,
  Clock,
  XCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

type LocalDraftStatus = "draft" | "active" | "submitted" | "cancelled" | "deleted" | "expired" | "paid";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  draft: { label: "Draft", variant: "secondary", icon: <FileText className="h-3 w-3" /> },
  active: { label: "Draft", variant: "secondary", icon: <FileText className="h-3 w-3" /> },
  submitted: { label: "Submitted", variant: "default", icon: <Send className="h-3 w-3" /> },
  cancelled: { label: "Cancelled", variant: "outline", icon: <XCircle className="h-3 w-3" /> },
  deleted: { label: "Deleted", variant: "destructive", icon: <Trash2 className="h-3 w-3" /> },
  expired: { label: "Expired", variant: "outline", icon: <Clock className="h-3 w-3" /> },
  paid: { label: "Paid", variant: "default", icon: <CheckCircle2 className="h-3 w-3" /> },
};

const ITEMS_PER_PAGE = 10;

export default function Drafts() {
  const navigate = useNavigate();
  const { drafts, isLoading, submitDraft, cancelDraft, deleteDraft, restoreDraft, isSubmitting, isCancelling, isDeleting, isRestoring } = useCustomerDrafts();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<LocalDraftStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [actionDraft, setActionDraft] = useState<DraftPayment | null>(null);
  const [actionType, setActionType] = useState<"submit" | "cancel" | "delete" | "restore" | null>(null);

  // Filter drafts
  const filteredDrafts = drafts.filter((draft) => {
    if (statusFilter !== "all" && draft.draft_status !== statusFilter) return false;
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      draft.id.toLowerCase().includes(query) ||
      draft.product_name.toLowerCase().includes(query) ||
      draft.merchant_name.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredDrafts.length / ITEMS_PER_PAGE);
  const paginatedDrafts = filteredDrafts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  const handleAction = async () => {
    if (!actionDraft || !actionType) return;

    try {
      switch (actionType) {
        case "submit":
          await submitDraft(actionDraft.id);
          toast.success("Draft submitted for payment");
          break;
        case "cancel":
          await cancelDraft(actionDraft.id);
          toast.success("Draft cancelled");
          break;
        case "delete":
          await deleteDraft(actionDraft.id);
          toast.success("Draft deleted");
          break;
        case "restore":
          await restoreDraft(actionDraft.id);
          toast.success("Draft restored");
          break;
      }
    } catch (error) {
      // Error handled by hook
    } finally {
      setActionDraft(null);
      setActionType(null);
    }
  };

  const isDraftEditable = (d: DraftPayment) => d.draft_status === "draft" || d.draft_status === "active";
  const canSubmit = (d: DraftPayment) => isDraftEditable(d);
  const canEdit = (d: DraftPayment) => isDraftEditable(d);
  const canCancel = (d: DraftPayment) => ["draft", "active", "submitted"].includes(d.draft_status || "");
  const canDelete = (d: DraftPayment) => ["draft", "active", "cancelled"].includes(d.draft_status || "");
  const canRestore = (d: DraftPayment) => d.draft_status === "cancelled";

  const getActionDialogContent = () => {
    if (!actionDraft || !actionType) return null;

    const configs = {
      submit: {
        title: "Submit Draft for Payment?",
        description: `This will submit the draft payment of ₹${Number(actionDraft.amount).toLocaleString()} to ${actionDraft.merchant_name} for processing. You'll be redirected to complete the payment.`,
        confirmLabel: "Submit Draft",
        variant: "default" as const,
      },
      cancel: {
        title: "Cancel Draft?",
        description: "This will cancel the draft. You can restore it later if needed.",
        confirmLabel: "Cancel Draft",
        variant: "destructive" as const,
      },
      delete: {
        title: "Delete Draft?",
        description: "This will permanently mark the draft as deleted. This action cannot be undone easily.",
        confirmLabel: "Delete Draft",
        variant: "destructive" as const,
      },
      restore: {
        title: "Restore Draft?",
        description: "This will restore the cancelled draft so you can edit or submit it again.",
        confirmLabel: "Restore Draft",
        variant: "default" as const,
      },
    };

    return configs[actionType];
  };
  

  // Metrics
  const metrics = {
    total: drafts.length,
    drafts: drafts.filter(d => d.draft_status === "draft").length,
    submitted: drafts.filter(d => d.draft_status === "submitted").length,
    cancelled: drafts.filter(d => d.draft_status === "cancelled").length,
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <Seo title="Draft Payments" description="Manage your draft payments" canonicalPath="/drafts" />
        <PageTransition>
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Seo
        title="Draft Payments"
        description="View and manage your draft payments"
        canonicalPath="/drafts"
      />
      <PageTransition>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Draft Payments</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage your payment drafts before submitting
              </p>
            </div>
            <Button onClick={() => navigate("/payment/new")}>
              <Plus className="h-4 w-4 mr-2" />
              New Payment
            </Button>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Drafts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{metrics.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-600">{metrics.drafts}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Submitted</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-primary">{metrics.submitted}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cancelled</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-destructive">{metrics.cancelled}</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search drafts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as LocalDraftStatus | "all")}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Empty State */}
          {filteredDrafts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-card border border-border rounded-xl">
              <FileText className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Drafts Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create a new payment to get started"}
              </p>
              <Button onClick={() => navigate("/payment/new")}>
                <Plus className="h-4 w-4 mr-2" />
                New Payment
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Draft ID</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedDrafts.map((draft) => (
                      <TableRow key={draft.id} className="hover:bg-muted/20">
                        <TableCell className="font-mono text-xs">
                          {draft.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell className="font-medium">
                          {draft.merchant_name}
                        </TableCell>
                        <TableCell>
                          <p className="max-w-[200px] truncate text-sm">
                            {draft.product_name}
                          </p>
                        </TableCell>
                        <TableCell className="font-semibold">
                          ₹{Number(draft.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[draft.draft_status || "draft"]?.variant || "secondary"}>
                            {statusConfig[draft.draft_status || "draft"]?.icon}
                            <span className="ml-1">{statusConfig[draft.draft_status || "draft"]?.label || draft.draft_status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {draft.draft_expires_at ? (
                            <span className="flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5" />
                              {format(new Date(draft.draft_expires_at), "MMM dd, HH:mm")}
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem asChild>
                                <Link to={`/drafts/${draft.id}`} className="flex items-center gap-2">
                                  <Eye className="h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              {canEdit(draft) && (
                                <DropdownMenuItem asChild>
                                  <Link to={`/drafts/${draft.id}/edit`} className="flex items-center gap-2">
                                    <Edit className="h-4 w-4" />
                                    Edit Draft
                                  </Link>
                                </DropdownMenuItem>
                              )}
                              {canSubmit(draft) && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActionDraft(draft);
                                    setActionType("submit");
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <Send className="h-4 w-4" />
                                  Submit for Payment
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              {canRestore(draft) && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActionDraft(draft);
                                    setActionType("restore");
                                  }}
                                  className="flex items-center gap-2"
                                >
                                  <RotateCcw className="h-4 w-4" />
                                  Restore Draft
                                </DropdownMenuItem>
                              )}
                              {canCancel(draft) && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActionDraft(draft);
                                    setActionType("cancel");
                                  }}
                                  className="flex items-center gap-2 text-amber-600"
                                >
                                  <XCircle className="h-4 w-4" />
                                  Cancel Draft
                                </DropdownMenuItem>
                              )}
                              {canDelete(draft) && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setActionDraft(draft);
                                    setActionType("delete");
                                  }}
                                  className="flex items-center gap-2 text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete Draft
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
                {paginatedDrafts.map((draft) => (
                  <Card key={draft.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{draft.product_name}</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          #{draft.id.slice(0, 8)}
                        </p>
                      </div>
                      <Badge variant={statusConfig[draft.draft_status || "draft"]?.variant || "secondary"}>
                        {statusConfig[draft.draft_status || "draft"]?.label || draft.draft_status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      <div>
                        <span className="text-muted-foreground">Merchant</span>
                        <p className="font-medium truncate">{draft.merchant_name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Amount</span>
                        <p className="font-semibold">₹{Number(draft.amount).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link to={`/drafts/${draft.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Link>
                      </Button>
                      {canSubmit(draft) && (
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setActionDraft(draft);
                            setActionType("submit");
                          }}
                        >
                          <Send className="h-4 w-4 mr-1" />
                          Submit
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </PageTransition>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={!!actionDraft && !!actionType} onOpenChange={() => { setActionDraft(null); setActionType(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {actionType === "delete" && <AlertTriangle className="h-5 w-5 text-destructive" />}
              {getActionDialogContent()?.title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {getActionDialogContent()?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              className={getActionDialogContent()?.variant === "destructive" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              disabled={isSubmitting || isCancelling || isDeleting || isRestoring}
            >
              {getActionDialogContent()?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
