
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

interface AttendanceCardProps {
  overallPercentage: number;
  criticalSubject: {
    name: string;
    percentage: number;
  };
}

export function AttendanceCard({ overallPercentage, criticalSubject }: AttendanceCardProps) {
  const getColorClass = (percentage: number) => {
    if (percentage >= 85) return "bg-secondary";
    if (percentage >= 75) return "bg-warning";
    return "bg-destructive";
  };

  const getTextClass = (percentage: number) => {
    if (percentage >= 85) return "text-secondary";
    if (percentage >= 75) return "text-warning";
    return "text-destructive";
  };

  return (
    <Card className="glass-card overflow-hidden hover-scale">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <Badge variant="outline">Attendance</Badge>
          <span className={`text-xl font-bold ${getTextClass(overallPercentage)}`}>
            {overallPercentage}%
          </span>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium">Overall</p>
            </div>
            <Progress 
              value={overallPercentage} 
              className="h-2" 
              indicatorClassName={getColorClass(overallPercentage)}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium">{criticalSubject.name}</p>
              <span className={`text-xs font-medium ${getTextClass(criticalSubject.percentage)}`}>
                {criticalSubject.percentage}%
              </span>
            </div>
            <Progress 
              value={criticalSubject.percentage} 
              className="h-2" 
              indicatorClassName={getColorClass(criticalSubject.percentage)}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
