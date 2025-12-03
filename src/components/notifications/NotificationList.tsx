import { Bell, MessageCircle, Clock, Calendar, FileText, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

type NotificationType = "message" | "assignment" | "attendance" | "schedule";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
  urgent?: boolean;
}

interface NotificationListProps {
  notifications: Notification[];
}

export function NotificationList({ notifications }: NotificationListProps) {
  const isMobile = useIsMobile();
  
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case "message":
        return <MessageCircle className="h-4 w-4" />;
      case "assignment":
        return <FileText className="h-4 w-4" />;
      case "attendance":
        return <Bell className="h-4 w-4" />;
      case "schedule":
        return <Calendar className="h-4 w-4" />;
    }
  };
  
  const getNotificationsByType = (type: NotificationType | "all") => {
    if (type === "all") return notifications;
    return notifications.filter(notification => notification.type === type);
  };
  
  return (
    <div className="space-y-4 animate-fade-in">
      <Tabs defaultValue="all" className="w-full">
        {isMobile ? (
          <div className="mb-4">
            <Select defaultValue="all" onValueChange={(value) => {
              const tabTrigger = document.querySelector(`[data-value="${value}"]`) as HTMLElement;
              if (tabTrigger) tabTrigger.click();
            }}>
              <SelectTrigger className="w-full glass-card">
                <SelectValue placeholder="Filter notifications" />
              </SelectTrigger>
              <SelectContent className="bg-background border-border z-50 shadow-md">
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="message">Messages</SelectItem>
                <SelectItem value="assignment">Assignments</SelectItem>
                <SelectItem value="attendance">Attendance</SelectItem>
                <SelectItem value="schedule">Schedule</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <TabsList className="grid grid-cols-5 w-full glass-card">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="message">Messages</TabsTrigger>
            <TabsTrigger value="assignment">Assignments</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
          </TabsList>
        )}
        
        {["all", "message", "assignment", "attendance", "schedule"].map((tab) => (
          <TabsContent key={tab} value={tab} data-value={tab}>
            {getNotificationsByType(tab as any).length > 0 ? (
              <div className="space-y-3">
                {getNotificationsByType(tab as any).map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`glass-card ${
                      notification.urgent ? "glow glow-warning" : ""
                    } ${notification.read ? "opacity-70" : ""}`}
                  >
                    <CardContent className={`p-4 ${isMobile ? 'px-3 py-3' : ''}`}>
                      <div className="flex items-start gap-3">
                        <div className={`rounded-full p-2 ${
                          notification.type === "message" ? "bg-primary/10" :
                          notification.type === "assignment" ? "bg-secondary/10" :
                          notification.type === "attendance" ? "bg-destructive/10" :
                          "bg-warning/10"
                        }`}>
                          {getIcon(notification.type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{notification.title}</h4>
                              <p className={`text-sm text-muted-foreground mt-0.5 ${isMobile ? 'line-clamp-2' : ''}`}>
                                {notification.description}
                              </p>
                            </div>
                            {notification.urgent && (
                              <Badge variant="outline" className="bg-warning/20 text-warning border-warning/20">
                                Urgent
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{notification.time}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="glass-card">
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No notifications found</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
