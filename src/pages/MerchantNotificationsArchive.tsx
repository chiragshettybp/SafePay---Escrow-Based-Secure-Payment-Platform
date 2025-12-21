import { useState } from "react";
import { Link } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  RotateCcw,
  Trash2,
  ArrowLeft,
  Archive,
} from "lucide-react";
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
    default:
      return "text-muted-foreground bg-muted";
  }
};

export default function MerchantNotificationsArchive() {
  const { isAuthenticated, isLoading: authLoading } = useMerchantAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const {
    notifications,
    isLoading,
    restoreNotification,
    deleteNotification,
  } = useMerchantNotifications("archived");

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Seo
          title="Archived Notifications | Safepay"
          description="View your archived notifications"
          canonicalPath="/merchant/notifications/archive"
        />
        <Card className="border-border/50 shadow-lg max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <h1 className="text-xl font-bold">Sign in required</h1>
            <p className="text-muted-foreground">Please sign in to view archived notifications.</p>
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
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        n.title.toLowerCase().includes(query) ||
        n.body.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <MerchantLayout>
      <Seo
        title="Archived Notifications | Safepay"
        description="View and manage your archived notifications"
        canonicalPath="/merchant/notifications/archive"
      />

      <section className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/merchant/notifications">
            <ArrowLeft className="h-4 w-4" />
            Back to notifications
          </Link>
        </Button>

        {/* Header */}
        <header>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Archived Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {notifications.length} archived notification{notifications.length !== 1 ? "s" : ""}
          </p>
        </header>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search archived notifications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Notifications List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
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
              <Archive className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No archived notifications</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Archived notifications will appear here"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredNotifications.map((notification) => (
              <ArchivedNotificationCard
                key={notification.id}
                notification={notification}
                onRestore={() => restoreNotification(notification.id)}
                onDelete={() => deleteNotification(notification.id)}
              />
            ))}
          </div>
        )}
      </section>
    </MerchantLayout>
  );
}

function ArchivedNotificationCard({
  notification,
  onRestore,
  onDelete,
}: {
  notification: MerchantNotification;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const Icon = getNotificationIcon(notification.type);
  const colorClass = getNotificationColor(notification.type);

  return (
    <Card className="border-border/50 opacity-75 hover:opacity-100 transition-opacity">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2.5 rounded-full flex-shrink-0", colorClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-foreground truncate">
                    {notification.title}
                  </h3>
                  {notification.priority === "urgent" && (
                    <Badge variant="outline" className="text-xs">
                      Urgent
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                  {notification.body}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Archived {notification.archived_at ? format(new Date(notification.archived_at), "MMM d") : ""}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={onRestore} title="Restore">
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={onDelete} title="Delete permanently">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
