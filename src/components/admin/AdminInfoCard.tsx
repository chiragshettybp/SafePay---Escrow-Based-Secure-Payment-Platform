import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface InfoItem {
  label: string;
  value: ReactNode;
  mono?: boolean;
  fullWidth?: boolean;
}

interface AdminInfoCardProps {
  title: string;
  icon?: ReactNode;
  items: InfoItem[];
  footer?: ReactNode;
  className?: string;
}

export function AdminInfoCard({
  title,
  icon,
  items,
  footer,
  className,
}: AdminInfoCardProps) {
  return (
    <Card className={cn("admin-card-compact", className)}>
      <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-4">
        <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2">
          {icon && <span className="text-muted-foreground">{icon}</span>}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-4 sm:pt-0">
        <div className="admin-info-grid">
          {items.map((item, index) => (
            <div
              key={index}
              className={cn(
                "admin-info-item",
                item.fullWidth && "col-span-2"
              )}
            >
              <p className="admin-info-label">{item.label}</p>
              <div
                className={cn(
                  "admin-info-value",
                  item.mono && "font-mono text-xs sm:text-sm"
                )}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
        {footer && <div className="mt-3 sm:mt-4 pt-3 border-t border-border">{footer}</div>}
      </CardContent>
    </Card>
  );
}

export default AdminInfoCard;
