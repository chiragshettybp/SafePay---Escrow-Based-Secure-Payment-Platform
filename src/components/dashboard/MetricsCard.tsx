import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: string;
  variant?: "default" | "primary" | "success" | "warning" | "destructive";
  onClick?: () => void;
  isActive?: boolean;
}

const variantStyles = {
  default: "bg-card hover:bg-accent/50",
  primary: "bg-primary/10 border-primary/20 hover:bg-primary/20",
  success: "bg-success/10 border-success/20 hover:bg-success/20",
  warning: "bg-warning/10 border-warning/20 hover:bg-warning/20",
  destructive: "bg-destructive/10 border-destructive/20 hover:bg-destructive/20",
};

const iconStyles = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
};

export function MetricsCard({
  title,
  value,
  icon: Icon,
  trend,
  variant = "default",
  onClick,
  isActive,
}: MetricsCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "w-full p-4 sm:p-6 rounded-xl border border-border transition-all duration-200 text-left",
        variantStyles[variant],
        onClick && "cursor-pointer hover:scale-[1.02]",
        isActive && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className="text-xs text-muted-foreground">{trend}</p>
          )}
        </div>
        <div className={cn("p-2 rounded-lg bg-background/50", iconStyles[variant])}>
          <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
      </div>
    </button>
  );
}
