import { useState } from "react";
import { useParams, useOutletContext, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { useAdminTicketDetails, SupportTicket } from "@/hooks/useAdminSupport";
import { 
  Settings, 
  RefreshCw, 
  ArrowUpRight, 
  XCircle, 
  Loader2,
  AlertTriangle
} from "lucide-react";

export default function AdminSupportTicketActions() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { ticket } = useOutletContext<{ ticket: SupportTicket }>();
  const {
    updateStatus,
    isUpdatingStatus,
    updatePriority,
    isUpdatingPriority,
    escalate,
    isEscalating,
    closeTicket,
    isClosingTicket,
  } = useAdminTicketDetails(ticketId || "");

  const [statusReason, setStatusReason] = useState("");
  const [priorityReason, setPriorityReason] = useState("");
  const [escalationReason, setEscalationReason] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(ticket?.status || "");
  const [selectedPriority, setSelectedPriority] = useState(ticket?.priority || "");

  const handleStatusChange = () => {
    if (!selectedStatus || selectedStatus === ticket?.status) return;
    updateStatus({ status: selectedStatus, reason: statusReason });
    setStatusReason("");
  };

  const handlePriorityChange = () => {
    if (!selectedPriority || selectedPriority === ticket?.priority) return;
    updatePriority({ priority: selectedPriority, reason: priorityReason });
    setPriorityReason("");
  };

  const handleEscalate = () => {
    if (!escalationReason.trim()) return;
    escalate(escalationReason);
    setEscalationReason("");
  };

  const handleClose = () => {
    if (!resolutionNote.trim()) return;
    closeTicket(resolutionNote);
    setTimeout(() => navigate("/admin/support"), 1000);
  };

  const isTicketClosed = ticket?.status === "closed";

  return (
    <div className="space-y-6">
      {isTicketClosed && (
        <Card className="border-muted">
          <CardContent className="py-6 text-center">
            <XCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">This ticket is closed</p>
            <p className="text-muted-foreground">No further actions can be taken</p>
          </CardContent>
        </Card>
      )}

      {!isTicketClosed && (
        <>
          {/* Change Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Change Status
              </CardTitle>
              <CardDescription>Update the ticket status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting">Waiting for Customer</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  placeholder="Explain why you're changing the status..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  rows={2}
                />
              </div>
              <Button
                onClick={handleStatusChange}
                disabled={!selectedStatus || selectedStatus === ticket?.status || isUpdatingStatus}
              >
                {isUpdatingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Status
              </Button>
            </CardContent>
          </Card>

          {/* Change Priority */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="h-5 w-5" />
                Change Priority
              </CardTitle>
              <CardDescription>Adjust ticket priority level</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>New Priority</Label>
                <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Reason (optional)</Label>
                <Textarea
                  placeholder="Explain why you're changing the priority..."
                  value={priorityReason}
                  onChange={(e) => setPriorityReason(e.target.value)}
                  rows={2}
                />
              </div>
              <Button
                onClick={handlePriorityChange}
                disabled={!selectedPriority || selectedPriority === ticket?.priority || isUpdatingPriority}
              >
                {isUpdatingPriority && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Priority
              </Button>
            </CardContent>
          </Card>

          {/* Escalate */}
          {!(ticket as any)?.escalated && (
            <Card className="border-amber-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-500">
                  <AlertTriangle className="h-5 w-5" />
                  Escalate Ticket
                </CardTitle>
                <CardDescription>
                  Escalate this ticket to priority critical for immediate attention
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Escalation Reason *</Label>
                  <Textarea
                    placeholder="Explain why this ticket needs escalation..."
                    value={escalationReason}
                    onChange={(e) => setEscalationReason(e.target.value)}
                    rows={3}
                  />
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      disabled={!escalationReason.trim() || isEscalating}
                    >
                      {isEscalating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Escalate Ticket
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirm Escalation</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will set the ticket priority to critical and mark it as escalated.
                        This action will be logged in the audit trail.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleEscalate}>Escalate</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}

          {/* Close Ticket */}
          <Card className="border-destructive/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Close Ticket
              </CardTitle>
              <CardDescription>
                Close this ticket with a resolution note
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Resolution Note *</Label>
                <Textarea
                  placeholder="Describe how the issue was resolved..."
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  rows={3}
                />
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={!resolutionNote.trim() || isClosingTicket}
                  >
                    {isClosingTicket && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Close Ticket
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Close Ticket</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will close the ticket and notify the customer. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClose}>Close Ticket</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
