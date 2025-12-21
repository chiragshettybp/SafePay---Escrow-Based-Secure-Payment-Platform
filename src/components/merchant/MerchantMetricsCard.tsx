import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MerchantMetricsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "primary" | "success" | "warning" | "destructive" | "info";
  onClick?: () => void;
  isActive?: boolean;
  subtitle?: string;
}

const variantStyles = {
  default: "bg-card hover:bg-accent/50",
  primary: "bg-primary/10 border-primary/20 hover:bg-primary/20",
  success: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20",
  warning: "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20",
  destructive: "bg-destructive/10 border-destructive/20 hover:bg-destructive/20",
  info: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20",
};

const iconStyles = {
  default: "text-foreground",
  primary: "text-primary",
  success: "text-emerald-500",
  warning: "text-amber-500",
  destructive: "text-destructive",
  info: "text-blue-500",
};

export function MerchantMetricsCard({
  title,
  value,
  icon: Icon,
  variant = "default",
  onClick,
  isActive,
  subtitle,
}: MerchantMetricsCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={cn(
        "w-full p-4 rounded-xl border border-border transition-all duration-200 text-left",
        variantStyles[variant],
        onClick && "cursor-pointer hover:scale-[1.02]",
        isActive && "ring-2 ring-primary"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs sm:text-sm text-muted-foreground">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div className={cn("p-2 rounded-lg bg-background/50", iconStyles[variant])}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
    </button>
  );
}
