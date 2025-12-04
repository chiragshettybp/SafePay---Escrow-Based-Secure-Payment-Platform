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
  open: { label: "Submitted", color: "bg-blue-500", icon: <Clock className="h-4 w-4" /> },
  under_review: { label: "Under Review", color: "bg-amber-500", icon: <Eye className="h-4 w-4" /> },
  resolved: { label: "Resolved", color: "bg-green-500", icon: <CheckCircle className="h-4 w-4" /> },
  closed: { label: "Closed", color: "bg-muted-foreground", icon: <XCircle className="h-4 w-4" /> },
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
  const { withdrawDispute, isWithdrawing } = useDisputes();

  const [newComment, setNewComment] = useState("");

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    addComment(newComment.trim(), {
      onSuccess: () => setNewComment(""),
    });
  };

  const handleWithdraw = () => {
    if (!disputeId) return;
    withdrawDispute(disputeId, {
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
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2 space-y-6">
                <Card className="glass-card">
                  <CardContent className="py-6">
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              </div>
              <div>
                <Skeleton className="h-64 w-full" />
              </div>
            </div>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (!dispute) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center">
            <Card className="w-full max-w-md glass-card text-center">
              <CardContent className="pt-6">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Dispute Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The dispute you're looking for doesn't exist.
                </p>
                <Button onClick={() => navigate("/orders")}>
                  Back to Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  // Redirect to result page if resolved
  if (dispute.status === "resolved" || dispute.status === "closed") {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center">
            <Card className="w-full max-w-md glass-card text-center">
              <CardContent className="pt-6">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Dispute {dispute.status === "resolved" ? "Resolved" : "Closed"}</h2>
                <p className="text-muted-foreground mb-6">
                  This dispute has been {dispute.status}. View the final result.
                </p>
                <Button onClick={() => navigate(`/dispute/${disputeId}/result`)}>
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
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/orders")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Dispute Status
                </h1>
                <p className="text-muted-foreground mt-1">
                  Track the progress of your dispute
                </p>
              </div>
              <Badge className={`${statusConfig.color} text-white gap-1`}>
                {statusConfig.icon}
                {statusConfig.label}
              </Badge>
            </div>
          </div>

          <div className="flex-1 pb-24 sm:pb-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Status Progress */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between relative">
                      <div className="absolute top-4 left-0 right-0 h-0.5 bg-border" />
                      <div 
                        className="absolute top-4 left-0 h-0.5 bg-primary transition-all duration-500" 
                        style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
                      />
                      {STATUS_STEPS.map((step, index) => {
                        const config = STATUS_CONFIG[step];
                        const isCompleted = index <= currentStep;
                        const isCurrent = index === currentStep;
                        return (
                          <div key={step} className="flex flex-col items-center relative z-10">
                            <div 
                              className={`
                                w-8 h-8 rounded-full flex items-center justify-center
                                ${isCompleted ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}
                                ${isCurrent ? "ring-4 ring-primary/20" : ""}
                              `}
                            >
                              {config.icon}
                            </div>
                            <span className={`text-xs mt-2 ${isCompleted ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                              {config.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Dispute Summary */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Dispute Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Issue Type</p>
                        <p className="font-medium">{dispute.reason}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Submitted</p>
                        <p className="font-medium">{format(new Date(dispute.created_at), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <Separator />
                    <div>
                      <p className="text-muted-foreground text-sm mb-2">Description</p>
                      <p className="text-sm">{dispute.description}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {updates.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No updates yet
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {updates.map((update, index) => (
                          <div key={update.id} className="flex gap-3">
                            <div className="flex flex-col items-center">
                              <div className={`w-3 h-3 rounded-full ${index === updates.length - 1 ? "bg-primary" : "bg-muted-foreground"}`} />
                              {index < updates.length - 1 && (
                                <div className="w-0.5 flex-1 bg-border mt-1" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="font-medium text-sm">{update.title}</p>
                              {update.description && (
                                <p className="text-sm text-muted-foreground mt-1">{update.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(update.created_at), "MMM d, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Comments */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="h-5 w-5" />
                      Messages
                    </CardTitle>
                    <CardDescription>
                      Communicate with the support team
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ScrollArea className="h-[200px] pr-4">
                      {comments.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No messages yet. Start the conversation below.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {comments.map((comment) => (
                            <div 
                              key={comment.id} 
                              className={`p-3 rounded-lg ${
                                comment.is_admin 
                                  ? "bg-primary/10 border border-primary/20" 
                                  : "bg-muted/50"
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium">
                                  {comment.is_admin ? "Support Team" : "You"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(comment.created_at), "MMM d, h:mm a")}
                                </span>
                              </div>
                              <p className="text-sm">{comment.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                    <Separator />
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type your message..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        rows={2}
                        className="flex-1"
                      />
                      <Button 
                        size="icon" 
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
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Uploaded Evidence */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Evidence
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {files.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No files uploaded
                      </p>
                    ) : (
                      files.map((file) => (
                        <div 
                          key={file.id} 
                          className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                          onClick={() => window.open(file.file_url, "_blank")}
                        >
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm truncate flex-1">{file.file_name}</span>
                          <ExternalLink className="h-3 w-3 text-muted-foreground" />
                        </div>
                      ))
                    )}
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/dispute/${disputeId}/upload`)}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload More
                    </Button>
                  </CardContent>
                </Card>

                {/* Actions */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => navigate(`/order/${dispute.order_id}`)}
                    >
                      View Order Details
                    </Button>
                    
                    {dispute.status === "open" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full">
                            Withdraw Dispute
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Withdraw Dispute?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to withdraw this dispute? This action cannot be undone.
                              The funds will remain in escrow until you confirm delivery or take other action.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleWithdraw}
                              disabled={isWithdrawing}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
