import { useState, useEffect } from "react";
import { format, addDays, differenceInDays } from "date-fns";
import { Subject, TimetableData, BunkRecommendation, BunkDate } from "@/interfaces/timetable";

const generateBunkDates = (subject: Subject, canBunk: number): BunkDate[] => {
  if (canBunk <= 0 || !subject.schedule || subject.schedule.length === 0) return [];

  const today = new Date();
  const dayMap: Record<string, number> = {
    "Monday": 1, "Tuesday": 2, "Wednesday": 3,
    "Thursday": 4, "Friday": 5, "Saturday": 6, "Sunday": 0
  };

  // Sort schedule by closest upcoming class day
  const sortedSchedule = [...subject.schedule].sort((a, b) => {
    const dayA = dayMap[a.day];
    const dayB = dayMap[b.day];
    const todayDay = today.getDay();
    
    // Calculate days until next occurrence of this class day
    let daysUntilA = (dayA - todayDay + 7) % 7;
    let daysUntilB = (dayB - todayDay + 7) % 7;
    
    // If the day is today, we want to check if the time has already passed
    if (daysUntilA === 0) daysUntilA = 7;
    if (daysUntilB === 0) daysUntilB = 7;
    
    return daysUntilA - daysUntilB;
  });

  const bunkDates: BunkDate[] = [];
  let classesAdded = 0;
  
  // Generate next available dates for classes
  let currentDate = new Date(today);
  
  while (classesAdded < canBunk) {
    for (const scheduleItem of sortedSchedule) {
      if (classesAdded >= canBunk) break;
      
      const targetDay = dayMap[scheduleItem.day];
      const currentDay = currentDate.getDay();
      
      // Calculate days until next occurrence of this class
      let daysUntil = (targetDay - currentDay + 7) % 7;
      
      // If it's 0, it means it's today, but we want future dates, so make it 7 days later
      if (daysUntil === 0) daysUntil = 7;
      
      // Calculate the next date this class occurs
      const nextClassDate = addDays(currentDate, daysUntil);
      
      bunkDates.push({
        day: scheduleItem.day,
        date: format(nextClassDate, "dd MMM yyyy"),
        time: scheduleItem.time
      });
      
      classesAdded++;
    }
    
    // Move to the next week
    currentDate = addDays(currentDate, 7);
    
    // Safety check to prevent infinite loops
    if (differenceInDays(currentDate, today) > 365) break;
  }
  
  return bunkDates.slice(0, canBunk);
};

export const useAttendanceAnalysis = (timetableData: TimetableData | null) => {
  const [recommendations, setRecommendations] = useState<BunkRecommendation[]>([]);

  useEffect(() => {
    if (!timetableData) {
      setRecommendations([]);
      return;
    }

    const results = timetableData.subjects.map(subject => {
      const { present, total } = subject;
      const currentPercentage = total > 0 ? Math.round((present / total) * 100) : 0;
      
      const minimumRequiredClassesTotal = Math.ceil(total * 0.75); // Based on current total
      const classesThatCanBeMissed = present - minimumRequiredClassesTotal;
      
      const canBunk = classesThatCanBeMissed > 0 ? classesThatCanBeMissed : 0;
      const bunkDates = generateBunkDates(subject, canBunk);
      
      return {
        subject,
        canBunk,
        bunkDates,
        currentPercentage,
        minRequiredClasses: minimumRequiredClassesTotal
      };
    });
    setRecommendations(results);
  }, [timetableData]);

  return { recommendations };
};
