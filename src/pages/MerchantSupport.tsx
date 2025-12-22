import { useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMerchantSupport } from "@/hooks/useMerchantSupport";
import { Plus, Ticket, HelpCircle, ChevronRight, MessageSquare, Clock, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const MerchantSupport = () => {
  const navigate = useNavigate();
  const { tickets, ticketsLoading, ticketCounts } = useMerchantSupport();

  const lastTicket = tickets?.[0];

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
        return "bg-muted";
      default:
        return "bg-muted";
    }
  };

  const summaryCards = [
    {
      id: "open",
      title: "Open Tickets",
      count: ticketCounts.open,
      icon: Ticket,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      id: "awaiting",
      title: "Awaiting Your Reply",
      count: ticketCounts.awaiting_merchant,
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      id: "resolved",
      title: "Resolved Tickets",
      count: ticketCounts.resolved,
      icon: CheckCircle,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  const actionCards = [
    {
      id: "create",
      title: "Create Support Ticket",
      description: "Report an issue or ask a question",
      icon: Plus,
      path: "/merchant/support/create",
      accent: true,
    },
    {
      id: "tickets",
      title: "View My Tickets",
      description: "View and manage your support tickets",
      icon: Ticket,
      path: "/merchant/support/tickets",
      badge: ticketCounts.open > 0 ? `${ticketCounts.open} open` : null,
    },
    {
      id: "faq",
      title: "Help Center / FAQs",
      description: "Browse frequently asked questions",
      icon: HelpCircle,
      path: "/merchant/support/faq",
    },
  ];

  return (
    <MerchantLayout>
      <div className="container max-w-4xl px-4 sm:px-6 py-4 sm:py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Merchant Support</h1>
          <p className="text-muted-foreground mt-1">Get help with orders, payouts, disputes, and more</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {ticketsLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </>
          ) : (
            summaryCards.map((card) => (
              <Card key={card.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate("/merchant/support/tickets")}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className={`p-3 rounded-full ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{card.count}</p>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Action Cards */}
        <div className="grid gap-4">
          {actionCards.map((card) => (
            <Card
              key={card.id}
              className={`cursor-pointer hover:bg-muted/50 transition-colors ${
                card.accent ? "border-primary/50 bg-primary/5" : ""
              }`}
              onClick={() => navigate(card.path)}
            >
              <CardHeader className="flex flex-row items-center gap-4 p-4 sm:p-6">
                <div
                  className={`p-2 sm:p-3 rounded-full ${
                    card.accent ? "bg-primary text-primary-foreground" : "bg-primary/10"
                  }`}
                >
                  <card.icon
                    className={`h-5 w-5 sm:h-6 sm:w-6 ${
                      card.accent ? "text-primary-foreground" : "text-primary"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base sm:text-lg">{card.title}</CardTitle>
                    {card.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {card.badge}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs sm:text-sm mt-0.5">
                    {card.description}
                  </CardDescription>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Recent Ticket */}
        {lastTicket && (
          <Card className="mt-6">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Recent Ticket
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-2">
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => navigate(`/merchant/support/ticket/${lastTicket.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{lastTicket.subject}</p>
                  <p className="text-sm text-muted-foreground">
                    {lastTicket.ticket_number}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`${getStatusColor(lastTicket.status)} text-white`}>
                    {lastTicket.status.replace("_", " ")}
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MerchantLayout>
  );
};

export default MerchantSupport;
