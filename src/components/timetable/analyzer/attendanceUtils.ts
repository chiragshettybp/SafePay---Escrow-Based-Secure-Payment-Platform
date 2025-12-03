
export const getAttendanceStatus = (percentage: number): string => {
  if (percentage >= 85) return "Excellent";
  if (percentage >= 75) return "Good";
  return "At Risk";
};

export const getStatusColor = (percentage: number): string => {
  if (percentage >= 85) return "text-success";
  if (percentage >= 75) return "text-warning";
  return "text-destructive";
};

export const getProgressColor = (percentage: number): string => {
  if (percentage >= 85) return "bg-success";
  if (percentage >= 75) return "bg-warning";
  return "bg-destructive";
};

