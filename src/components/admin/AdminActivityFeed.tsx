import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import {
  ShoppingCart,
  Users,
  Store,
  AlertTriangle,
  Wallet,
  Package,
  Headphones,
} from "lucide-react";
import type { RecentActivity } from "@/hooks/useAdminDashboard";

interface AdminActivityFeedProps {
  activities: RecentActivity[];
  isLoading: boolean;
}

export function AdminActivityFeed({ activities, isLoading }: AdminActivityFeedProps) {
  const navigate = useNavigate();

  const getActivityIcon = (type: RecentActivity["type"]) => {
    switch (type) {
      case "order":
        return <ShoppingCart className="h-4 w-4" />;
      case "customer":
        return <Users className="h-4 w-4" />;
      case "merchant":
        return <Store className="h-4 w-4" />;
      case "dispute":
        return <AlertTriangle className="h-4 w-4" />;
      case "withdrawal":
        return <Wallet className="h-4 w-4" />;
      case "shipment":
        return <Package className="h-4 w-4" />;
      case "support":
        return <Headphones className="h-4 w-4" />;
      default:
        return <ShoppingCart className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: RecentActivity["type"]) => {
    switch (type) {
      case "order":
        return "bg-blue-500/10 text-blue-600";
      case "customer":
        return "bg-green-500/10 text-green-600";
      case "merchant":
        return "bg-purple-500/10 text-purple-600";
      case "dispute":
        return "bg-destructive/10 text-destructive";
      case "withdrawal":
        return "bg-amber-500/10 text-amber-600";
      case "shipment":
        return "bg-cyan-500/10 text-cyan-600";
      case "support":
        return "bg-orange-500/10 text-orange-600";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getActivityLink = (activity: RecentActivity) => {
    switch (activity.type) {
      case "order":
        return `/admin/orders/${activity.id}`;
      case "dispute":
        return `/admin/disputes/${activity.id}`;
      case "merchant":
        return `/admin/merchants/${activity.id}`;
      case "support":
        return `/admin/support/${activity.id}`;
      default:
        return undefined;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[350px]">
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          ) : (
            <div className="divide-y">
              {activities.map((activity) => {
                const link = getActivityLink(activity);
                return (
                  <div
                    key={`${activity.type}-${activity.id}`}
                    className={`flex items-start gap-3 p-4 ${
                      link ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""
                    }`}
                    onClick={link ? () => navigate(link) : undefined}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${getActivityColor(
                        activity.type
                      )}`}
                    >
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default AdminActivityFeed;
