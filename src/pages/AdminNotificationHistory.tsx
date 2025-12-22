import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { History, Send, Edit, Archive, Plus, RotateCcw, Clock, XCircle } from "lucide-react";
import { useAdminNotificationDetails } from "@/hooks/useAdminNotifications";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminNotificationHistory() {
  const { notificationId } = useParams<{ notificationId: string }>();
  const { logs, isLoading } = useAdminNotificationDetails(notificationId || "");

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "created":
        return <Plus className="w-4 h-4 text-green-500" />;
      case "updated":
        return <Edit className="w-4 h-4 text-blue-500" />;
      case "sent":
        return <Send className="w-4 h-4 text-green-500" />;
      case "scheduled":
        return <Clock className="w-4 h-4 text-blue-500" />;
      case "cancelled":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "archived":
        return <Archive className="w-4 h-4 text-gray-500" />;
      case "resent":
        return <RotateCcw className="w-4 h-4 text-purple-500" />;
      default:
        return <History className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case "created":
        return <Badge className="bg-green-500">Created</Badge>;
      case "updated":
        return <Badge className="bg-blue-500">Updated</Badge>;
      case "sent":
        return <Badge className="bg-green-500">Sent</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-500">Scheduled</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "archived":
        return <Badge variant="secondary">Archived</Badge>;
      case "resent":
        return <Badge className="bg-purple-500">Resent</Badge>;
      default:
        return <Badge variant="outline">{actionType}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Activity History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-12">
            <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No history yet</h3>
            <p className="text-muted-foreground">Activity will be recorded here</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-6">
              {logs.map((log, index) => (
                <div key={log.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className="absolute left-2 top-1 p-1.5 rounded-full bg-background border-2 border-border">
                    {getActionIcon(log.action_type)}
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {getActionBadge(log.action_type)}
                          <span className="text-sm text-muted-foreground">
                            by Admin
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(log.created_at), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>

                      {log.description && (
                        <p className="text-sm">{log.description}</p>
                      )}

                      {log.new_value && Object.keys(log.new_value).length > 0 && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <pre className="whitespace-pre-wrap">
                            {JSON.stringify(log.new_value, null, 2)}
                          </pre>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
