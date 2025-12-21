import { useParams, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { useMerchantDisputeDetails, ISSUE_TYPES, EVIDENCE_TYPES } from "@/hooks/useMerchantDisputes";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  ExternalLink,
  Package,
  Shield,
  User,
  Gavel,
  DollarSign,
} from "lucide-react";

export default function MerchantDisputeResult() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const navigate = useNavigate();

  const {
    dispute,
    isLoadingDispute,
    updates,
    customerFiles,
    merchantEvidence,
    responses,
  } = useMerchantDisputeDetails(disputeId || "");

  const getIssueTypeLabel = (value: string | null) => {
    return ISSUE_TYPES.find((t) => t.value === value)?.label || value || "Unknown";
  };

  // Determine outcome
  const getResultConfig = () => {
    if (!dispute) return null;

    const decision = dispute.final_decision?.toLowerCase() || "";
    const status = dispute.status;

    if (decision.includes("merchant") || decision.includes("favor of seller")) {
      return {
        icon: CheckCircle,
        color: "text-green-500",
        bgColor: "bg-green-500/10",
        borderColor: "border-green-500/30",
        title: "Decision: Merchant Wins",
        description: "The dispute was resolved in your favor. No refund will be issued.",
      };
    } else if (decision.includes("partial")) {
      return {
        icon: AlertTriangle,
        color: "text-warning",
        bgColor: "bg-warning/10",
        borderColor: "border-warning/30",
        title: "Decision: Partial Refund",
        description: "A partial refund has been issued to the customer.",
      };
    } else if (decision.includes("customer") || decision.includes("refund")) {
      return {
        icon: XCircle,
        color: "text-destructive",
        bgColor: "bg-destructive/10",
        borderColor: "border-destructive/30",
        title: "Decision: Customer Wins",
        description: "The dispute was resolved in the customer's favor. A refund has been issued.",
      };
    } else if (status === "closed") {
      return {
        icon: XCircle,
        color: "text-muted-foreground",
        bgColor: "bg-muted/30",
        borderColor: "border-border",
        title: "Dispute Closed",
        description: "This dispute has been closed.",
      };
    } else {
      return {
        icon: Clock,
        color: "text-primary",
        bgColor: "bg-primary/10",
        borderColor: "border-primary/30",
        title: "Dispute Resolved",
        description: dispute.resolution_notes || "This dispute has been resolved.",
      };
    }
  };

  // Loading skeleton
  if (isLoadingDispute) {
    return (
      <MerchantLayout>
        <Seo title="Dispute Result | Merchant Portal" canonicalPath={`/merchant/dispute/${disputeId}/result`} />
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </MerchantLayout>
    );
  }

  // Not found
  if (!dispute) {
    return (
      <MerchantLayout>
        <Seo title="Dispute Not Found | Merchant Portal" canonicalPath={`/merchant/dispute/${disputeId}/result`} />
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Dispute Not Found</h2>
          <p className="text-muted-foreground mb-6">This dispute doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate("/merchant/disputes")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Disputes
          </Button>
        </div>
      </MerchantLayout>
    );
  }

  // Still in progress
  if (dispute.status !== "resolved" && dispute.status !== "closed") {
    return (
      <MerchantLayout>
        <Seo title="Dispute In Progress | Merchant Portal" canonicalPath={`/merchant/dispute/${disputeId}/result`} />
        <div className="space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/merchant/disputes")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-bold text-foreground">Dispute Status</h1>
          </div>
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Clock className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">Dispute In Progress</h2>
              <p className="text-muted-foreground mb-6">
                This dispute is still being reviewed. A decision has not been made yet.
              </p>
              <Button onClick={() => navigate(`/merchant/dispute/${disputeId}/respond`)}>
                View Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </MerchantLayout>
    );
  }

  const resultConfig = getResultConfig();
  if (!resultConfig) return null;

  const ResultIcon = resultConfig.icon;

  return (
    <MerchantLayout>
      <Seo
        title="Dispute Result | Merchant Portal"
        description="View dispute resolution"
        canonicalPath={`/merchant/dispute/${disputeId}/result`}
      />
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/merchant/disputes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Dispute Decision</h1>
            <p className="text-sm text-muted-foreground font-mono">#{dispute.id.slice(0, 8)}</p>
          </div>
        </div>

        {/* Result Banner */}
        <Card className={`${resultConfig.bgColor} ${resultConfig.borderColor} border-2`}>
          <CardContent className="py-8 text-center">
            <ResultIcon className={`h-16 w-16 ${resultConfig.color} mx-auto mb-4`} />
            <h2 className="text-2xl font-bold text-foreground mb-2">{resultConfig.title}</h2>
            <p className="text-muted-foreground max-w-md mx-auto">{resultConfig.description}</p>
            {dispute.refund_amount && dispute.refund_amount > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-background/50 rounded-lg">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <span className="text-lg font-bold text-foreground">
                  ₹{Number(dispute.refund_amount).toLocaleString()}
                </span>
                <span className="text-muted-foreground">refunded</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Decision Details */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gavel className="h-4 w-4" />
              Decision Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Issue Type</p>
                <p className="font-medium">{getIssueTypeLabel(dispute.issue_type)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolution Date</p>
                <p className="font-medium">{format(new Date(dispute.updated_at), "MMM dd, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Submitted On</p>
                <p className="font-medium">{format(new Date(dispute.created_at), "MMM dd, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="secondary" className="mt-1 capitalize">{dispute.status}</Badge>
              </div>
            </div>

            {dispute.resolution_notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Resolution Notes</p>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-foreground whitespace-pre-wrap">{dispute.resolution_notes}</p>
                  </div>
                </div>
              </>
            )}

            {dispute.final_decision && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Final Decision</p>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-foreground">{dispute.final_decision}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Order Info */}
        {dispute.order && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <Package className="h-10 w-10 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{dispute.order.product_name}</p>
                  <p className="text-sm text-muted-foreground font-mono">#{dispute.order_id.slice(0, 8)}</p>
                </div>
                <p className="text-xl font-bold text-foreground">
                  ₹{Number(dispute.order.amount).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Evidence Tabs */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Evidence Review</CardTitle>
            <CardDescription>View all submitted evidence from both parties</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="merchant" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="merchant" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Your Evidence
                </TabsTrigger>
                <TabsTrigger value="customer" className="gap-2">
                  <User className="h-4 w-4" />
                  Customer Evidence
                </TabsTrigger>
              </TabsList>
              <TabsContent value="merchant" className="mt-4">
                {merchantEvidence.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No evidence was submitted</p>
                ) : (
                  <div className="space-y-2">
                    {merchantEvidence.map((evidence) => (
                      <a
                        key={evidence.id}
                        href={evidence.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{evidence.file_name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="text-xs">
                              {EVIDENCE_TYPES.find((t) => t.value === evidence.evidence_type)?.label ||
                                evidence.evidence_type}
                            </Badge>
                            <span>{format(new Date(evidence.created_at), "MMM dd")}</span>
                          </div>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Responses */}
                {responses.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm font-medium mb-3">Your Responses</p>
                    {responses.map((response) => (
                      <div key={response.id} className="p-3 bg-primary/5 border border-primary/20 rounded-lg mb-2">
                        <p className="text-sm text-foreground whitespace-pre-wrap">{response.response_text}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(response.created_at), "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="customer" className="mt-4">
                {customerFiles.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No evidence was submitted</p>
                ) : (
                  <div className="space-y-2">
                    {customerFiles.map((file) => (
                      <a
                        key={file.id}
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.file_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(file.created_at), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Customer Complaint */}
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm font-medium mb-3">Customer's Complaint</p>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm font-medium text-foreground">{dispute.reason}</p>
                    <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                      {dispute.description}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Complete Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 pr-4">
              {updates.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No timeline events</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {updates.map((update) => (
                      <div key={update.id} className="relative pl-10">
                        <div
                          className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${
                            update.created_by === "merchant"
                              ? "bg-primary border-primary"
                              : update.created_by === "admin"
                              ? "bg-warning border-warning"
                              : "bg-muted border-muted-foreground"
                          }`}
                        />
                        <div className="bg-muted/20 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-sm text-foreground">{update.title}</p>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {update.description && (
                            <p className="text-sm text-muted-foreground">{update.description}</p>
                          )}
                          <Badge variant="outline" className="text-xs mt-2 capitalize">
                            {update.created_by || "system"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sticky bottom-4 md:relative md:bottom-0">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/merchant/order/${dispute.order_id}`)}
          >
            <Package className="h-4 w-4 mr-2" />
            View Order
          </Button>
          <Button
            className="flex-1"
            onClick={() => navigate("/merchant/disputes")}
          >
            Back to Disputes
          </Button>
        </div>
      </div>
    </MerchantLayout>
  );
}
