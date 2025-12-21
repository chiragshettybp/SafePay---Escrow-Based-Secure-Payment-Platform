import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { useMerchantDisputeDetails, ISSUE_TYPES } from "@/hooks/useMerchantDisputes";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ArrowLeft,
  Send,
  Upload,
  Clock,
  AlertTriangle,
  MessageSquare,
  User,
  Shield,
  FileText,
  ChevronDown,
  ExternalLink,
  Package,
} from "lucide-react";

export default function MerchantDisputeResponse() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const navigate = useNavigate();
  const [responseText, setResponseText] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(true);

  const {
    dispute,
    isLoadingDispute,
    updates,
    isLoadingUpdates,
    responses,
    customerFiles,
    merchantEvidence,
    submitResponse,
    isSubmittingResponse,
  } = useMerchantDisputeDetails(disputeId || "");

  const getIssueTypeLabel = (value: string | null) => {
    return ISSUE_TYPES.find((t) => t.value === value)?.label || value || "Unknown";
  };

  const handleSubmit = () => {
    if (!responseText.trim()) return;
    submitResponse(responseText.trim());
    setResponseText("");
  };

  // Loading skeleton
  if (isLoadingDispute) {
    return (
      <MerchantLayout>
        <Seo title="Respond to Dispute | Merchant Portal" canonicalPath={`/merchant/dispute/${disputeId}/respond`} />
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </MerchantLayout>
    );
  }

  // Not found
  if (!dispute) {
    return (
      <MerchantLayout>
        <Seo title="Dispute Not Found | Merchant Portal" canonicalPath={`/merchant/dispute/${disputeId}/respond`} />
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

  const canRespond = dispute.status === "open" || dispute.status === "under_review";

  return (
    <MerchantLayout>
      <Seo
        title="Respond to Dispute | Merchant Portal"
        description="Respond to customer dispute"
        canonicalPath={`/merchant/dispute/${disputeId}/respond`}
      />
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/merchant/disputes")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">Respond to Dispute</h1>
            <p className="text-sm text-muted-foreground font-mono">#{dispute.id.slice(0, 8)}</p>
          </div>
          {dispute.status === "open" && !dispute.merchant_responded && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Response Required
            </Badge>
          )}
        </div>

        {/* Dispute Summary - Collapsible on Mobile */}
        <Collapsible open={summaryOpen} onOpenChange={setSummaryOpen} className="md:hidden">
          <Card className="bg-card border-border">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Dispute Summary</CardTitle>
                  <ChevronDown className={`h-5 w-5 transition-transform ${summaryOpen ? "rotate-180" : ""}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4 pt-0">
                <DisputeSummaryContent dispute={dispute} getIssueTypeLabel={getIssueTypeLabel} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Desktop Dispute Summary */}
        <Card className="hidden md:block bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Dispute Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DisputeSummaryContent dispute={dispute} getIssueTypeLabel={getIssueTypeLabel} />
          </CardContent>
        </Card>

        {/* Customer's Complaint */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer's Complaint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-medium text-sm text-muted-foreground">Reason</p>
              <p className="text-foreground mt-1">{dispute.reason}</p>
            </div>
            <div>
              <p className="font-medium text-sm text-muted-foreground">Description</p>
              <p className="text-foreground mt-1 whitespace-pre-wrap">{dispute.description}</p>
            </div>

            {/* Customer Evidence */}
            {customerFiles.length > 0 && (
              <div>
                <p className="font-medium text-sm text-muted-foreground mb-2">Customer Evidence</p>
                <div className="grid grid-cols-2 gap-2">
                  {customerFiles.map((file) => (
                    <a
                      key={file.id}
                      href={file.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm truncate flex-1">{file.file_name}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Dispute Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64 pr-4">
              {isLoadingUpdates ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : updates.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No timeline events yet</p>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
                  <div className="space-y-4">
                    {updates.map((update, index) => (
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
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs capitalize">
                              {update.created_by || "system"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Merchant Responses */}
        {responses.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Your Responses
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {responses.map((response) => (
                <div key={response.id} className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <p className="text-foreground whitespace-pre-wrap">{response.response_text}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {format(new Date(response.created_at), "MMM dd, yyyy 'at' h:mm a")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Merchant Evidence */}
        {merchantEvidence.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Your Evidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      <p className="text-xs text-muted-foreground">{evidence.evidence_type}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </a>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Response Form */}
        {canRespond && (
          <Card className="bg-card border-border sticky bottom-4 md:relative md:bottom-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Submit Response
              </CardTitle>
              <CardDescription>
                Explain your side of the situation. Be clear and professional.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Type your response here..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={!responseText.trim() || isSubmittingResponse}
                  className="flex-1"
                >
                  {isSubmittingResponse ? (
                    <>Submitting...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Response
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate(`/merchant/dispute/${disputeId}/upload`)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Evidence
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/merchant/disputes")}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resolved State */}
        {!canRespond && (
          <Card className="bg-muted/20 border-border">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground mb-4">
                This dispute has been {dispute.status}. No further responses can be submitted.
              </p>
              <Button variant="outline" onClick={() => navigate(`/merchant/dispute/${disputeId}/result`)}>
                View Decision
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MerchantLayout>
  );
}

// Dispute Summary Content Component
function DisputeSummaryContent({
  dispute,
  getIssueTypeLabel,
}: {
  dispute: any;
  getIssueTypeLabel: (value: string | null) => string;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Order ID</p>
          <p className="font-mono text-sm">{dispute.order_id.slice(0, 8)}...</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Issue Type</p>
          <p className="text-sm font-medium">{getIssueTypeLabel(dispute.issue_type)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Created</p>
          <p className="text-sm">{format(new Date(dispute.created_at), "MMM dd, yyyy")}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <Badge variant={dispute.status === "open" ? "destructive" : "default"} className="mt-1">
            {dispute.status === "open" ? "Pending Response" : dispute.status}
          </Badge>
        </div>
      </div>

      {dispute.order && (
        <>
          <Separator />
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Package className="h-8 w-8 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{dispute.order.product_name}</p>
              <p className="text-lg font-bold text-foreground">
                ₹{Number(dispute.order.amount).toLocaleString()}
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
