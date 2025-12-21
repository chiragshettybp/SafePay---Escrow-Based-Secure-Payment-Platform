import { useParams, Link, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/seo/Seo";
import { useMerchantNotificationDetail, useMerchantNotifications } from "@/hooks/useMerchantNotifications";
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
  ArrowLeft,
  Archive,
  Trash2,
  ExternalLink,
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
    case "kyc":
      return "text-cyan-500 bg-cyan-500/10";
    case "admin":
      return "text-pink-500 bg-pink-500/10";
    default:
      return "text-muted-foreground bg-muted";
  }
};

export default function MerchantNotificationDetail() {
  const { notificationId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useMerchantAuth();
  const { notification, isLoading, error } = useMerchantNotificationDetail(notificationId);
  const { archiveNotification, deleteNotification } = useMerchantNotifications();

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Seo
          title="Notification | Safepay"
          description="View notification details"
          canonicalPath="/merchant/notifications"
        />
        <Card className="border-border/50 shadow-lg max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <h1 className="text-xl font-bold">Sign in required</h1>
            <p className="text-muted-foreground">Please sign in to view this notification.</p>
            <Button asChild className="w-full">
              <Link to="/merchant/login">Go to Merchant Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleArchive = () => {
    if (notificationId) {
      archiveNotification(notificationId);
      navigate("/merchant/notifications");
    }
  };

  const handleDelete = () => {
    if (notificationId) {
      deleteNotification(notificationId);
      navigate("/merchant/notifications");
    }
  };

  const Icon = notification ? getNotificationIcon(notification.type) : Bell;
  const colorClass = notification ? getNotificationColor(notification.type) : "";

  return (
    <MerchantLayout>
      <Seo
        title={notification?.title || "Notification"} 
        description="View notification details"
        canonicalPath={`/merchant/notifications/${notificationId}`}
      />

      <section className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/merchant/notifications">
            <ArrowLeft className="h-4 w-4" />
            Back to notifications
          </Link>
        </Button>

        {isLoading ? (
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ) : error || !notification ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Notification not found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                This notification may have been deleted.
              </p>
              <Button asChild className="mt-4">
                <Link to="/merchant/notifications">View all notifications</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={cn("p-3 rounded-full", colorClass)}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg">{notification.title}</CardTitle>
                      {notification.priority === "urgent" && (
                        <Badge variant="destructive">Urgent</Badge>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {notification.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(notification.created_at), "MMMM d, yyyy 'at' h:mm a")}
                    </p>
                    {notification.read_at && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Read at {format(new Date(notification.read_at), "MMM d, h:mm a")}
                      </p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Message body */}
                <div className="prose prose-sm max-w-none text-foreground">
                  <p className="whitespace-pre-wrap">{notification.body}</p>
                </div>

                {/* Related links */}
                {notification.related_order_id && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Related Order</p>
                    <Button variant="outline" asChild>
                      <Link to={`/merchant/order/${notification.related_order_id}`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Order Details
                      </Link>
                    </Button>
                  </div>
                )}

                {notification.related_dispute_id && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium mb-2">Related Dispute</p>
                    <Button variant="outline" asChild>
                      <Link to={`/merchant/dispute/${notification.related_dispute_id}/respond`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Dispute
                      </Link>
                    </Button>
                  </div>
                )}

                {/* Actions based on notification type */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-border">
                  {notification.type === "order" && notification.related_order_id && (
                    <Button asChild>
                      <Link to={`/merchant/order/${notification.related_order_id}`}>
                        Go to Order
                      </Link>
                    </Button>
                  )}
                  {notification.type === "dispute" && notification.related_dispute_id && (
                    <Button asChild>
                      <Link to={`/merchant/dispute/${notification.related_dispute_id}/respond`}>
                        Respond to Dispute
                      </Link>
                    </Button>
                  )}
                  {notification.type === "payout" && (
                    <Button asChild>
                      <Link to="/merchant/payouts">View Payouts</Link>
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleArchive}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </Button>
                  <Button variant="outline" onClick={handleDelete}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Additional data if present */}
            {notification.data && Object.keys(notification.data).length > 0 && (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Additional Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-2 text-sm">
                    {Object.entries(notification.data).map(([key, value]) => (
                      <div key={key} className="flex justify-between py-1 border-b border-border last:border-0">
                        <dt className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</dt>
                        <dd className="font-medium">{String(value)}</dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </section>
    </MerchantLayout>
  );
}
