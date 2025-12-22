import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileCheck,
  Wallet,
  AlertTriangle,
  Bell,
  FileText,
  ChevronRight,
} from "lucide-react";

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: number;
}

interface AdminQuickActionsProps {
  pendingKyc?: number;
  pendingWithdrawals?: number;
  openDisputes?: number;
}

export function AdminQuickActions({
  pendingKyc = 0,
  pendingWithdrawals = 0,
  openDisputes = 0,
}: AdminQuickActionsProps) {
  const navigate = useNavigate();

  const actions: QuickAction[] = [
    {
      title: "Review Pending KYCs",
      description: "Verify merchant documents",
      icon: FileCheck,
      href: "/admin/merchants?filter=pending_kyc",
      badge: pendingKyc,
    },
    {
      title: "Process Withdrawals",
      description: "Approve payout requests",
      icon: Wallet,
      href: "/admin/withdrawals",
      badge: pendingWithdrawals,
    },
    {
      title: "Resolve Disputes",
      description: "Handle customer issues",
      icon: AlertTriangle,
      href: "/admin/disputes",
      badge: openDisputes,
    },
    {
      title: "Send Notifications",
      description: "Broadcast to users",
      icon: Bell,
      href: "/admin/notifications/create",
    },
    {
      title: "View System Logs",
      description: "Monitor activity",
      icon: FileText,
      href: "/admin/logs",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {actions.map((action) => (
            <button
              key={action.href}
              onClick={() => navigate(action.href)}
              className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <action.icon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{action.title}</p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
              {action.badge !== undefined && action.badge > 0 && (
                <span className="bg-destructive text-destructive-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                  {action.badge}
                </span>
              )}
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default AdminQuickActions;
