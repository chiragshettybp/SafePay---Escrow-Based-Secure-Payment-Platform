import { useLocation, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
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
  LogOut,
} from "lucide-react";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface MerchantSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/merchant/dashboard" },
  { icon: ShoppingBag, label: "Orders", href: "/merchant/orders" },
  { icon: Truck, label: "Shipments", href: "/merchant/shipments" },
  { icon: AlertTriangle, label: "Disputes", href: "/merchant/disputes" },
  { icon: Wallet, label: "Payouts", href: "/merchant/payouts" },
  { icon: User, label: "Profile", href: "/merchant/profile" },
  { icon: Settings, label: "Settings", href: "/merchant/settings" },
];

export function MerchantSidebar({ isCollapsed, onToggle }: MerchantSidebarProps) {
  const location = useLocation();
  const { merchant, logout } = useMerchantAuth();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-card border-r border-border transition-all duration-300",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo Section */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-border">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SP</span>
            </div>
            <span className="font-semibold text-foreground">SafePay</span>
          </div>
        )}
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
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
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
            <AvatarImage src={merchant?.logo_url || undefined} />
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
