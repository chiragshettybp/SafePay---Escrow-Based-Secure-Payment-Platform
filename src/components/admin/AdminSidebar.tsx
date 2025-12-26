import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Store,
  ShoppingCart,
  Wallet,
  AlertTriangle,
  Headphones,
  Settings,
  FileText,
  Shield,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Bell,
  Truck,
  Vault,
  ArrowDownToLine,
  CreditCard,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface AdminSidebarProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
  alerts?: {
    pendingKyc?: number;
    openDisputes?: number;
    pendingWithdrawals?: number;
    openTickets?: number;
  };
}

export function AdminSidebar({ isCollapsed = false, onToggle, onClose, alerts }: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const navSections: NavSection[] = [
    {
      title: "Overview",
      items: [
        { title: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { title: "Analytics", href: "/admin/analytics", icon: TrendingUp },
      ],
    },
    {
      title: "Users",
      items: [
        { title: "Customers", href: "/admin/users", icon: Users },
        { title: "Merchants", href: "/admin/merchants", icon: Store, badge: alerts?.pendingKyc },
      ],
    },
    {
      title: "Operations",
      items: [
        { title: "Orders", href: "/admin/orders", icon: ShoppingCart },
        { title: "Shipments", href: "/admin/shipments", icon: Truck },
        { title: "Payments", href: "/admin/payments", icon: Wallet },
        { title: "Payouts", href: "/admin/payouts", icon: Wallet, badge: alerts?.pendingWithdrawals },
      ],
    },
    {
      title: "Checkout",
      items: [
        { title: "Overview", href: "/admin/checkout", icon: CreditCard },
        { title: "Sessions", href: "/admin/checkout/sessions", icon: ShoppingCart },
        { title: "Gateways", href: "/admin/checkout/gateways", icon: Zap },
        { title: "Risk & Fraud", href: "/admin/checkout/risk", icon: Shield },
      ],
    },
    {
      title: "Finance",
      items: [
        { title: "Escrow", href: "/admin/escrow", icon: Vault },
        { title: "Withdrawals", href: "/admin/withdrawals", icon: ArrowDownToLine },
      ],
    },
    {
      title: "Support",
      items: [
        { title: "Disputes", href: "/admin/disputes", icon: AlertTriangle, badge: alerts?.openDisputes },
        { title: "Support Tickets", href: "/admin/support", icon: Headphones, badge: alerts?.openTickets },
        { title: "Notifications", href: "/admin/notifications", icon: Bell },
      ],
    },
    {
      title: "System",
      items: [
        { title: "System Logs", href: "/admin/logs", icon: FileText },
        { title: "Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ];

  const handleNavClick = (href: string) => {
    navigate(href);
    onClose?.();
  };

  return (
    <aside
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between p-4 border-b">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold">Admin Panel</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
            <Shield className="h-4 w-4 text-primary" />
          </div>
        )}
        {onToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn("h-8 w-8", isCollapsed && "mx-auto")}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3 sm:py-4">
        <nav className="space-y-4 sm:space-y-6 px-2">
          {navSections.map((section) => (
            <div key={section.title}>
              {!isCollapsed && (
                <h4 className="px-3 mb-1.5 sm:mb-2 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h4>
              )}
              <div className="space-y-0.5 sm:space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + "/");
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleNavClick(item.href)}
                      className={cn(
                        "w-full flex items-center gap-2.5 sm:gap-3 px-3 py-2.5 sm:py-2 rounded-lg text-sm font-medium transition-colors touch-highlight",
                        "min-h-[44px] sm:min-h-0",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted",
                        isCollapsed && "justify-center px-2"
                      )}
                      title={isCollapsed ? item.title : undefined}
                    >
                      <item.icon className="h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 text-left text-sm">{item.title}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="absolute top-0 right-0 w-2 h-2 bg-destructive rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}

export default AdminSidebar;
