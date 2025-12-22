import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCustomerSettings } from "@/hooks/useCustomerSettings";
import { User, Shield, Bell, Lock, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const CustomerSettings = () => {
  const navigate = useNavigate();
  const { security, notificationPrefs } = useCustomerSettings();

  const settingsCards = [
    {
      id: "profile",
      title: "Profile & Account",
      description: "Manage your personal information and account details",
      icon: User,
      path: "/settings/profile",
      status: null,
    },
    {
      id: "security",
      title: "Security",
      description: "Password, two-factor authentication, and login sessions",
      icon: Shield,
      path: "/settings/security",
      status: security?.two_factor_enabled ? "2FA Enabled" : "2FA Disabled",
      statusColor: security?.two_factor_enabled ? "text-green-600" : "text-amber-600",
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Choose what notifications you receive",
      icon: Bell,
      path: "/settings/notifications",
      status: notificationPrefs ? "Configured" : "Not configured",
      statusColor: notificationPrefs ? "text-green-600" : "text-muted-foreground",
    },
    {
      id: "privacy",
      title: "Privacy & Data",
      description: "Manage your data and privacy preferences",
      icon: Lock,
      path: "/settings/privacy",
      status: null,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-4xl px-4 sm:px-6 py-4 sm:py-6">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your account settings and preferences</p>
          </div>

          <div className="grid gap-4">
            {settingsCards.map((card) => (
              <Card
                key={card.id}
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(card.path)}
              >
                <CardHeader className="flex flex-row items-center gap-4 p-4 sm:p-6">
                  <div className="p-2 sm:p-3 rounded-full bg-primary/10">
                    <card.icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base sm:text-lg">{card.title}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-0.5 line-clamp-2">
                      {card.description}
                    </CardDescription>
                    {card.status && (
                      <p className={`text-xs sm:text-sm mt-1 ${card.statusColor}`}>
                        {card.status}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </main>
      </PageTransition>
    </div>
  );
};

export default CustomerSettings;
