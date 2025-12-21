import { useState } from "react";
import { Bell, Menu, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";

interface MerchantHeaderProps {
  onMenuClick: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  unreadCount?: number;
}

export function MerchantHeader({
  onMenuClick,
  searchQuery = "",
  onSearchChange,
  unreadCount = 0,
}: MerchantHeaderProps) {
  const { merchant, logout } = useMerchantAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between h-16 px-4 lg:px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      {/* Left Section */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg hover:bg-accent transition-colors lg:hidden"
        >
          <Menu className="h-5 w-5 text-foreground" />
        </button>

        {/* Desktop Search */}
        <div className="hidden md:flex items-center relative">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="w-64 pl-9 bg-muted/50 border-0 focus-visible:ring-1"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {/* Mobile Search Toggle */}
        <button
          onClick={() => setIsSearchOpen(!isSearchOpen)}
          className="p-2 rounded-lg hover:bg-accent transition-colors md:hidden"
        >
          {isSearchOpen ? (
            <X className="h-5 w-5 text-foreground" />
          ) : (
            <Search className="h-5 w-5 text-foreground" />
          )}
        </button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-lg hover:bg-accent transition-colors">
              <Bell className="h-5 w-5 text-foreground" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[10px]"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <div className="p-3 border-b border-border">
              <p className="font-medium text-sm">Notifications</p>
            </div>
            <div className="p-3 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarImage src={undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {merchant?.business_name ? getInitials(merchant.business_name) : "M"}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link to="/merchant/profile" className="cursor-pointer">
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/merchant/settings" className="cursor-pointer">
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive cursor-pointer"
            >
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile Search Bar */}
      {isSearchOpen && (
        <div className="absolute left-0 right-0 top-16 p-4 bg-background border-b border-border md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="w-full pl-9"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
