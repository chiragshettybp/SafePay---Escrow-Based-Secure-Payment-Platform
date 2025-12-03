
import { Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface NextClassProps {
  subject: string;
  location: string;
  startTime: string;
  endTime: string;
  timeLeft: string;
  professorName: string;
}

export function NextClass({ 
  subject, 
  location, 
  startTime, 
  endTime, 
  timeLeft,
  professorName 
}: NextClassProps) {
  return (
    <Card className="glass-card overflow-hidden hover-scale">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <Badge variant="outline" className="mb-3">Next Class</Badge>
            <h3 className="text-2xl font-bold text-gradient">{subject}</h3>
            <p className="text-sm text-muted-foreground mt-1">{professorName}</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-full">
            <Clock className="h-3.5 w-3.5" />
            <span className="font-medium">{timeLeft}</span>
          </div>
        </div>
        
        <div className="flex justify-between mt-6">
          <div>
            <p className="text-xs text-muted-foreground">Location</p>
            <p className="text-sm font-medium">{location}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Time</p>
            <p className="text-sm font-medium">{startTime} - {endTime}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
