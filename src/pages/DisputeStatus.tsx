import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDisputeDetails, useDisputes } from "@/hooks/useDisputes";
import { format } from "date-fns";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  FileText,
  MessageSquare,
  Upload,
  XCircle,
  Send,
  Loader2,
  Eye,
  ExternalLink
} from "lucide-react";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: "Submitted", color: "bg-blue-500", icon: <Clock className="h-3.5 w-3.5" /> },
  under_review: { label: "Under Review", color: "bg-amber-500", icon: <Eye className="h-3.5 w-3.5" /> },
  resolved: { label: "Resolved", color: "bg-green-500", icon: <CheckCircle className="h-3.5 w-3.5" /> },
  closed: { label: "Closed", color: "bg-muted-foreground", icon: <XCircle className="h-3.5 w-3.5" /> },
};

const STATUS_STEPS = ["open", "under_review", "resolved"];

export default function DisputeStatus() {
  const { disputeId } = useParams<{ disputeId: string }>();
  const navigate = useNavigate();
  const { 
    dispute, 
    updates, 
    comments, 
    files, 
    isLoadingDispute,
    addComment,
    isAddingComment
  } = useDisputeDetails(disputeId || "");
  const { withdrawDispute, isWithdrawing, closeDisputeAndConfirmDelivery, isClosingDispute } = useDisputes();

  const [newComment, setNewComment] = useState("");

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment(newComment.trim(), {
      onSuccess: () => setNewComment(""),
    });
  };

  const handleWithdraw = () => {
    if (!disputeId || !dispute?.order_id) return;
    withdrawDispute({ disputeId, orderId: dispute.order_id }, {
      onSuccess: () => navigate("/orders"),
    });
  };

  const handleCloseDisputeAndConfirm = () => {
    if (!disputeId || !dispute?.order_id) return;
    closeDisputeAndConfirmDelivery({ disputeId, orderId: dispute.order_id }, {
      onSuccess: () => navigate("/orders"),
    });
  };

  const getCurrentStep = () => {
    if (!dispute) return 0;
    const index = STATUS_STEPS.indexOf(dispute.status);
    return index === -1 ? 0 : index;
  };

  if (isLoadingDispute) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="space-y-4 p-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (!dispute) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center px-4">
            <Card className="w-full max-w-sm glass-card text-center">
              <CardContent className="pt-6 pb-6">
                <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-2">Dispute Not Found</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  The dispute doesn't exist.
                </p>
                <Button onClick={() => navigate("/orders")} className="w-full">
                  Back to Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (dispute.status === "resolved" || dispute.status === "closed") {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center px-4">
            <Card className="w-full max-w-sm glass-card text-center">
              <CardContent className="pt-6 pb-6">
                <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-2">
                  Dispute {dispute.status === "resolved" ? "Resolved" : "Closed"}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  View the final result.
                </p>
                <Button onClick={() => navigate(`/dispute/${disputeId}/result`)} className="w-full">
                  View Result
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[dispute.status] || STATUS_CONFIG.open;
  const currentStep = getCurrentStep();

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="min-h-[calc(100vh-120px)] flex flex-col">
          {/* Header - Compact */}
          <div className="mb-4 px-1">
            <Button
              variant="ghost"
              size="sm"
              className="mb-3 -ml-2 text-muted-foreground hover:text-foreground h-9"
              onClick={() => navigate("/orders")}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Orders
            </Button>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                  Dispute Status
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Track your dispute progress
                </p>
              </div>
              <Badge className={`${statusConfig.color} text-white gap-1 text-xs shrink-0`}>
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          <div className="flex-1 pb-6 space-y-4 px-1">
            {/* Status Progress - Compact */}
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between relative">
                  <div className="absolute top-3.5 left-6 right-6 h-0.5 bg-border" />
                  <div 
                    className="absolute top-3.5 left-6 h-0.5 bg-primary transition-all duration-500" 
                    style={{ width: `calc(${(currentStep / (STATUS_STEPS.length - 1)) * 100}% - 48px)` }}
                  />
                  {STATUS_STEPS.map((step, index) => {
                    const config = STATUS_CONFIG[step];
                    const isCompleted = index <= currentStep;
                    const isCurrent = index === currentStep;
                    return (
                      <div key={step} className="flex flex-col items-center relative z-10">
                        <div 
                          className={`
                            w-7 h-7 rounded-full flex items-center justify-center text-xs
                            ${isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                            ${isCurrent ? "ring-2 ring-primary/30" : ""}
                          `}
                        >
                          {config.icon}
                        </div>
                        <span className={`text-[10px] mt-1.5 ${isCompleted ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                          {config.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Dispute Summary - Compact */}
            <Card className="glass-card">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base">Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Issue Type</p>
                    <p className="font-medium text-sm">{dispute.reason}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Submitted</p>
                    <p className="font-medium text-sm">{format(new Date(dispute.created_at), "MMM d, yyyy")}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Description</p>
                  <p className="text-sm leading-relaxed">{dispute.description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Timeline - Compact */}
            <Card className="glass-card">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {updates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No updates yet
                  </p>
                ) : (
                  <div className="space-y-3">
                    {updates.slice(0, 5).map((update, index) => (
                      <div key={update.id} className="flex gap-2.5">
                        <div className="flex flex-col items-center">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${index === 0 ? "bg-primary" : "bg-muted-foreground"}`} />
                          {index < Math.min(updates.length - 1, 4) && (
                            <div className="w-0.5 flex-1 bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <p className="font-medium text-sm">{update.title}</p>
                          {update.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{update.description}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(update.created_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Messages - Compact */}
            <Card className="glass-card">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Messages
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <ScrollArea className="h-[150px]">
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No messages yet
                    </p>
                  ) : (
                    <div className="space-y-2 pr-3">
                      {comments.map((comment) => (
                        <div 
                          key={comment.id} 
                          className={`p-2.5 rounded-lg ${
                            comment.is_admin 
                              ? "bg-primary/10 border border-primary/20" 
                              : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-medium">
                              {comment.is_admin ? "Support" : "You"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(comment.created_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                          <p className="text-xs">{comment.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <Separator />
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Type a message..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    className="flex-1 text-sm min-h-[60px]"
                  />
                  <Button 
                    size="icon" 
                    className="h-[60px] w-10"
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || isAddingComment}
                  >
                    {isAddingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Evidence - Compact */}
            <Card className="glass-card">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Evidence ({files.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4">
                {files.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No files uploaded
                  </p>
                ) : (
                  files.slice(0, 3).map((file) => (
                    <div 
                      key={file.id} 
                      className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30 active:bg-muted/50"
                      onClick={() => window.open(file.file_url, "_blank")}
                    >
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs truncate flex-1">{file.file_name}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                    </div>
                  ))
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9"
                  onClick={() => navigate(`/dispute/${disputeId}/upload`)}
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Upload More
                </Button>
              </CardContent>
            </Card>

            {/* Actions - Stacked for Mobile */}
            <Card className="glass-card">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4">
                <Button
                  variant="outline"
                  className="w-full h-11 justify-start"
                  onClick={() => navigate(`/order/${dispute.order_id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Order Details
                </Button>
                
                {(dispute.status === "open" || dispute.status === "under_review") && (
                  <>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="w-full h-11 bg-green-600 hover:bg-green-700 justify-start">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Close & Confirm Delivery
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Close Dispute & Confirm?</AlertDialogTitle>
                          <AlertDialogDescription className="text-sm">
                            This will close the dispute and release payment to the merchant.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleCloseDisputeAndConfirm}
                            disabled={isClosingDispute}
                            className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                          >
                            {isClosingDispute ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Processing...
                              </>
                            ) : (
                              "Confirm & Release"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="w-full h-11 text-destructive border-destructive/30 justify-start">
                          <XCircle className="h-4 w-4 mr-2" />
                          Withdraw Dispute
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Withdraw Dispute?</AlertDialogTitle>
                          <AlertDialogDescription className="text-sm">
                            You will not be able to reopen this dispute after withdrawal.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                          <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleWithdraw}
                            disabled={isWithdrawing}
                            className="w-full sm:w-auto bg-destructive hover:bg-destructive/90"
                          >
                            {isWithdrawing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Withdrawing...
                              </>
                            ) : (
                              "Withdraw"
                            )}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
