import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAdminTicketDetails } from "@/hooks/useAdminSupport";
import { 
  ArrowLeft, 
  User, 
  Package, 
  Truck, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  Phone,
  Mail
} from "lucide-react";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  open: { label: "Open", variant: "destructive", icon: <AlertTriangle className="h-4 w-4" /> },
  in_progress: { label: "In Progress", variant: "default", icon: <Clock className="h-4 w-4" /> },
  waiting: { label: "Waiting", variant: "secondary", icon: <Clock className="h-4 w-4" /> },
  resolved: { label: "Resolved", variant: "outline", icon: <CheckCircle className="h-4 w-4" /> },
  closed: { label: "Closed", variant: "secondary", icon: <XCircle className="h-4 w-4" /> },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "text-muted-foreground bg-muted" },
  medium: { label: "Medium", color: "text-blue-600 bg-blue-500/10" },
  high: { label: "High", color: "text-amber-600 bg-amber-500/10" },
  critical: { label: "Critical", color: "text-red-600 bg-red-500/10 font-bold" },
};

export default function AdminSupportTicket() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { ticket, isLoading } = useAdminTicketDetails(ticketId || "");

  const currentTab = location.pathname.includes("/conversation")
    ? "conversation"
    : location.pathname.includes("/attachments")
    ? "attachments"
    : location.pathname.includes("/history")
    ? "history"
    : location.pathname.includes("/actions")
    ? "actions"
    : "details";

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-4 md:p-6 space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <Skeleton className="h-96" />
            </div>
            <Skeleton className="h-64" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (!ticket) {
    return (
      <AdminLayout>
        <div className="p-4 md:p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">Ticket not found</p>
              <Button className="mt-4" onClick={() => navigate("/admin/support")}>
                Back to Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  const status = statusConfig[ticket.status] || statusConfig.open;
  const priority = priorityConfig[ticket.priority] || priorityConfig.medium;

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/support")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold">{ticket.ticket_number}</h1>
              <Badge variant={status.variant} className="gap-1">
                {status.icon}
                {status.label}
              </Badge>
              <Badge className={`${priority.color} border-0`}>{priority.label}</Badge>
              {(ticket as any).escalated && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Escalated
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-sm mt-1">{ticket.subject}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Navigation Tabs */}
            <Tabs
              value={currentTab}
              onValueChange={(v) => {
                const path = v === "details" ? "" : `/${v}`;
                navigate(`/admin/support/${ticketId}${path}`);
              }}
            >
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="conversation">Conversation</TabsTrigger>
                <TabsTrigger value="attachments">Attachments</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Tab Content */}
            <Outlet context={{ ticket }} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* User Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Submitted By
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="font-medium">{ticket.profile?.full_name || "Unknown User"}</p>
                  <p className="text-sm text-muted-foreground">Customer</p>
                </div>
                {ticket.profile?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{ticket.profile.phone}</span>
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate(`/admin/users/${ticket.user_id}`)}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Profile
                </Button>
              </CardContent>
            </Card>

            {/* Linked References */}
            {(ticket.related_order_id || ticket.related_shipment_id) && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Linked References</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {ticket.related_order_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => navigate(`/admin/orders/${ticket.related_order_id}`)}
                    >
                      <Package className="h-4 w-4 mr-2" />
                      View Order
                    </Button>
                  )}
                  {ticket.related_shipment_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => navigate(`/admin/shipments/${ticket.related_shipment_id}`)}
                    >
                      <Truck className="h-4 w-4 mr-2" />
                      View Shipment
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ticket Info */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ticket Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Category</span>
                  <span className="capitalize">{ticket.category}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(ticket.created_at), "MMM d, yyyy HH:mm")}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{format(new Date(ticket.updated_at), "MMM d, yyyy HH:mm")}</span>
                </div>
                {ticket.resolved_at && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resolved</span>
                      <span>{format(new Date(ticket.resolved_at), "MMM d, yyyy HH:mm")}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
