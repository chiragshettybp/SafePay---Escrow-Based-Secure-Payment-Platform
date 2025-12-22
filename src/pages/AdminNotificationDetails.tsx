import { useParams, useNavigate, Outlet, useLocation } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Bell, Users, History, Settings, Send, Clock, FileText, Archive, AlertTriangle, Info, Eye, CheckCircle, XCircle } from "lucide-react";
import { useAdminNotificationDetails } from "@/hooks/useAdminNotifications";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminNotificationDetails() {
  const { notificationId } = useParams<{ notificationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { notification, deliveryMetrics, isLoading } = useAdminNotificationDetails(notificationId || "");

  const currentTab = location.pathname.split("/").pop() || "recipients";
  const isOverviewPage = !["recipients", "history", "actions"].includes(currentTab);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline"><FileText className="w-3 h-3 mr-1" />Draft</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-500"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>;
      case "sent":
        return <Badge className="bg-green-500"><Send className="w-3 h-3 mr-1" />Sent</Badge>;
      case "archived":
        return <Badge variant="secondary"><Archive className="w-3 h-3 mr-1" />Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "info":
        return <Badge variant="outline" className="text-blue-600"><Info className="w-3 h-3 mr-1" />Info</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>;
      case "alert":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Alert</Badge>;
      case "system":
        return <Badge className="bg-purple-500"><Bell className="w-3 h-3 mr-1" />System</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!notification) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Notification Not Found</h2>
          <Button onClick={() => navigate("/admin/notifications")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Notifications
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/notifications")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{notification.title}</h1>
              {getStatusBadge(notification.status)}
              {getTypeBadge(notification.type)}
            </div>
            <p className="text-muted-foreground">
              Created {format(new Date(notification.created_at), "MMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notification Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Message</h4>
                <p className="text-sm">{notification.message}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">Target Audience</h4>
                  <Badge variant="outline" className="capitalize">
                    <Users className="w-3 h-3 mr-1" />
                    {notification.target_audience === "all" ? "All Users" : notification.target_audience}
                  </Badge>
                </div>
                {notification.sent_at && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Sent At</h4>
                    <p className="text-sm">{format(new Date(notification.sent_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                {notification.scheduled_at && notification.status === "scheduled" && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Scheduled For</h4>
                    <p className="text-sm">{format(new Date(notification.scheduled_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{deliveryMetrics.total}</div>
                  <p className="text-sm text-muted-foreground">Total Recipients</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-600">{deliveryMetrics.delivered}</div>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">{deliveryMetrics.read}</div>
                  <p className="text-sm text-muted-foreground">Read</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold text-yellow-600">{deliveryMetrics.pending}</div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-red-600">{deliveryMetrics.failed}</div>
                  <p className="text-sm text-muted-foreground">Failed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={isOverviewPage ? "recipients" : currentTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger
              value="recipients"
              onClick={() => navigate(`/admin/notifications/${notificationId}/recipients`)}
            >
              <Users className="w-4 h-4 mr-2" />
              Recipients
            </TabsTrigger>
            <TabsTrigger
              value="history"
              onClick={() => navigate(`/admin/notifications/${notificationId}/history`)}
            >
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger
              value="actions"
              onClick={() => navigate(`/admin/notifications/${notificationId}/actions`)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Actions
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Nested Routes */}
        <Outlet />
      </div>
    </AdminLayout>
  );
}
