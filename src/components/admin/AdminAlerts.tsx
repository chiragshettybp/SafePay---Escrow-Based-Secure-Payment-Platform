import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import type { Alert } from "@/hooks/useAdminDashboard";

interface AdminAlertsProps {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
}

export function AdminAlerts({ alerts, onDismiss }: AdminAlertsProps) {
  const navigate = useNavigate();

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-green-500/10 rounded-full flex items-center justify-center mb-3">
              <Info className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm text-muted-foreground">All systems operational</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getAlertIcon = (type: Alert["type"]) => {
    switch (type) {
      case "error":
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertBg = (type: Alert["type"]) => {
    switch (type) {
      case "error":
        return "bg-destructive/10 border-destructive/20";
      case "warning":
        return "bg-amber-500/10 border-amber-500/20";
      default:
        return "bg-blue-500/10 border-blue-500/20";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>System Alerts</span>
          <span className="text-xs font-normal text-muted-foreground">
            {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px]">
          <div className="space-y-2 p-4 pt-0">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertBg(alert.type)}`}
              >
                <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
                  {alert.link && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs mt-1"
                      onClick={() => navigate(alert.link!)}
                    >
                      View details →
                    </Button>
                  )}
                </div>
                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onDismiss(alert.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export default AdminAlerts;
