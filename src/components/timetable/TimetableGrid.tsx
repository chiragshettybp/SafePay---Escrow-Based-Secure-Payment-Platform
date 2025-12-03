
import { useState } from "react";
import { format, addDays } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClassCard } from "./ClassCard";

interface ClassItem {
  id: string;
  subject: string;
  startTime: string;
  endTime: string;
  location: string;
  professorName: string;
}

interface DaySchedule {
  date: Date;
  classes: ClassItem[];
}

// Mock data generator for demo purposes
const generateWeekSchedule = (startDate: Date): DaySchedule[] => {
  const weekSchedule: DaySchedule[] = [];
  const subjects = [
    "Mathematics",
    "Physics",
    "Computer Science",
    "Chemistry",
    "Biology",
    "Literature",
    "History"
  ];
  const locations = ["Room 101", "Lab 202", "Hall A", "Room 345", "Lab 123"];
  const professors = [
    "Dr. Smith",
    "Prof. Johnson",
    "Dr. Williams",
    "Prof. Davis",
    "Dr. Miller"
  ];
  
  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(startDate, i);
    const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6;
    
    const classes: ClassItem[] = [];
    // Don't generate classes for weekends
    if (!isWeekend) {
      const numClasses = Math.floor(Math.random() * 3) + 1; // 1 to 3 classes
      
      for (let j = 0; j < numClasses; j++) {
        const startHour = 9 + j * 2; // Classes start at 9, 11, 13
        const endHour = startHour + 1;
        
        classes.push({
          id: `class-${i}-${j}`,
          subject: subjects[Math.floor(Math.random() * subjects.length)],
          startTime: `${startHour}:00`,
          endTime: `${endHour}:00`,
          location: locations[Math.floor(Math.random() * locations.length)],
          professorName: professors[Math.floor(Math.random() * professors.length)]
        });
      }
    }
    
    weekSchedule.push({
      date: currentDate,
      classes
    });
  }
  
  return weekSchedule;
};

export function TimetableGrid() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekSchedule, setWeekSchedule] = useState(() => generateWeekSchedule(currentDate));
  
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? addDays(currentDate, -7) 
      : addDays(currentDate, 7);
    
    setCurrentDate(newDate);
    setWeekSchedule(generateWeekSchedule(newDate));
  };
  
  const getDayLabel = (date: Date) => {
    const today = new Date();
    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      return "Today";
    }
    
    const tomorrow = addDays(today, 1);
    if (
      date.getDate() === tomorrow.getDate() &&
      date.getMonth() === tomorrow.getMonth() &&
      date.getFullYear() === tomorrow.getFullYear()
    ) {
      return "Tomorrow";
    }
    
    return format(date, "EEE");
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium">{format(currentDate, "MMMM yyyy")}</h2>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigateWeek('prev')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigateWeek('next')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekSchedule.map((day, index) => (
          <Card 
            key={index} 
            className={`glass-card overflow-hidden ${
              getDayLabel(day.date) === "Today" ? "glow glow-primary" : ""
            }`}
          >
            <CardContent className="p-4">
              <div className="text-center mb-3 pb-2 border-b border-white/[0.05]">
                <p className="text-sm font-medium">
                  {getDayLabel(day.date)} {format(day.date, "d")}
                </p>
              </div>
              
              <div className="space-y-2">
                {day.classes.length > 0 ? (
                  day.classes.map((classItem) => (
                    <ClassCard key={classItem.id} classItem={classItem} />
                  ))
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-muted-foreground">No classes</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
