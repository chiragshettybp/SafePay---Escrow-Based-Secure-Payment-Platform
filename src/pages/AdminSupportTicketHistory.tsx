import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminTicketDetails } from "@/hooks/useAdminSupport";
import { format } from "date-fns";
import { 
  History, 
  ArrowRight, 
  User, 
  Shield,
  Clock
} from "lucide-react";

export default function AdminSupportTicketHistory() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const { history, isLoading } = useAdminTicketDetails(ticketId || "");

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
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
          <History className="h-5 w-5" />
          Status History
          <span className="text-sm font-normal text-muted-foreground">
            (Audit Trail)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No history available</p>
            <p className="text-sm">Status changes will be recorded here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry, index) => (
              <div
                key={entry.id}
                className="relative flex gap-4 pb-4 last:pb-0"
              >
                {/* Timeline line */}
                {index < history.length - 1 && (
                  <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                )}

                {/* Timeline dot */}
                <div className="shrink-0 mt-1">
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                    {entry.changed_by_type === "admin" ? (
                      <Shield className="h-3 w-3 text-primary" />
                    ) : (
                      <User className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {entry.changed_by_type === "admin" ? "Admin" : "System"}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>

                  {/* Status Change */}
                  {entry.previous_status && entry.new_status && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.previous_status.replace("_", " ")}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge className="text-xs">
                        {entry.new_status.replace("_", " ")}
                      </Badge>
                    </div>
                  )}

                  {/* Priority Change */}
                  {entry.previous_priority && entry.new_priority && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">Priority:</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {entry.previous_priority}
                      </Badge>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <Badge
                        className={`text-xs capitalize ${
                          entry.new_priority === "critical"
                            ? "bg-red-500/10 text-red-600"
                            : entry.new_priority === "high"
                            ? "bg-amber-500/10 text-amber-600"
                            : ""
                        }`}
                      >
                        {entry.new_priority}
                      </Badge>
                    </div>
                  )}

                  {/* Reason */}
                  {entry.reason && (
                    <p className="text-sm text-muted-foreground mt-2 italic">
                      "{entry.reason}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
