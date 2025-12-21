import { useState } from "react";
import { Link } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/seo/Seo";
import {
  useMerchantNotifications,
  type MerchantNotification,
} from "@/hooks/useMerchantNotifications";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import {
  Bell,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  Wallet,
  Shield,
  MessageSquare,
  Settings,
  Search,
  Archive,
  CheckCheck,
  Trash2,
  Filter,
  ChevronRight,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const getNotificationIcon = (type: string) => {
  switch (type) {
    case "order":
      return ShoppingBag;
    case "payment":
      return CreditCard;
    case "dispute":
      return AlertTriangle;
    case "payout":
      return Wallet;
    case "kyc":
      return Shield;
    case "admin":
      return MessageSquare;
    case "system":
      return Settings;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case "order":
      return "text-blue-500 bg-blue-500/10";
    case "payment":
      return "text-green-500 bg-green-500/10";
    case "dispute":
      return "text-orange-500 bg-orange-500/10";
    case "payout":
      return "text-purple-500 bg-purple-500/10";
    case "kyc":
      return "text-cyan-500 bg-cyan-500/10";
    case "admin":
      return "text-pink-500 bg-pink-500/10";
    default:
      return "text-muted-foreground bg-muted";
  }
};

export default function MerchantNotifications() {
  const { isAuthenticated, isLoading: authLoading } = useMerchantAuth();
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const {
    notifications,
    isLoading,
    unreadCount,
    markAllAsRead,
    bulkArchive,
    bulkMarkAsRead,
  } = useMerchantNotifications(statusFilter === "all" ? "all" : statusFilter);

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Seo
          title="Merchant Notifications | Safepay"
          description="View your merchant notifications"
          canonicalPath="/merchant/notifications"
        />
        <Card className="border-border/50 shadow-lg max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <h1 className="text-xl font-bold">Sign in required</h1>
            <p className="text-muted-foreground">Please sign in to view notifications.</p>
            <Button asChild className="w-full">
              <Link to="/merchant/login">Go to Merchant Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(query) ||
        n.body.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map((n) => n.id));
    }
  };

  const handleBulkArchive = () => {
    if (selectedIds.length > 0) {
      bulkArchive(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleBulkMarkRead = () => {
    if (selectedIds.length > 0) {
      bulkMarkAsRead(selectedIds);
      setSelectedIds([]);
    }
  };

  return (
    <MerchantLayout>
      <Seo
        title="Merchant Notifications | Safepay"
        description="View and manage your merchant notifications"
        canonicalPath="/merchant/notifications"
      />

      <section className="space-y-6">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsRead()}
              disabled={unreadCount === 0}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark all read
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/merchant/notifications/preferences">
                <Settings className="h-4 w-4 mr-1" />
                Preferences
              </Link>
            </Button>
          </div>
        </header>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-36">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="order">Orders</SelectItem>
              <SelectItem value="payment">Payments</SelectItem>
              <SelectItem value="dispute">Disputes</SelectItem>
              <SelectItem value="payout">Payouts</SelectItem>
              <SelectItem value="kyc">KYC</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">{selectedIds.length} selected</span>
            <Button variant="outline" size="sm" onClick={handleBulkMarkRead}>
              <CheckCheck className="h-4 w-4 mr-1" />
              Mark read
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkArchive}>
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
              Cancel
            </Button>
          </div>
        )}

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No notifications</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "You're all caught up!"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {/* Select all checkbox for desktop */}
            <div className="hidden sm:flex items-center gap-2 px-4 py-2">
              <Checkbox
                checked={
                  selectedIds.length === filteredNotifications.length &&
                  filteredNotifications.length > 0
                }
                onCheckedChange={selectAll}
              />
              <span className="text-sm text-muted-foreground">Select all</span>
            </div>

            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                isSelected={selectedIds.includes(notification.id)}
                onToggleSelect={() => toggleSelect(notification.id)}
              />
            ))}
          </div>
        )}

        {/* Archive link */}
        <div className="flex justify-center pt-4">
          <Button variant="ghost" asChild>
            <Link to="/merchant/notifications/archive">
              <Archive className="h-4 w-4 mr-2" />
              View archived notifications
            </Link>
          </Button>
        </div>
      </section>
    </MerchantLayout>
  );
}

function NotificationCard({
  notification,
  isSelected,
  onToggleSelect,
}: {
  notification: MerchantNotification;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const Icon = getNotificationIcon(notification.type);
  const colorClass = getNotificationColor(notification.type);
  const isUnread = notification.status === "unread";

  return (
    <Card
      className={cn(
        "border-border/50 transition-colors hover:bg-accent/50",
        isUnread && "bg-primary/5 border-primary/20"
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-1 hidden sm:block"
          />
          <div className={cn("p-2.5 rounded-full flex-shrink-0", colorClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <Link
            to={`/merchant/notifications/${notification.id}`}
            className="flex-1 min-w-0"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3
                    className={cn(
                      "text-sm truncate",
                      isUnread ? "font-semibold text-foreground" : "font-medium text-foreground"
                    )}
                  >
                    {notification.title}
                  </h3>
                  {notification.priority === "urgent" && (
                    <Badge variant="destructive" className="text-xs">
                      Urgent
                    </Badge>
                  )}
                  {isUnread && (
                    <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                  {notification.body}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>{format(new Date(notification.created_at), "MMM d, h:mm a")}</span>
                  {notification.related_order_id && (
                    <span className="text-primary">Order linked</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            </div>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
