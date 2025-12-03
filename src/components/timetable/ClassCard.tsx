
import { MapPin, Clock } from "lucide-react";

interface ClassItem {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  location: string;
  professorName: string;
}

interface ClassCardProps {
  classItem: ClassItem;
}

export function ClassCard({ classItem }: ClassCardProps) {
  return (
    <div className="p-3 bg-white/[0.02] rounded-lg border border-white/[0.03] hover-scale">
      <h3 className="font-medium text-sm">{classItem.subject}</h3>
      <p className="text-xs text-muted-foreground mt-0.5">{classItem.professorName}</p>
      
      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>{classItem.startTime} - {classItem.endTime}</span>
      </div>
      
      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
        <MapPin className="h-3 w-3" />
        <span>{classItem.location}</span>
      </div>
    </div>
  );
}
