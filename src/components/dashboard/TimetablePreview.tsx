
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

interface ClassItem {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  location: string;
}

interface TimetablePreviewProps {
  todayClasses: ClassItem[];
}

export function TimetablePreview({ todayClasses }: TimetablePreviewProps) {
  const navigate = useNavigate();
  
  return (
    <Card className="glass-card overflow-hidden hover-scale">
      <CardContent className="p-6">
        <div className="flex justify-between items-center mb-4">
          <Badge variant="outline">Today's Schedule</Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs"
            onClick={() => navigate('/timetable')}
          >
            <span>View All</span>
            <ArrowRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
        
        <div className="space-y-4">
          {todayClasses.length > 0 ? (
            todayClasses.map((classItem) => (
              <div 
                key={classItem.id}
                className="flex items-center justify-between py-2 border-b border-white/[0.05] last:border-0"
              >
                <div>
                  <p className="font-medium">{classItem.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{classItem.location}</p>
                </div>
                <p className="text-sm">
                  {classItem.startTime} - {classItem.endTime}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No classes scheduled for today</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
