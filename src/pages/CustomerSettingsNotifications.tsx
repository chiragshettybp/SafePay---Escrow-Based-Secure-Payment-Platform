import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, ShoppingBag, CreditCard, AlertTriangle, RefreshCw, Settings } from "lucide-react";
import { useCustomerSettings, UserNotificationPrefs } from "@/hooks/useCustomerSettings";

const CustomerSettingsNotifications = () => {
  const navigate = useNavigate();
  const { notificationPrefs, notificationPrefsLoading, updateNotificationPrefs } = useCustomerSettings();

  const [prefs, setPrefs] = useState<Partial<UserNotificationPrefs>>({
    order_in_app: true,
    order_email: true,
    order_sms: false,
    payment_in_app: true,
    payment_email: true,
    payment_sms: false,
    dispute_in_app: true,
    dispute_email: true,
    dispute_sms: true,
    refund_in_app: true,
    refund_email: true,
    refund_sms: false,
    system_in_app: true,
    system_email: false,
    system_sms: false,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (notificationPrefs) {
      setPrefs(notificationPrefs);
    }
  }, [notificationPrefs]);

  const handleToggle = (key: keyof UserNotificationPrefs, value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateNotificationPrefs.mutate(prefs, {
      onSuccess: () => setHasChanges(false),
    });
  };

  const categories = [
    {
      id: "order",
      title: "Order Updates",
      description: "Get notified about order status changes",
      icon: ShoppingBag,
      keys: ["order_in_app", "order_email", "order_sms"] as const,
    },
    {
      id: "payment",
      title: "Payment & Escrow",
      description: "Payment confirmations and escrow updates",
      icon: CreditCard,
      keys: ["payment_in_app", "payment_email", "payment_sms"] as const,
    },
    {
      id: "dispute",
      title: "Disputes",
      description: "Dispute status and resolution updates",
      icon: AlertTriangle,
      keys: ["dispute_in_app", "dispute_email", "dispute_sms"] as const,
    },
    {
      id: "refund",
      title: "Refunds",
      description: "Refund processing and completion",
      icon: RefreshCw,
      keys: ["refund_in_app", "refund_email", "refund_sms"] as const,
    },
    {
      id: "system",
      title: "System Alerts",
      description: "Important system notifications",
      icon: Settings,
      keys: ["system_in_app", "system_email", "system_sms"] as const,
    },
  ];

  if (notificationPrefsLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-2xl px-4 sm:px-6 py-4 sm:py-6 pb-24 sm:pb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/settings")}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Settings
          </Button>

          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground mt-1">
              Choose what notifications you receive
            </p>
          </div>

          <div className="space-y-4">
            {categories.map((category) => (
              <Card key={category.id}>
                <CardHeader className="p-4 sm:p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <category.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{category.title}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm">
                        {category.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-muted-foreground">In-App</span>
                      <Switch
                        checked={prefs[category.keys[0]] || false}
                        onCheckedChange={(v) => handleToggle(category.keys[0], v)}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-muted-foreground">Email</span>
                      <Switch
                        checked={prefs[category.keys[1]] || false}
                        onCheckedChange={(v) => handleToggle(category.keys[1], v)}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-xs text-muted-foreground">SMS</span>
                      <Switch
                        checked={prefs[category.keys[2]] || false}
                        onCheckedChange={(v) => handleToggle(category.keys[2], v)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Sticky Save Button for Mobile */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t sm:hidden">
            <Button
              className="w-full"
              onClick={handleSave}
              disabled={!hasChanges || updateNotificationPrefs.isPending}
            >
              {updateNotificationPrefs.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>

          {/* Desktop Save Button */}
          <div className="hidden sm:flex justify-end mt-6">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateNotificationPrefs.isPending}
            >
              {updateNotificationPrefs.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </main>
      </PageTransition>
    </div>
  );
};

export default CustomerSettingsNotifications;
