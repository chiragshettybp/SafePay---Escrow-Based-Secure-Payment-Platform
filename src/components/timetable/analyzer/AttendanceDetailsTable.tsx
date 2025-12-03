
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BunkRecommendation } from "@/interfaces/timetable";

interface AttendanceDetailsTableProps {
  recommendations: BunkRecommendation[];
}

export function AttendanceDetailsTable({ recommendations }: AttendanceDetailsTableProps) {
  if (!recommendations || recommendations.length === 0) {
    return <p className="text-muted-foreground">No attendance data to display.</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Current</TableHead>
          <TableHead>Can Skip</TableHead>
          <TableHead>Min. Required</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recommendations.map((rec) => (
          <TableRow key={rec.subject.id}>
            <TableCell className="font-medium">{rec.subject.name}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <span>{rec.currentPercentage}%</span>
                <span className="text-xs text-muted-foreground">
                  ({rec.subject.present}/{rec.subject.total})
                </span>
              </div>
            </TableCell>
            <TableCell className={rec.canBunk > 0 ? "text-success" : "text-destructive"}>
              {rec.canBunk}
            </TableCell>
            <TableCell>
              <span className="text-xs">{rec.minRequiredClasses} classes</span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

