import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderEvent } from "@/hooks/useOrderEvents";
import { 
  Clock, 
  Package, 
  Lock, 
  Truck, 
  CheckCircle, 
  AlertTriangle,
  RefreshCcw,
  XCircle,
  Loader2
} from "lucide-react";

interface OrderTimelineProps {
  events: OrderEvent[];
  isLoading?: boolean;
}

const eventIcons: Record<string, typeof Package> = {
  order_created: Package,
  status_change: Clock,
  escrow_locked: Lock,
  shipped: Truck,
  delivered: CheckCircle,
  completed: CheckCircle,
  disputed: AlertTriangle,
  refunded: RefreshCcw,
  cancelled: XCircle,
};

const eventColors: Record<string, string> = {
  order_created: 'bg-primary text-primary-foreground',
  escrow_locked: 'bg-primary text-primary-foreground',
  shipped: 'bg-blue-500 text-white',
  delivered: 'bg-success text-white',
  completed: 'bg-success text-white',
  disputed: 'bg-destructive text-destructive-foreground',
  refunded: 'bg-muted text-muted-foreground',
  cancelled: 'bg-destructive text-destructive-foreground',
  status_change: 'bg-secondary text-secondary-foreground',
};

export function OrderTimeline({ events, isLoading }: OrderTimelineProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No activity recorded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-6">
            {events.map((event, index) => {
              const Icon = eventIcons[event.event_type] || Clock;
              const colorClass = eventColors[event.event_type] || 'bg-muted text-muted-foreground';
              
              return (
                <div key={event.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pt-0.5">
                    <p className="font-medium text-foreground">{event.title}</p>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {event.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(event.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
