import { useOutletContext } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SupportTicket } from "@/hooks/useAdminSupport";
import { format } from "date-fns";
import { FileText, Tag, Calendar, Clock } from "lucide-react";

export default function AdminSupportTicketDetails() {
  const { ticket } = useOutletContext<{ ticket: SupportTicket }>();

  if (!ticket) return null;

  return (
    <div className="space-y-6">
      {/* Issue Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Issue Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-foreground whitespace-pre-wrap">{ticket.description}</p>
        </CardContent>
      </Card>

      {/* Ticket Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Ticket Metadata
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Ticket Number</p>
              <p className="font-mono">{ticket.ticket_number}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="capitalize">{ticket.category}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Priority</p>
              <Badge
                className={
                  ticket.priority === "critical"
                    ? "bg-red-500/10 text-red-600 border-red-500/30"
                    : ticket.priority === "high"
                    ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                    : ticket.priority === "medium"
                    ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                    : "bg-muted"
                }
              >
                {ticket.priority}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="capitalize">{ticket.status.replace("_", " ")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 mt-2 rounded-full bg-primary" />
              <div>
                <p className="font-medium">Ticket Created</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(ticket.created_at), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
            
            {ticket.updated_at !== ticket.created_at && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-muted-foreground" />
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(ticket.updated_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            )}
            
            {ticket.resolved_at && (
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                <div>
                  <p className="font-medium">Resolved</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(ticket.resolved_at), "MMMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resolution Note */}
      {(ticket as any).resolution_note && (
        <Card>
          <CardHeader>
            <CardTitle>Resolution Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{(ticket as any).resolution_note}</p>
          </CardContent>
        </Card>
      )}

      {/* Escalation Info */}
      {(ticket as any).escalated && (
        <Card className="border-red-500/30">
          <CardHeader>
            <CardTitle className="text-red-500">Escalation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground">{(ticket as any).escalation_reason || "No reason provided"}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
