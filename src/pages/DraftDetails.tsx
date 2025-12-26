import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { useCustomerDrafts, DraftPayment, DraftAuditLog } from "@/hooks/useDraftPayments";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  ArrowLeft,
  Send,
  Edit,
  XCircle,
  Trash2,
  RotateCcw,
  Clock,
  FileText,
  CheckCircle2,
  Store,
  CreditCard,
  History,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

type DraftStatus = "draft" | "submitted" | "cancelled" | "deleted" | "expired" | "paid";

const statusConfig: Record<DraftStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  draft: { label: "Draft", variant: "secondary", color: "text-amber-600" },
  submitted: { label: "Submitted", variant: "default", color: "text-primary" },
  cancelled: { label: "Cancelled", variant: "outline", color: "text-muted-foreground" },
  deleted: { label: "Deleted", variant: "destructive", color: "text-destructive" },
  expired: { label: "Expired", variant: "outline", color: "text-muted-foreground" },
  paid: { label: "Paid", variant: "default", color: "text-emerald-600" },
};

export default function DraftDetails() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { drafts, isLoading, submitDraft, cancelDraft, deleteDraft, restoreDraft } = useCustomerDrafts();
  
  const [actionType, setActionType] = useState<"submit" | "cancel" | "delete" | "restore" | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const draft = drafts.find(d => d.id === draftId);

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: isAuditLoading } = useQuery({
    queryKey: ["draft-audit-logs", draftId],
    queryFn: async () => {
      if (!draftId) return [];
      const { data, error } = await supabase
        .from("draft_audit_logs")
        .select("*")
        .eq("order_id", draftId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as DraftAuditLog[];
    },
    enabled: !!draftId,
  });

  const handleAction = async () => {
    if (!draft || !actionType) return;
    setIsProcessing(true);

    try {
      switch (actionType) {
        case "submit":
          await submitDraft(draft.id);
          toast.success("Draft submitted for payment");
          navigate(`/payment/review/${draft.id}`);
          break;
        case "cancel":
          await cancelDraft(draft.id);
          toast.success("Draft cancelled");
          break;
        case "delete":
          await deleteDraft(draft.id);
          toast.success("Draft deleted");
          navigate("/drafts");
          break;
        case "restore":
          await restoreDraft(draft.id);
          toast.success("Draft restored");
          break;
      }
    } catch (error) {
      // Error handled by hook
    } finally {
      setIsProcessing(false);
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
    if (!draft || !actionType) return null;

    const configs = {
      submit: {
        title: "Submit Draft for Payment?",
        description: `This will submit the draft payment of ₹${Number(draft.amount).toLocaleString()} to ${draft.merchant_name} for processing.`,
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
        description: "This will permanently mark the draft as deleted.",
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <Seo title="Draft Details" description="View draft payment details" canonicalPath={`/drafts/${draftId}`} />
        <PageTransition>
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 rounded-xl" />
            <Skeleton className="h-48 rounded-xl" />
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (!draft) {
    return (
      <DashboardLayout>
        <Seo title="Draft Not Found" description="Draft payment not found" canonicalPath={`/drafts/${draftId}`} />
        <PageTransition>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Draft Not Found</h2>
            <p className="text-muted-foreground mb-4">This draft may have been deleted or doesn't exist.</p>
            <Button onClick={() => navigate("/drafts")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Drafts
            </Button>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  const status = draft.draft_status as DraftStatus;

  return (
    <DashboardLayout>
      <Seo
        title={`Draft #${draft.id.slice(0, 8)} | Details`}
        description="View and manage your draft payment"
        canonicalPath={`/drafts/${draftId}`}
      />
      <PageTransition>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 w-fit text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/drafts")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Drafts
            </Button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-foreground">Draft Details</h1>
                  <Badge variant={statusConfig[status]?.variant || "secondary"}>
                    {statusConfig[status]?.label || status}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  #{draft.id}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {canEdit(draft) && (
                  <Button variant="outline" asChild>
                    <Link to={`/drafts/${draft.id}/edit`}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Link>
                  </Button>
                )}
                {canSubmit(draft) && (
                  <Button onClick={() => setActionType("submit")}>
                    <Send className="h-4 w-4 mr-2" />
                    Submit for Payment
                  </Button>
                )}
                {canRestore(draft) && (
                  <Button variant="outline" onClick={() => setActionType("restore")}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Main Details */}
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Payment Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="text-2xl font-bold">₹{Number(draft.amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Created</p>
                      <p className="font-medium">{format(new Date(draft.created_at), "PPpp")}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-muted-foreground">Description</p>
                    <p className="font-medium mt-1">{draft.product_name}</p>
                    {draft.product_description && (
                      <p className="text-sm text-muted-foreground mt-2">{draft.product_description}</p>
                    )}
                  </div>

                  {draft.draft_expires_at && (
                    <>
                      <Separator />
                      <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <Clock className="h-4 w-4 text-amber-600" />
                        <span className="text-sm">
                          Expires: {format(new Date(draft.draft_expires_at), "PPpp")}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Audit Log */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Activity History
                  </CardTitle>
                  <CardDescription>Timeline of all changes to this draft</CardDescription>
                </CardHeader>
                <CardContent>
                  {isAuditLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-16" />
                      ))}
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No activity recorded yet
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {auditLogs.map((log, i) => (
                        <div key={log.id} className="relative pl-6 pb-4 last:pb-0">
                          {i !== auditLogs.length - 1 && (
                            <div className="absolute left-[9px] top-6 bottom-0 w-px bg-border" />
                          )}
                          <div className="absolute left-0 top-1 w-[18px] h-[18px] rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm capitalize">
                              {log.action_type.replace(/_/g, " ")}
                            </p>
                            {log.reason && (
                              <p className="text-sm text-muted-foreground">{log.reason}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(log.created_at), "PPpp")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Merchant
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-medium">{draft.merchant_name}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">
                    ID: {draft.merchant_id.slice(0, 8)}...
                  </p>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {canCancel(draft) && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-amber-600 hover:text-amber-700"
                      onClick={() => setActionType("cancel")}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel Draft
                    </Button>
                  )}
                  {canDelete(draft) && (
                    <Button
                      variant="outline"
                      className="w-full justify-start text-destructive hover:text-destructive"
                      onClick={() => setActionType("delete")}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Draft
                    </Button>
                  )}
                  {!canCancel(draft) && !canDelete(draft) && !canRestore(draft) && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No actions available
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </PageTransition>

      {/* Action Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {(actionType === "delete" || actionType === "cancel") && (
                <AlertTriangle className="h-5 w-5 text-destructive" />
              )}
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
              disabled={isProcessing}
            >
              {getActionDialogContent()?.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
