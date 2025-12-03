
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  present: number;
  total: number;
}

interface SubjectAttendanceProps {
  subjects: Subject[];
}

export function SubjectAttendance({ subjects }: SubjectAttendanceProps) {
  const getAttendanceStatusIcon = (percentage: number) => {
    if (percentage >= 85) {
      return <CheckCircle className="h-4 w-4 text-success" />;
    } else if (percentage >= 75) {
      return <AlertCircle className="h-4 w-4 text-warning" />;
    } else {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };
  
  const getColorClass = (percentage: number) => {
    if (percentage >= 85) return "bg-success";
    if (percentage >= 75) return "bg-warning";
    return "bg-destructive";
  };
  
  return (
    <Card className="glass-card w-full">
      <CardContent className="p-6">
        <h3 className="text-lg font-medium mb-4">Subject-wise Attendance</h3>
        
        <div className="space-y-5">
          {subjects.map((subject) => {
            const percentage = Math.round((subject.present / subject.total) * 100);
            
            return (
              <div key={subject.id}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    {getAttendanceStatusIcon(percentage)}
                    <span className="font-medium">{subject.name}</span>
                  </div>
                  <span className="text-sm">{percentage}%</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <Progress
                    value={percentage}
                    className="h-2 flex-1"
                    indicatorClassName={getColorClass(percentage)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {subject.present}/{subject.total}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
