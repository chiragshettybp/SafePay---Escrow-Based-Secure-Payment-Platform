import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useMerchantSupport, MERCHANT_TICKET_CATEGORIES } from "@/hooks/useMerchantSupport";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Send, Paperclip, X, FileText, Image, Upload } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const MerchantSupportTicketDetails = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { user } = useMerchantAuth();
  const { fetchTicket, fetchMessages, sendMessage, closeTicket } = useMerchantSupport();

  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ["merchant-support-ticket", ticketId],
    queryFn: () => fetchTicket(ticketId!),
    enabled: !!ticketId,
  });

  const { data: messages, isLoading: messagesLoading, refetch: refetchMessages } = useQuery({
    queryKey: ["merchant-support-messages", ticketId],
    queryFn: () => fetchMessages(ticketId!),
    enabled: !!ticketId,
  });

  // Realtime messages subscription
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          refetchMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, refetchMessages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-blue-500";
      case "in_progress":
        return "bg-amber-500";
      case "awaiting_response":
        return "bg-purple-500";
      case "resolved":
        return "bg-green-500";
      case "closed":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted";
    }
  };

  const getCategoryLabel = (value: string) => {
    return MERCHANT_TICKET_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (attachments.length + newFiles.length <= 3) {
        setAttachments((prev) => [...prev, ...newFiles]);
      }
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!ticketId) return;

    try {
      await sendMessage.mutateAsync({
        ticketId,
        message: newMessage,
        attachments: attachments.length > 0 ? attachments : undefined,
      });
      setNewMessage("");
      setAttachments([]);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleCloseTicket = async () => {
    if (!ticketId) return;
    try {
      await closeTicket.mutateAsync(ticketId);
      navigate("/merchant/support/tickets");
    } catch (error) {
      console.error("Failed to close ticket:", error);
    }
  };

  const isTicketClosed = ticket?.status === "closed" || ticket?.status === "resolved";

  if (ticketLoading) {
    return (
      <MerchantLayout>
        <div className="container max-w-3xl px-4 sm:px-6 py-4 sm:py-6">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-32 mb-4" />
          <Skeleton className="h-64" />
        </div>
      </MerchantLayout>
    );
  }

  if (!ticket) {
    return (
      <MerchantLayout>
        <div className="container max-w-3xl px-4 sm:px-6 py-4 sm:py-6">
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
      <div className="container max-w-3xl px-4 sm:px-6 py-4 sm:py-6">
        <Button
          variant="ghost"
          className="mb-4 -ml-2"
          onClick={() => navigate("/merchant/support/tickets")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tickets
        </Button>

        {/* Ticket Summary */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-muted-foreground font-mono">
                    {ticket.ticket_number}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {getCategoryLabel(ticket.category)}
                  </Badge>
                </div>
                <CardTitle className="text-lg sm:text-xl">{ticket.subject}</CardTitle>
              </div>
              <Badge className={`${getStatusColor(ticket.status)} text-white flex-shrink-0`}>
                {ticket.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground">
              Created {format(new Date(ticket.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </p>
            {ticket.related_order_id && (
              <p className="text-sm text-muted-foreground mt-1">
                Related Order: {ticket.related_order_id}
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/merchant/support/upload/${ticketId}`)}
                disabled={isTicketClosed}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Evidence
              </Button>
              {!isTicketClosed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCloseTicket}
                  disabled={closeTicket.isPending}
                >
                  Close Ticket
                </Button>
              )}
              {isTicketClosed && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/merchant/support/result/${ticketId}`)}
                >
                  View Resolution
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Messages Thread */}
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-base">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {messagesLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : messages && messages.length > 0 ? (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.is_staff ? "" : "flex-row-reverse"}`}
                  >
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={msg.is_staff ? "bg-primary text-primary-foreground" : "bg-muted"}>
                        {msg.is_staff ? "S" : "M"}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`flex-1 max-w-[80%] ${
                        msg.is_staff ? "" : "flex flex-col items-end"
                      }`}
                    >
                      <div
                        className={`rounded-lg p-3 ${
                          msg.is_staff
                            ? "bg-muted"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(msg.created_at), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No messages yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Reply Section */}
        {!isTicketClosed ? (
          <Card>
            <CardContent className="p-4">
              <Textarea
                placeholder="Type your reply..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
                className="mb-3"
              />
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
                    >
                      {file.type.startsWith("image/") ? (
                        <Image className="h-3 w-3" />
                      ) : (
                        <FileText className="h-3 w-3" />
                      )}
                      <span className="truncate max-w-[100px]">{file.name}</span>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <input
                    type="file"
                    id="message-attachment"
                    className="hidden"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => document.getElementById("message-attachment")?.click()}
                    disabled={attachments.length >= 3}
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach
                  </Button>
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={(!newMessage.trim() && attachments.length === 0) || sendMessage.isPending}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-muted-foreground">
                This ticket is {ticket.status}. You cannot send new messages.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MerchantLayout>
  );
};

export default MerchantSupportTicketDetails;
