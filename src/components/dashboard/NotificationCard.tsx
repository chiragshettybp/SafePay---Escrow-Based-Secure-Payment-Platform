
import { Bell, File } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NotificationCardProps {
  assignmentTitle: string;
  dueDate: string;
  daysLeft: number;
  courseCode: string;
}

export function NotificationCard({
  assignmentTitle,
  dueDate,
  daysLeft,
  courseCode
}: NotificationCardProps) {
  const isUrgent = daysLeft <= 2;
  
  return (
    <Card className={`glass-card overflow-hidden hover-scale ${isUrgent ? 'glow glow-warning' : ''}`}>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <Badge variant="outline" className="mb-3">Assignment Due</Badge>
          {isUrgent && (
            <div className="flex items-center gap-1.5 text-xs bg-warning/20 text-warning px-2 py-1 rounded-full">
              <Bell className="h-3 w-3" />
              <span>Urgent</span>
            </div>
          )}
        </div>
        
        <div className="flex items-start gap-3">
          <div className="bg-primary/10 p-2 rounded-lg">
            <File className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-gradient-secondary">{assignmentTitle}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{courseCode}</p>
          </div>
        </div>
        
        <div className="flex justify-between mt-4">
          <div>
            <p className="text-xs text-muted-foreground">Due Date</p>
            <p className="text-sm font-medium">{dueDate}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Time Left</p>
            <p className="text-sm font-medium">
              {daysLeft === 0 ? (
                <span className="text-destructive">Due today</span>
              ) : daysLeft === 1 ? (
                <span className="text-warning">Tomorrow</span>
              ) : (
                <span>{daysLeft} days</span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
