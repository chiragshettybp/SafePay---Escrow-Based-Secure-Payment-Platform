import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMerchantSupport, MERCHANT_TICKET_CATEGORIES } from "@/hooks/useMerchantSupport";
import { ArrowLeft, CheckCircle, XCircle, Clock, Plus, Ticket } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const MerchantSupportResult = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { fetchTicket, fetchMessages } = useMerchantSupport();

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ["merchant-support-ticket", ticketId],
    queryFn: () => fetchTicket(ticketId!),
    enabled: !!ticketId,
  });

  const { data: messages } = useQuery({
    queryKey: ["merchant-support-messages", ticketId],
    queryFn: () => fetchMessages(ticketId!),
    enabled: !!ticketId,
  });

  const getCategoryLabel = (value: string) => {
    return MERCHANT_TICKET_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  const isResolved = ticket?.status === "resolved";
  const isClosed = ticket?.status === "closed";

  // Build timeline from messages
  const timeline = messages?.map((msg) => ({
    id: msg.id,
    title: msg.is_staff ? "Support Response" : "Your Message",
    description: msg.message.substring(0, 100) + (msg.message.length > 100 ? "..." : ""),
    timestamp: msg.created_at,
    isStaff: msg.is_staff,
  })) || [];

  if (ticketLoading) {
    return (
      <MerchantLayout>
        <div className="container max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-48 mb-4" />
          <Skeleton className="h-64" />
        </div>
      </MerchantLayout>
    );
  }

  if (!ticket) {
    return (
      <MerchantLayout>
        <div className="container max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-lg font-medium mb-4">Ticket not found</p>
              <Button onClick={() => navigate("/merchant/support/tickets")}>
                Back to Tickets
              </Button>
            </CardContent>
          </Card>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="container max-w-2xl px-4 sm:px-6 py-4 sm:py-6">
        <Button
          variant="ghost"
          className="mb-4 -ml-2"
          onClick={() => navigate("/merchant/support/tickets")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>

        {/* Resolution Banner */}
        <Card className={`mb-6 ${isResolved ? "border-green-500/50 bg-green-500/5" : "border-muted"}`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              {isResolved ? (
                <div className="p-3 rounded-full bg-green-500/10">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              ) : isClosed ? (
                <div className="p-3 rounded-full bg-muted">
                  <XCircle className="h-8 w-8 text-muted-foreground" />
                </div>
              ) : (
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Clock className="h-8 w-8 text-amber-500" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-bold">
                  {isResolved
                    ? "Ticket Resolved"
                    : isClosed
                    ? "Ticket Closed"
                    : "Ticket In Progress"}
                </h2>
                <p className="text-muted-foreground">
                  {isResolved
                    ? "Your support request has been successfully resolved."
                    : isClosed
                    ? "This ticket has been closed."
                    : "We're still working on your request."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resolution Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ticket Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Number</p>
                <p className="font-mono">{ticket.ticket_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <Badge variant="outline">{getCategoryLabel(ticket.category)}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p>{format(new Date(ticket.created_at), "MMM d, yyyy")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolved</p>
                <p>
                  {ticket.resolved_at
                    ? format(new Date(ticket.resolved_at), "MMM d, yyyy")
                    : "—"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Subject</p>
              <p className="font-medium">{ticket.subject}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Original Description</p>
              <p className="text-sm">{ticket.description}</p>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Ticket Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {timeline.length > 0 ? (
                <div className="space-y-4">
                  {timeline.map((item, index) => (
                    <div key={item.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-3 w-3 rounded-full ${
                            item.isStaff ? "bg-primary" : "bg-muted-foreground"
                          }`}
                        />
                        {index < timeline.length - 1 && (
                          <div className="w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground mb-1">
                          {format(new Date(item.timestamp), "MMM d, yyyy 'at' h:mm a")}
                        </p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No activity recorded</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/merchant/support/tickets")}
          >
            <Ticket className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>
          <Button className="flex-1" onClick={() => navigate("/merchant/support/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Create New Ticket
          </Button>
        </div>
      </div>
    </MerchantLayout>
  );
};

export default MerchantSupportResult;
