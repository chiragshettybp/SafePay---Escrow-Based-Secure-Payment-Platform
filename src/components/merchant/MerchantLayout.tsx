import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { MerchantSidebar } from "./MerchantSidebar";
import { MerchantHeader } from "./MerchantHeader";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { Loader2 } from "lucide-react";

interface MerchantLayoutProps {
  children: React.ReactNode;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function MerchantLayout({
  children,
  searchQuery = "",
  onSearchChange,
}: MerchantLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading, isMerchant } = useMerchantAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        navigate("/merchant/login");
      } else if (!isMerchant) {
        navigate("/merchant/login");
      }
    }
  }, [isAuthenticated, isLoading, isMerchant, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !isMerchant) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <MerchantSidebar
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
        className={cn(
          "fixed inset-y-0 left-0 z-40 lg:hidden transition-transform duration-300",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <MerchantSidebar
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
        <MerchantHeader
          onMenuClick={() => setMobileSidebarOpen(true)}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange || (() => {})}
        />
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
