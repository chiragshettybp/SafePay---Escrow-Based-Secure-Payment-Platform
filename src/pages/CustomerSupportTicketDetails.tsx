import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Loader2, Send, Paperclip, X, User, Headphones } from "lucide-react";
import { useCustomerSupport, SupportMessage } from "@/hooks/useCustomerSupport";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

const CustomerSupportTicketDetails = () => {
  const navigate = useNavigate();
  const { ticketId } = useParams<{ ticketId: string }>();
  const { user } = useSupabaseAuth();
  const { fetchTicket, fetchMessages, sendMessage } = useCustomerSupport();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ["support-ticket", ticketId],
    queryFn: () => fetchTicket(ticketId!),
    enabled: !!ticketId,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["support-messages", ticketId],
    queryFn: () => fetchMessages(ticketId!),
    enabled: !!ticketId,
  });

  // Realtime subscription for messages
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "support_messages",
          filter: `ticket_id=eq.${ticketId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["support-messages", ticketId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, queryClient]);

  // Scroll to bottom when new messages arrive
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

  const handleFileChange = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 3);
    setAttachments((prev) => [...prev, ...newFiles].slice(0, 3));
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;

    sendMessage.mutate(
      {
        ticketId: ticketId!,
        message: newMessage,
        attachments: attachments.length > 0 ? attachments : undefined,
      },
      {
        onSuccess: () => {
          setNewMessage("");
          setAttachments([]);
        },
      }
    );
  };

  const isLoading = ticketLoading || messagesLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Ticket not found</p>
        </div>
      </div>
    );
  }

  const isClosed = ticket.status === "closed" || ticket.status === "resolved";

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-3xl px-4 sm:px-6 py-4 sm:py-6 pb-32 sm:pb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/support/tickets")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tickets
          </Button>

          {/* Ticket Header */}
          <Card className="mb-4">
            <CardHeader className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-muted-foreground mb-1">
                    {ticket.ticket_number}
                  </p>
                  <CardTitle className="text-lg sm:text-xl">{ticket.subject}</CardTitle>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {ticket.category}
                    </Badge>
                    <Badge className={`${getStatusColor(ticket.status)} text-white text-xs`}>
                      {ticket.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </div>
              {ticket.related_order_id && (
                <p className="text-sm text-muted-foreground mt-3">
                  Related Order: {ticket.related_order_id}
                </p>
              )}
            </CardHeader>
          </Card>

          {/* Messages */}
          <Card>
            <CardHeader className="p-4 sm:p-6 pb-2">
              <CardTitle className="text-base">Conversation</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2">
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
                {messages?.map((message) => {
                  const isOwn = message.sender_id === user?.id;
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback
                          className={
                            message.is_staff
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }
                        >
                          {message.is_staff ? (
                            <Headphones className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`flex-1 max-w-[80%] ${isOwn ? "text-right" : ""}`}
                      >
                        <div
                          className={`inline-block p-3 rounded-lg ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(message.created_at), "MMM d, h:mm a")}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply Box */}
              {!isClosed && (
                <div className="mt-4 pt-4 border-t">
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Type your reply..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
                      className="resize-none"
                    />

                    {attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {attachments.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 px-2 py-1 rounded bg-muted text-sm"
                          >
                            <span className="truncate max-w-[100px]">{file.name}</span>
                            <button
                              onClick={() => removeAttachment(index)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0"
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => handleFileChange(e.target.files)}
                      />
                      <Button
                        className="flex-1 sm:flex-none sm:ml-auto"
                        onClick={handleSendMessage}
                        disabled={
                          (!newMessage.trim() && attachments.length === 0) ||
                          sendMessage.isPending
                        }
                      >
                        {sendMessage.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Send
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {isClosed && (
                <div className="mt-4 pt-4 border-t text-center">
                  <p className="text-sm text-muted-foreground">
                    This ticket has been {ticket.status}. Create a new ticket if you need
                    further assistance.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </PageTransition>
    </div>
  );
};

export default CustomerSupportTicketDetails;
