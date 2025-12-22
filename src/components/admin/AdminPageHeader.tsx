import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  backUrl?: string;
  backLabel?: string;
  actions?: ReactNode;
  badge?: ReactNode;
}

export function AdminPageHeader({
  title,
  subtitle,
  backUrl,
  backLabel = "Back",
  actions,
  badge,
}: AdminPageHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-3 sm:space-y-4">
      {backUrl && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(backUrl)}
          className="admin-back-btn -ml-2 h-9 px-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          <span className="text-sm">{backLabel}</span>
        </Button>
      )}
      
      <div className="admin-page-header">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="admin-page-title">{title}</h1>
            {badge}
          </div>
          {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPageHeader;
