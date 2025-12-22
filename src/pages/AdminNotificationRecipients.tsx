import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, CheckCircle, Clock, XCircle, Eye } from "lucide-react";
import { useAdminNotificationDetails } from "@/hooks/useAdminNotifications";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminNotificationRecipients() {
  const { notificationId } = useParams<{ notificationId: string }>();
  const { recipients, isLoading } = useAdminNotificationDetails(notificationId || "");

  const getDeliveryBadge = (status: string) => {
    switch (status) {
      case "delivered":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Delivered</Badge>;
      case "pending":
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "failed":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
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
          <Users className="w-5 h-5" />
          Recipients ({recipients.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recipients.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No recipients yet</h3>
            <p className="text-muted-foreground">Recipients will appear here once the notification is sent</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Delivery Status</TableHead>
                    <TableHead>Delivered At</TableHead>
                    <TableHead>Read Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recipients.map((recipient) => (
                    <TableRow key={recipient.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={recipient.profile?.avatar_url} />
                            <AvatarFallback>
                              {recipient.profile?.full_name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {recipient.profile?.full_name || "Unknown User"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {recipient.user_id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {recipient.user_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{getDeliveryBadge(recipient.delivery_status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {recipient.delivered_at
                          ? format(new Date(recipient.delivered_at), "MMM d, h:mm a")
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {recipient.read_at ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">
                              {format(new Date(recipient.read_at), "MMM d, h:mm a")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Not read</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {recipients.map((recipient) => (
                <Card key={recipient.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={recipient.profile?.avatar_url} />
                        <AvatarFallback>
                          {recipient.profile?.full_name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {recipient.profile?.full_name || "Unknown User"}
                        </p>
                        <Badge variant="outline" className="capitalize text-xs">
                          {recipient.user_type}
                        </Badge>
                      </div>
                      {getDeliveryBadge(recipient.delivery_status)}
                    </div>
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        {recipient.delivered_at
                          ? `Delivered: ${format(new Date(recipient.delivered_at), "MMM d")}`
                          : "Not delivered"}
                      </span>
                      <span>
                        {recipient.read_at ? (
                          <span className="text-green-600">
                            <Eye className="w-3 h-3 inline mr-1" />
                            Read
                          </span>
                        ) : (
                          "Unread"
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
