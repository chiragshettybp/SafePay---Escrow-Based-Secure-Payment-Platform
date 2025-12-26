import type React from "react";
import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useRef, useState } from "react";
import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  AlertTriangle,
  Wallet,
  Settings,
  User,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  X,
  ShoppingCart,
  Bell,
  Link2,
  BarChart3,
  Sliders,
  Code,
  CreditCard,
} from "lucide-react";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MerchantSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  onNavClick?: () => void;
  isMobile?: boolean;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  children?: { icon: React.ElementType; label: string; href: string }[];
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/merchant/dashboard" },
  { icon: ShoppingBag, label: "Orders", href: "/merchant/orders" },
  { 
    icon: ShoppingCart, 
    label: "Checkout", 
    href: "/merchant/checkout",
    children: [
      { icon: BarChart3, label: "Dashboard", href: "/merchant/checkout" },
      { icon: CreditCard, label: "Sessions", href: "/merchant/checkout/sessions" },
      { icon: Link2, label: "Payment Links", href: "/merchant/checkout/payment-links" },
      { icon: BarChart3, label: "Reports", href: "/merchant/checkout/reports" },
      { icon: Sliders, label: "Settings", href: "/merchant/checkout/settings" },
      { icon: Code, label: "Integration", href: "/merchant/checkout/integration" },
    ]
  },
  { icon: Truck, label: "Shipments", href: "/merchant/shipments" },
  { icon: AlertTriangle, label: "Disputes", href: "/merchant/disputes" },
  { icon: Wallet, label: "Payouts", href: "/merchant/payouts" },
  { icon: Bell, label: "Notifications", href: "/merchant/notifications" },
  { icon: Settings, label: "Settings", href: "/merchant/settings" },
];

export function MerchantSidebar({ isCollapsed, onToggle, onNavClick, isMobile }: MerchantSidebarProps) {
  const location = useLocation();
  const { merchant, logout } = useMerchantAuth();

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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Track which collapsible groups are open
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    // Auto-open group if current path matches
    const currentGroup = navItems.find(item => 
      item.children && (
        location.pathname === item.href || 
        location.pathname.startsWith(item.href + "/") ||
        item.children.some(child => location.pathname === child.href || location.pathname.startsWith(child.href + "/"))
      )
    );
    return currentGroup ? [currentGroup.href] : [];
  });

  const toggleGroup = (href: string) => {
    setOpenGroups(prev => 
      prev.includes(href) ? prev.filter(h => h !== href) : [...prev, href]
    );
  };

  return (
    <aside
      className={cn(
        isMobile
          ? "h-full bg-card border-r border-border flex flex-col"
          : "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!isCollapsed && (
          <Link to="/merchant/dashboard" className="flex items-center gap-2" onClick={handleNavClick}>
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SP</span>
            </div>
            <span className="font-semibold text-foreground">SafePay</span>
          </Link>
        )}
        {isMobile ? (
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-5 w-5 text-muted-foreground" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href || 
            (item.href !== "/merchant/dashboard" && !item.children && location.pathname.startsWith(item.href));
          const hasActiveChild = item.children?.some(child => 
            location.pathname === child.href || location.pathname.startsWith(child.href + "/")
          );
          const isGroupOpen = openGroups.includes(item.href);

          // If item has children, render as collapsible
          if (item.children && !isCollapsed) {
            return (
              <Collapsible 
                key={item.href} 
                open={isGroupOpen}
                onOpenChange={() => toggleGroup(item.href)}
              >
                <CollapsibleTrigger className="w-full">
                  <div
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full",
                      hasActiveChild
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <ChevronDown className={cn(
                      "h-4 w-4 transition-transform duration-200",
                      isGroupOpen && "rotate-180"
                    )} />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-4 mt-1 space-y-1">
                  {item.children.map((child) => {
                    const isChildActive = location.pathname === child.href || 
                      location.pathname.startsWith(child.href + "/");
                    return (
                      <Link
                        key={child.href}
                        to={child.href}
                        onClick={handleNavClick}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm",
                          isChildActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <child.icon className="h-4 w-4 flex-shrink-0" />
                        <span>{child.label}</span>
                      </Link>
                    );
                  })}
                </CollapsibleContent>
              </Collapsible>
            );
          }

          // Collapsed state - just show icon with tooltip-like behavior
          if (item.children && isCollapsed) {
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={handleNavClick}
                className={cn(
                  "flex items-center justify-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                  hasActiveChild
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                title={item.label}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
              </Link>
            );
          }

          // Regular nav item
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={handleNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-border">
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {merchant?.business_name ? getInitials(merchant.business_name) : "M"}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {merchant?.business_name || "Merchant"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {merchant?.email || ""}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 w-full mt-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors",
            isCollapsed && "justify-center"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
