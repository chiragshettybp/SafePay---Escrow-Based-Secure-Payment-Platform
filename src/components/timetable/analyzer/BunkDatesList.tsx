
import { Calendar, Clock, CalendarDays } from "lucide-react";
import { BunkDate } from "@/interfaces/timetable";

interface BunkDatesListProps {
  bunkDates: BunkDate[];
  subjectId: string;
}

export function BunkDatesList({ bunkDates, subjectId }: BunkDatesListProps) {
  if (!bunkDates || bunkDates.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
        <CalendarDays className="h-3.5 w-3.5" />
        <span>Recommended dates to skip (based on current attendance):</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {bunkDates.map((date, index) => (
          <div
            key={`${subjectId}-date-${index}`}
            className="flex items-center gap-2 text-xs bg-primary/5 p-2 rounded"
          >
            <Calendar className="h-3.5 w-3.5 text-primary/80" />
            <span className="font-medium">{date.date}</span>
            <span className="text-muted-foreground">({date.day})</span>
            <Clock className="h-3.5 w-3.5 ml-auto text-primary/80" />
            <span>{date.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

