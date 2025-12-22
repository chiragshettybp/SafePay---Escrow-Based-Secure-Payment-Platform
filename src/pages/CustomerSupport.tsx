import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCustomerSupport } from "@/hooks/useCustomerSupport";
import { Plus, Ticket, HelpCircle, ChevronRight, MessageSquare } from "lucide-react";

const CustomerSupport = () => {
  const navigate = useNavigate();
  const { tickets } = useCustomerSupport();

  const openTickets = tickets?.filter((t) => t.status !== "closed" && t.status !== "resolved") || [];
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

  const supportCards = [
    {
      id: "create",
      title: "Create Support Ticket",
      description: "Report an issue or ask a question",
      icon: Plus,
      path: "/support/create",
      accent: true,
    },
    {
      id: "tickets",
      title: "My Tickets",
      description: "View and manage your support tickets",
      icon: Ticket,
      path: "/support/tickets",
      badge: openTickets.length > 0 ? `${openTickets.length} open` : null,
    },
    {
      id: "faq",
      title: "Help Center",
      description: "Browse frequently asked questions",
      icon: HelpCircle,
      path: "/support/faq",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-4xl px-4 sm:px-6 py-4 sm:py-6">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold">Support</h1>
            <p className="text-muted-foreground mt-1">Get help with your orders and account</p>
          </div>

          <div className="grid gap-4">
            {supportCards.map((card) => (
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

          {/* Last Ticket Status */}
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
                  onClick={() => navigate(`/support/ticket/${lastTicket.id}`)}
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
        </main>
      </PageTransition>
    </div>
  );
};

export default CustomerSupport;
