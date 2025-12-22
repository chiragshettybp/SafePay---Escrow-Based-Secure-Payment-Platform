import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Bell, Plus, Search, Filter, Send, Clock, FileText, Archive, Users, Eye, AlertTriangle, Info } from "lucide-react";
import { useAdminNotifications, NotificationFilters } from "@/hooks/useAdminNotifications";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminNotifications() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<NotificationFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const { notifications, isLoading, metrics } = useAdminNotifications(filters);

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

  const getAudienceBadge = (audience: string) => {
    switch (audience) {
      case "all":
        return <Badge variant="outline"><Users className="w-3 h-3 mr-1" />All Users</Badge>;
      case "customers":
        return <Badge variant="outline" className="text-green-600">Customers</Badge>;
      case "merchants":
        return <Badge variant="outline" className="text-blue-600">Merchants</Badge>;
      case "specific":
        return <Badge variant="outline" className="text-orange-600">Specific Users</Badge>;
      default:
        return <Badge variant="outline">{audience}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6" />
              Notifications Management
            </h1>
            <p className="text-muted-foreground">Create and manage platform notifications</p>
          </div>
          <Button onClick={() => navigate("/admin/notifications/create")}>
            <Plus className="w-4 h-4 mr-2" />
            Create Notification
          </Button>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{metrics.total}</div>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{metrics.draft}</div>
              <p className="text-sm text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{metrics.scheduled}</div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{metrics.sent}</div>
              <p className="text-sm text-muted-foreground">Sent</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-500">{metrics.archived}</div>
              <p className="text-sm text-muted-foreground">Archived</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  className="pl-9"
                  value={filters.search || ""}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => setFilters((f) => ({ ...f, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.type || "all"}
                  onValueChange={(value) => setFilters((f) => ({ ...f, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.target_audience || "all"}
                  onValueChange={(value) => setFilters((f) => ({ ...f, target_audience: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Audiences</SelectItem>
                    <SelectItem value="customers">Customers</SelectItem>
                    <SelectItem value="merchants">Merchants</SelectItem>
                    <SelectItem value="specific">Specific Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No notifications found</h3>
                <p className="text-muted-foreground mb-4">Create your first notification to get started</p>
                <Button onClick={() => navigate("/admin/notifications/create")}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Notification
                </Button>
              </div>
            ) : (
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Audience</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Delivered</TableHead>
                      <TableHead>Read</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notifications.map((notification) => (
                      <TableRow
                        key={notification.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/admin/notifications/${notification.id}`)}
                      >
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {notification.title}
                        </TableCell>
                        <TableCell>{getTypeBadge(notification.type)}</TableCell>
                        <TableCell>{getAudienceBadge(notification.target_audience)}</TableCell>
                        <TableCell>{getStatusBadge(notification.status)}</TableCell>
                        <TableCell>
                          <span className="text-green-600">{notification.delivered_count || 0}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-blue-600">{notification.read_count || 0}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(notification.created_at), "MMM d, yyyy")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/notifications/${notification.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium truncate flex-1">{notification.title}</h3>
                      {getStatusBadge(notification.status)}
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {getTypeBadge(notification.type)}
                      {getAudienceBadge(notification.target_audience)}
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        <Eye className="w-3 h-3 inline mr-1" />
                        {notification.read_count || 0} read
                      </span>
                      <span>{format(new Date(notification.created_at), "MMM d, yyyy")}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
