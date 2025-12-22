import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  variant?: "default" | "success" | "warning" | "destructive";
  className?: string;
}

export function AdminStatCard({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
  className,
}: AdminStatCardProps) {
  const variantStyles = {
    default: "",
    success: "border-green-500/20 bg-green-500/5",
    warning: "border-yellow-500/20 bg-yellow-500/5",
    destructive: "border-destructive/20 bg-destructive/5",
  };

  const valueStyles = {
    default: "",
    success: "text-green-500",
    warning: "text-yellow-500",
    destructive: "text-destructive",
  };

  return (
    <Card className={cn("admin-card-compact", variantStyles[variant], className)}>
      <CardHeader className="pb-1 sm:pb-2 p-3 sm:p-4">
        <CardTitle className="admin-stat-label flex items-center gap-1.5 sm:gap-2 font-medium">
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span className="truncate">{title}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        <p className={cn("admin-stat-value", valueStyles[variant])}>{value}</p>
        {subtitle && (
          <p className="admin-stat-label mt-0.5">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default AdminStatCard;
