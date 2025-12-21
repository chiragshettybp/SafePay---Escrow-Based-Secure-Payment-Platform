import { Link } from "react-router-dom";
import { AlertTriangle, Truck, FileCheck, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  type: "dispute" | "shipment" | "kyc";
  title: string;
  description: string;
  href: string;
  urgent?: boolean;
}

interface MerchantAlertsProps {
  disputeCount: number;
  pendingShipmentCount: number;
}

export function MerchantAlerts({
  disputeCount,
  pendingShipmentCount,
}: MerchantAlertsProps) {
  const alerts: Alert[] = [];

  if (disputeCount > 0) {
    alerts.push({
      id: "disputes",
      type: "dispute",
      title: `${disputeCount} dispute${disputeCount > 1 ? "s" : ""} require response`,
      description: "Respond within 48 hours to avoid automatic resolution",
      href: "/merchant/disputes",
      urgent: true,
    });
  }

  if (pendingShipmentCount > 0) {
    alerts.push({
      id: "shipments",
      type: "shipment",
      title: `${pendingShipmentCount} order${pendingShipmentCount > 1 ? "s" : ""} need shipment update`,
      description: "Update shipment status to keep customers informed",
      href: "/merchant/orders?status=pending",
      urgent: false,
    });
  }

  if (alerts.length === 0) {
    return null;
  }

  const getIcon = (type: Alert["type"]) => {
    switch (type) {
      case "dispute":
        return AlertTriangle;
      case "shipment":
        return Truck;
      case "kyc":
        return FileCheck;
    }
  };

  const getIconColor = (type: Alert["type"], urgent?: boolean) => {
    if (urgent) return "text-destructive bg-destructive/10";
    switch (type) {
      case "dispute":
        return "text-destructive bg-destructive/10";
      case "shipment":
        return "text-amber-500 bg-amber-500/10";
      case "kyc":
        return "text-blue-500 bg-blue-500/10";
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        Action Required
      </h3>
      <div className="space-y-2">
        {alerts.map((alert) => {
          const Icon = getIcon(alert.type);
          return (
            <Link
              key={alert.id}
              to={alert.href}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                alert.urgent
                  ? "bg-destructive/5 border-destructive/20 hover:bg-destructive/10"
                  : "bg-card border-border hover:bg-accent/50"
              )}
            >
              <div
                className={cn(
                  "p-2 rounded-lg flex-shrink-0",
                  getIconColor(alert.type, alert.urgent)
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {alert.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {alert.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
