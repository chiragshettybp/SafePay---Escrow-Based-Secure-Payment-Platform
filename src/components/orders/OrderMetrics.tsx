import { Card, CardContent } from "@/components/ui/card";
import { Package, Clock, CheckCircle, RefreshCcw } from "lucide-react";
import { OrderMetrics as OrderMetricsType } from "@/hooks/useOrders";

interface OrderMetricsProps {
  metrics: OrderMetricsType;
  isLoading?: boolean;
}

const metricsConfig = [
  {
    key: 'total' as const,
    label: 'Total Orders',
    icon: Package,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    key: 'pending' as const,
    label: 'Pending',
    icon: Clock,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  {
    key: 'completed' as const,
    label: 'Completed',
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  {
    key: 'refunded' as const,
    label: 'Refunded',
    icon: RefreshCcw,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
];

export function OrderMetrics({ metrics, isLoading }: OrderMetricsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metricsConfig.map((config) => {
        const Icon = config.icon;
        return (
          <Card key={config.key} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.bgColor}`}>
                  <Icon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{config.label}</p>
                  {isLoading ? (
                    <div className="h-7 w-12 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-2xl font-bold text-foreground">
                      {metrics[config.key]}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
