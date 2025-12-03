
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TimetableData } from "@/interfaces/timetable";
import { useAttendanceAnalysis } from "./analyzer/attendanceHooks";
import { RecommendationCard } from "./analyzer/RecommendationCard";
import { AttendanceDetailsTable } from "./analyzer/AttendanceDetailsTable";

interface TimetableAnalyzerProps {
  timetableData: TimetableData | null; // Allow null for initial state
  onReset: () => void;
}

export function TimetableAnalyzer({ timetableData, onReset }: TimetableAnalyzerProps) {
  const { recommendations } = useAttendanceAnalysis(timetableData);
  const [whatIfMissed, setWhatIfMissed] = useState<Record<string, number>>({});

  const handleWhatIfChange = (subjectId: string, value: string) => {
    const numValue = parseInt(value, 10);
    setWhatIfMissed((prev) => ({
      ...prev,
      [subjectId]: isNaN(numValue) || numValue < 0 ? 0 : numValue,
    }));
  };

  if (!timetableData) {
    // Optionally, render a loading state or message if timetableData is null
    // For now, rendering nothing, assuming parent component handles this.
    // Or, if TimetableAnalyzer is always expected to have data,
    // the null check could be removed and type made non-nullable.
    // Given the useAttendanceAnalysis handles null, this is okay.
    return null; 
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-medium">Attendance Analysis</h2>
        <Button variant="outline" size="sm" onClick={onReset}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Upload
        </Button>
      </div>

      <Card className="glass-card">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4">Bunking Calendar & What-if Analysis</h3>
          <div className="space-y-6">
            {recommendations.map((rec) => (
              <RecommendationCard
                key={rec.subject.id}
                rec={rec}
                whatIfMissedValue={whatIfMissed[rec.subject.id] || 0}
                onWhatIfChange={handleWhatIfChange}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="p-6">
          <h3 className="text-lg font-medium mb-4">Attendance Details</h3>
          <AttendanceDetailsTable recommendations={recommendations} />
        </CardContent>
      </Card>
    </div>
  );
}

