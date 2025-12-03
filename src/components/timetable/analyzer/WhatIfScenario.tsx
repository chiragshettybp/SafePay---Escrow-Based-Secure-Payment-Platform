
import { Input } from "@/components/ui/input";
import { HelpCircle } from "lucide-react";
import { getStatusColor } from "./attendanceUtils";

interface WhatIfScenarioProps {
  subjectId: string;
  currentPresent: number;
  currentTotal: number;
  whatIfMissedValue: number;
  onWhatIfChange: (subjectId: string, value: string) => void;
}

export function WhatIfScenario({
  subjectId,
  currentPresent,
  currentTotal,
  whatIfMissedValue,
  onWhatIfChange,
}: WhatIfScenarioProps) {
  const missedIfAny = whatIfMissedValue || 0;
  const projectedTotalClasses = currentTotal + missedIfAny;
  const projectedPercentage =
    projectedTotalClasses > 0
      ? Math.round((currentPresent / projectedTotalClasses) * 100)
      : 0;

  return (
    <div className="mt-4 p-3 bg-primary/5 rounded-md">
      <div className="flex items-center gap-2 mb-2">
        <HelpCircle className="h-4 w-4 text-primary/80" />
        <h5 className="text-sm font-medium">"What If" Scenario</h5>
      </div>
      <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          If I miss an additional:
        </p>
        <Input
          type="number"
          min="0"
          value={whatIfMissedValue || ""}
          onChange={(e) => onWhatIfChange(subjectId, e.target.value)}
          className="h-8 w-20 text-xs bg-background border-white/10"
          placeholder="0"
        />
        <p className="text-xs text-muted-foreground">classes...</p>
      </div>
      {missedIfAny > 0 && (
        <div className="mt-2 text-xs">
          Projected Attendance:{" "}
          <span className={`font-bold ${getStatusColor(projectedPercentage)}`}>
            {projectedPercentage}%
          </span>
          <span className="text-muted-foreground ml-1">
            ({currentPresent}/{projectedTotalClasses})
          </span>
        </div>
      )}
    </div>
  );
}

