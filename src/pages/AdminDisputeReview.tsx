import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { useAdminDisputes } from "@/hooks/useAdminDisputes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  AlertTriangle,
  User,
  Store,
  ShoppingCart,
  FileText,
  MessageSquare,
  Image,
  Clock,
  ChevronDown,
  Send,
  Gavel,
  Loader2,
} from "lucide-react";
import { Seo } from "@/components/seo/Seo";

const statusColors: Record<string, string> = {
  open: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  under_review: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

export default function AdminDisputeReview() {
  const { disputeId } = useParams();
  const navigate = useNavigate();
  const { useDisputeDetails, addAdminNote, updateStatus } = useAdminDisputes();
  const { data: dispute, isLoading, error } = useDisputeDetails(disputeId || "");

  const [note, setNote] = useState("");
  const [isTimelineOpen, setIsTimelineOpen] = useState(true);
  const [isEvidenceOpen, setIsEvidenceOpen] = useState(true);

  const handleAddNote = async () => {
    if (!disputeId || !note.trim()) return;
    await addAdminNote.mutateAsync({ disputeId, note: note.trim() });
    setNote("");
  };

  const handleSetUnderReview = async () => {
    if (!disputeId || dispute?.status !== "open") return;
    await updateStatus.mutateAsync({ disputeId, status: "under_review" });
  };

  const canMakeDecision =
    dispute && ["open", "under_review"].includes(dispute.status);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-6 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !dispute) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Dispute Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The dispute you're looking for doesn't exist.
          </p>
          <Button onClick={() => navigate("/admin/disputes")}>
            Back to Disputes
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <Seo
        title={`Dispute ${disputeId?.slice(0, 8)} | Admin`}
        description="Review dispute details and evidence"
      />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/disputes")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Dispute Review</h1>
                <Badge className={statusColors[dispute.status] || "bg-gray-100"}>
                  {dispute.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-muted-foreground font-mono">#{dispute.id}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {dispute.status === "open" && (
              <Button
                variant="outline"
                onClick={handleSetUnderReview}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Mark Under Review
              </Button>
            )}
            {canMakeDecision && (
              <Button
                onClick={() => navigate(`/admin/disputes/${dispute.id}/decision`)}
              >
                <Gavel className="h-4 w-4 mr-2" />
                Make Decision
              </Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Dispute Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Dispute Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Dispute ID</p>
                    <p className="font-mono text-sm">{dispute.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Order ID</p>
                    <Link
                      to={`/admin/orders/${dispute.order_id}`}
                      className="font-mono text-sm text-primary hover:underline"
                    >
                      {dispute.order_id.slice(0, 8)}...
                    </Link>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Issue Type</p>
                    <p className="text-sm">{dispute.issue_type || "General"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">
                      {format(new Date(dispute.created_at), "MMM d, yyyy h:mm a")}
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reason</p>
                  <p className="font-medium">{dispute.reason}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-sm">{dispute.description}</p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Escrow Amount</span>
                    <span className="text-xl font-bold">
                      ₹{dispute.order?.amount?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>

                {dispute.final_decision && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      Final Decision
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      {dispute.final_decision}
                    </p>
                    {dispute.resolution_notes && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                        {dispute.resolution_notes}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Customer Info */}
            {dispute.customer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">
                        {dispute.customer.full_name || "Not provided"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">ID</p>
                      <p className="font-mono text-sm">{dispute.customer_id}</p>
                    </div>
                    {dispute.customer.phone && (
                      <div>
                        <p className="text-sm text-muted-foreground">Phone</p>
                        <p className="text-sm">{dispute.customer.phone}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Merchant Info */}
            {dispute.merchant && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Merchant
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Business Name</p>
                      <p className="font-medium">{dispute.merchant.business_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="text-sm">{dispute.merchant.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Info */}
            {dispute.order && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    Order Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Product</p>
                    <p className="font-medium">{dispute.order.product_name}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium">
                        ₹{dispute.order.amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Order Status</p>
                      <Badge variant="outline">{dispute.order.status}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Timeline */}
            <Collapsible open={isTimelineOpen} onOpenChange={setIsTimelineOpen}>
              <Card>
                <CardHeader>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-between p-0 h-auto"
                    >
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Dispute Timeline
                      </CardTitle>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isTimelineOpen ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent>
                    {dispute.updates && dispute.updates.length > 0 ? (
                      <div className="relative">
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                        <div className="space-y-6">
                          {dispute.updates.map((update) => (
                            <div key={update.id} className="relative pl-10">
                              <div className="absolute left-0 w-8 h-8 rounded-full bg-background border flex items-center justify-center">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-medium">{update.title}</p>
                                {update.description && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {update.description}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  {format(
                                    new Date(update.created_at),
                                    "MMM d, yyyy h:mm a"
                                  )}
                                  {update.created_by && ` • ${update.created_by}`}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No timeline events yet
                      </p>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Evidence & Attachments */}
            <Collapsible open={isEvidenceOpen} onOpenChange={setIsEvidenceOpen}>
              <Card>
                <CardHeader>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full flex items-center justify-between p-0 h-auto"
                    >
                      <CardTitle className="flex items-center gap-2">
                        <Image className="h-5 w-5" />
                        Evidence & Attachments
                      </CardTitle>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          isEvidenceOpen ? "rotate-180" : ""
                        }`}
                      />
                    </Button>
                  </CollapsibleTrigger>
                </CardHeader>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    {/* Customer Files */}
                    {dispute.files && dispute.files.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Customer Evidence</p>
                        <div className="space-y-2">
                          {dispute.files.map((file) => (
                            <a
                              key={file.id}
                              href={file.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted transition-colors"
                            >
                              <FileText className="h-4 w-4" />
                              <span className="text-sm truncate">{file.file_name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Merchant Evidence */}
                    {dispute.merchantEvidence && dispute.merchantEvidence.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Merchant Evidence</p>
                        <div className="space-y-2">
                          {dispute.merchantEvidence.map((evidence) => (
                            <a
                              key={evidence.id}
                              href={evidence.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted transition-colors"
                            >
                              <FileText className="h-4 w-4" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm truncate block">
                                  {evidence.file_name}
                                </span>
                                {evidence.description && (
                                  <span className="text-xs text-muted-foreground">
                                    {evidence.description}
                                  </span>
                                )}
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {(!dispute.files || dispute.files.length === 0) &&
                      (!dispute.merchantEvidence ||
                        dispute.merchantEvidence.length === 0) && (
                        <p className="text-muted-foreground text-center py-4">
                          No evidence uploaded
                        </p>
                      )}
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Admin Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Admin Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add internal note..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="resize-none"
                  />
                  <Button
                    size="icon"
                    onClick={handleAddNote}
                    disabled={!note.trim() || addAdminNote.isPending}
                  >
                    {addAdminNote.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Notes are internal and not visible to customers or merchants.
                </p>
              </CardContent>
            </Card>

            {/* Proceed to Decision */}
            {canMakeDecision && (
              <div className="md:hidden sticky bottom-4">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => navigate(`/admin/disputes/${dispute.id}/decision`)}
                >
                  <Gavel className="h-4 w-4 mr-2" />
                  Proceed to Final Decision
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
