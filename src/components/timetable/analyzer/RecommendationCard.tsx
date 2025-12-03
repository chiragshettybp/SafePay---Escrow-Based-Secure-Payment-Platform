
import { Progress } from "@/components/ui/progress";
import { ThumbsUp, AlertTriangle } from "lucide-react";
import { BunkRecommendation } from "@/interfaces/timetable";
import { getAttendanceStatus, getStatusColor, getProgressColor } from "./attendanceUtils";
import { WhatIfScenario } from "./WhatIfScenario";
import { BunkDatesList } from "./BunkDatesList";

interface RecommendationCardProps {
  rec: BunkRecommendation;
  whatIfMissedValue: number;
  onWhatIfChange: (subjectId: string, value: string) => void;
}

export function RecommendationCard({ rec, whatIfMissedValue, onWhatIfChange }: RecommendationCardProps) {
  const { subject, canBunk, bunkDates, currentPercentage } = rec;

  return (
    <div className="border border-white/10 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-medium">{subject.name}</h4>
          <div className="flex items-center mt-1">
            <span className="text-xs text-muted-foreground mr-2">
              Current: {subject.present}/{subject.total} ({currentPercentage}%)
            </span>
            <span className={`text-xs font-medium ${getStatusColor(currentPercentage)}`}>
              {getAttendanceStatus(currentPercentage)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-background px-2 py-1 rounded text-xs">
          {canBunk > 0 ? (
            <>
              <ThumbsUp className="h-3.5 w-3.5 text-success" />
              <span>Can bunk {canBunk} classes</span>
            </>
          ) : (
            <>
              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
              <span>Cannot bunk any classes</span>
            </>
          )}
        </div>
      </div>

      <Progress
        value={currentPercentage}
        className="h-2 mb-3"
        indicatorClassName={getProgressColor(currentPercentage)}
      />

      <WhatIfScenario
        subjectId={subject.id}
        currentPresent={subject.present}
        currentTotal={subject.total}
        whatIfMissedValue={whatIfMissedValue}
        onWhatIfChange={onWhatIfChange}
      />

      {canBunk > 0 && <BunkDatesList bunkDates={bunkDates} subjectId={subject.id} />}
    </div>
  );
}

