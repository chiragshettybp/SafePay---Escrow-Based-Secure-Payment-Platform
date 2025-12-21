import type React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Wallet,
  Settings,
  HelpCircle,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  Plus,
  AlertTriangle,
  RotateCcw,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

interface DashboardSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onNavClick?: () => void;
  isMobile?: boolean;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Plus, label: "New Payment", href: "/payment/new", highlight: true },
  { icon: ShoppingBag, label: "Orders", href: "/orders" },
  { icon: AlertTriangle, label: "Disputes", href: "/disputes" },
  { icon: RotateCcw, label: "Refunds", href: "/refunds" },
  { icon: Wallet, label: "Wallet", href: "/wallet" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: HelpCircle, label: "Support", href: "/support" },
];

export function DashboardSidebar({ isCollapsed, onToggle, onNavClick, isMobile }: DashboardSidebarProps) {
  const location = useLocation();
  const { logout, profile } = useSupabaseAuth();

  // Swipe-left to close (mobile)
  const touchStart = useRef({ x: 0, y: 0 });
  const touchLast = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
    touchLast.current = { x: t.clientX, y: t.clientY };
    hasMoved.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    touchLast.current = { x: t.clientX, y: t.clientY };
    hasMoved.current = true;
  };

  const handleTouchEnd = () => {
    if (!isMobile || !onNavClick || !hasMoved.current) return;

    const dx = touchStart.current.x - touchLast.current.x;
    const dy = touchStart.current.y - touchLast.current.y;

    // Close only on a clear left-swipe (avoid closing on taps/scroll)
    if (dx > 60 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      onNavClick();
    }
  };

  const handleNavClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onNavClick) {
      onNavClick();
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onNavClick) {
      onNavClick();
    }
  };

  return (
    <aside
      className={cn(
        isMobile
          ? "h-full bg-card border-r border-border flex flex-col"
          : "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        {!isCollapsed && (
          <Link to="/dashboard" className="flex items-center gap-2" onClick={handleNavClick}>
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold text-foreground">SafePay</span>
          </Link>
        )}
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-muted-foreground hover:text-foreground"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href === "/payment/new" && location.pathname.startsWith("/payment"));
          const isHighlight = 'highlight' in item && item.highlight;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : isHighlight
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User & Logout */}
      <div className="p-4 border-t border-border">
        {!isCollapsed && profile && (
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-foreground truncate">
              {profile.full_name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">Customer</p>
          </div>
        )}
        <Button
          variant="ghost"
          onClick={logout}
          className={cn(
            "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10",
            isCollapsed ? "justify-center px-0" : "justify-start"
          )}
        >
          <LogOut className="h-5 w-5" />
          {!isCollapsed && <span className="ml-3">Logout</span>}
        </Button>
      </div>
    </aside>
  );
}
