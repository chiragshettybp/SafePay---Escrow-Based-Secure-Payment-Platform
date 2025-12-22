import { useState, ReactNode } from "react";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { cn } from "@/lib/utils";

interface AdminLayoutProps {
  children: ReactNode;
  alerts?: {
    pendingKyc?: number;
    openDisputes?: number;
    pendingWithdrawals?: number;
    openTickets?: number;
  };
  onSearch?: (query: string) => void;
}

export function AdminLayout({ children, alerts, onSearch }: AdminLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background flex w-full">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block flex-shrink-0">
        <AdminSidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          alerts={alerts}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <AdminHeader onSearch={onSearch} alerts={alerts} />
        <main 
          className={cn(
            "flex-1 overflow-auto",
            "p-3 sm:p-4 md:p-6",
            "pb-20 lg:pb-6" // Extra padding on mobile for sticky actions
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;

