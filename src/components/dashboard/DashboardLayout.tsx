import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSwipeLeftClose } from "@/hooks/useSwipeLeftClose";
import { Loader2 } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function DashboardLayout({ children, searchQuery = "", onSearchChange }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/customer-login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  // If navigation happens, always close the mobile drawer (prevents "stuck open" state)
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  // Must be declared before any early return to keep hooks order stable
  const mobileSwipe = useSwipeLeftClose({
    enabled: mobileSidebarOpen,
    onClose: () => setMobileSidebarOpen(false),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <DashboardSidebar
          isCollapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div
        {...mobileSwipe}
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 touch-pan-y lg:hidden transition-transform duration-300",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <DashboardSidebar
          isCollapsed={false}
          onToggle={() => setMobileSidebarOpen(false)}
          onNavClick={() => setMobileSidebarOpen(false)}
          isMobile={true}
        />
      </div>

      {/* Main Content */}
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        <DashboardHeader
          onMenuClick={() => setMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange || (() => {})}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
