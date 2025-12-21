import { format } from "date-fns";
import {
  ShoppingBag,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Truck,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MerchantOrder } from "@/hooks/useMerchantOrders";

interface MerchantActivityFeedProps {
  orders: MerchantOrder[];
}

type ActivityType =
  | "order_created"
  | "order_completed"
  | "order_disputed"
  | "order_refunded"
  | "order_delivered"
  | "order_in_progress";

interface Activity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
}

const activityConfig: Record<
  ActivityType,
  { icon: typeof ShoppingBag; color: string }
> = {
  order_created: { icon: ShoppingBag, color: "text-blue-500 bg-blue-500/10" },
  order_completed: { icon: CheckCircle, color: "text-emerald-500 bg-emerald-500/10" },
  order_disputed: { icon: AlertTriangle, color: "text-destructive bg-destructive/10" },
  order_refunded: { icon: RefreshCw, color: "text-amber-500 bg-amber-500/10" },
  order_delivered: { icon: Truck, color: "text-primary bg-primary/10" },
  order_in_progress: { icon: Clock, color: "text-muted-foreground bg-muted" },
};

export function MerchantActivityFeed({ orders }: MerchantActivityFeedProps) {
  // Generate activity from orders
  const activities: Activity[] = orders.slice(0, 10).map((order) => {
    let type: ActivityType = "order_created";
    let title = "New order received";
    let timestamp = order.created_at;

    switch (order.status) {
      case "completed":
        type = "order_completed";
        title = "Order completed";
        timestamp = order.completed_at || order.updated_at;
        break;
      case "disputed":
        type = "order_disputed";
        title = "Dispute opened";
        timestamp = order.updated_at;
        break;
      case "refunded":
        type = "order_refunded";
        title = "Order refunded";
        timestamp = order.updated_at;
        break;
      case "delivered":
        type = "order_delivered";
        title = "Order delivered";
        timestamp = order.delivered_at || order.updated_at;
        break;
      case "in_progress":
        type = "order_in_progress";
        title = "Order in progress";
        timestamp = order.updated_at;
        break;
    }

    return {
      id: order.id,
      type,
      title,
      description: `${order.product_name} • ₹${Number(order.amount).toLocaleString()}`,
      timestamp,
    };
  });

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activities.map((activity, index) => {
        const config = activityConfig[activity.type];
        const Icon = config.icon;
        const isLast = index === activities.length - 1;

        return (
          <div key={activity.id} className="flex gap-3">
            {/* Timeline */}
            <div className="flex flex-col items-center">
              <div className={cn("p-1.5 rounded-full", config.color)}>
                <Icon className="h-3 w-3" />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border my-1" />}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <p className="text-sm font-medium text-foreground">{activity.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activity.description}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(activity.timestamp), "MMM dd, h:mm a")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
