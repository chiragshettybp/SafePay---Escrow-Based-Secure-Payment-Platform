
import { Menu, ArrowLeft, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const [title, setTitle] = useState("Dashboard");
  const isSettingsPage = location.pathname === "/settings";
  const isAccountPage = location.pathname === "/account";
  const isRootPage = location.pathname === "/";
  const isAuthPage = ["/login", "/sign-up", "/reset-password"].includes(location.pathname);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const user = localStorage.getItem("user");
    setIsLoggedIn(!!user);
  }, [location]);

  useEffect(() => {
    const pathSegments = location.pathname.split("/").filter(Boolean);
    if (pathSegments.length === 0) {
      setTitle("Dashboard");
    } else {
      const pathName = pathSegments[0];
      if (pathName === "timetable-analysis") {
        setTitle("Can you BUNK?");
      } else if (pathName === "login") {
        setTitle("Sign In");
      } else if (pathName === "sign-up") {
        setTitle("Create Account");
      } else if (pathName === "reset-password") {
        setTitle("Reset Password");
      } else if (pathName === "account") {
        setTitle("My Account");
      } else {
        setTitle(pathName.charAt(0).toUpperCase() + pathName.slice(1));
      }
    }
  }, [location]);

  const handleBack = () => {
    navigate(-1);
  };

  const menuItems = [
    { name: "Dashboard", path: "/" },
    { name: "Timetable", path: "/timetable" },
    { name: "Attendance", path: "/attendance" },
    { name: "Can you BUNK?", path: "/timetable-analysis" },
    { name: "Notifications", path: "/notifications" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-background/75 border-b border-white/[0.08] animate-fade-in">
      <div className="container flex h-16 items-center px-6">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {!isRootPage && !isAuthPage ? (
              <Button variant="ghost" size="icon" onClick={handleBack} aria-label="Go back">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            ) : (
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px]">
                  <nav className="flex flex-col gap-4 mt-8">
                    {menuItems.map((item) => (
                      <Button 
                        key={item.path} 
                        variant="ghost" 
                        className="justify-start text-lg"
                        onClick={() => navigate(item.path)}
                      >
                        {item.name}
                      </Button>
                    ))}
                    <Button 
                      variant="ghost" 
                      className="justify-start text-lg mt-4"
                      onClick={() => navigate('/settings')}
                    >
                      Settings
                    </Button>
                    {isLoggedIn ? (
                      <Button 
                        variant="ghost" 
                        className="justify-start text-lg"
                        onClick={() => navigate('/account')}
                      >
                        My Account
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        className="justify-start text-lg"
                        onClick={() => navigate('/login')}
                      >
                        Sign In
                      </Button>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
            )}
            <h1 className="text-xl font-medium tracking-tight">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {!isSettingsPage && !isAuthPage && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/settings')}
                className="text-sm font-medium"
              >
                Settings
              </Button>
            )}
            {!isAccountPage && !isAuthPage && (
              isLoggedIn ? (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => navigate('/account')}
                  className="text-sm font-medium"
                  aria-label="Account"
                >
                  <UserCircle className="h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => navigate('/login')}
                  className="text-sm font-medium"
                >
                  Sign In
                </Button>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
