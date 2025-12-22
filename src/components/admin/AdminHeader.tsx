import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, Menu, LogOut, User, Bell, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AdminSidebar } from "./AdminSidebar";

interface AdminHeaderProps {
  onSearch?: (query: string) => void;
  alerts?: {
    pendingKyc?: number;
    openDisputes?: number;
    pendingWithdrawals?: number;
    openTickets?: number;
  };
}

export function AdminHeader({ onSearch, alerts }: AdminHeaderProps) {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login", { replace: true });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const totalAlerts =
    (alerts?.pendingKyc || 0) +
    (alerts?.openDisputes || 0) +
    (alerts?.pendingWithdrawals || 0) +
    (alerts?.openTickets || 0);

  return (
    <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur-sm">
      <div className="flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-3 sm:px-4">
        {/* Mobile Menu */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden h-10 w-10 flex-shrink-0"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px] sm:w-72">
            <AdminSidebar alerts={alerts} onClose={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        {/* Page Title - Hidden on mobile to save space */}
        <h1 className="text-base sm:text-lg font-semibold hidden md:block flex-shrink-0">
          Admin Panel
        </h1>

        {/* Search - Grows to fill space */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 sm:pl-9 w-full h-9 sm:h-10 text-sm"
            />
          </div>
        </form>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-9 w-9 sm:h-10 sm:w-10"
          >
            <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            {totalAlerts > 0 && (
              <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 bg-destructive text-destructive-foreground text-[10px] sm:text-xs font-bold w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center">
                {totalAlerts > 9 ? "9+" : totalAlerts}
              </span>
            )}
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-1.5 sm:gap-2 h-9 sm:h-10 px-2 sm:px-3">
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm">
                    {user?.email?.charAt(0).toUpperCase() || "A"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-sm font-medium max-w-[100px] truncate">
                  {user?.email?.split("@")[0] || "Admin"}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm">Admin Account</span>
                  <span className="text-xs font-normal text-muted-foreground truncate">
                    {user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/admin/settings")} className="h-10">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive h-10">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

export default AdminHeader;
