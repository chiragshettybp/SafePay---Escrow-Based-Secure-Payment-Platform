import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Seo } from "@/components/seo/Seo";
import { useMerchantNotificationPrefs, type NotificationPrefs } from "@/hooks/useMerchantNotifications";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import {
  ArrowLeft,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  Wallet,
  Settings,
  Bell,
  Mail,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

type PrefsKeys = Omit<NotificationPrefs, "id" | "merchant_id" | "created_at" | "updated_at">;

const categories = [
  {
    id: "order",
    label: "Orders",
    description: "New orders, status updates, confirmations",
    icon: ShoppingBag,
    color: "text-blue-500",
  },
  {
    id: "payment",
    label: "Payments",
    description: "Payment received, escrow locked, releases",
    icon: CreditCard,
    color: "text-green-500",
  },
  {
    id: "dispute",
    label: "Disputes",
    description: "New disputes, responses needed, resolutions",
    icon: AlertTriangle,
    color: "text-orange-500",
  },
  {
    id: "payout",
    label: "Payouts",
    description: "Withdrawal confirmations, failures, bank updates",
    icon: Wallet,
    color: "text-purple-500",
  },
  {
    id: "system",
    label: "System",
    description: "Maintenance, updates, announcements",
    icon: Settings,
    color: "text-muted-foreground",
  },
];

const channels = [
  { id: "in_app", label: "In-App", icon: Bell },
  { id: "email", label: "Email", icon: Mail },
  { id: "sms", label: "SMS", icon: MessageSquare },
];

export default function MerchantNotificationPreferences() {
  const { isAuthenticated, isLoading: authLoading } = useMerchantAuth();
  const { prefs, isLoading, savePrefs, isSaving } = useMerchantNotificationPrefs();

  const [localPrefs, setLocalPrefs] = useState<Partial<PrefsKeys>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local prefs when data loads
  useEffect(() => {
    if (prefs) {
      const { id, merchant_id, created_at, updated_at, ...rest } = prefs;
      setLocalPrefs(rest);
      setHasChanges(false);
    } else if (!isLoading && !prefs) {
      // Default values if no prefs exist
      setLocalPrefs({
        order_in_app: true,
        order_email: true,
        order_sms: false,
        payment_in_app: true,
        payment_email: true,
        payment_sms: false,
        dispute_in_app: true,
        dispute_email: true,
        dispute_sms: true,
        payout_in_app: true,
        payout_email: true,
        payout_sms: false,
        system_in_app: true,
        system_email: false,
        system_sms: false,
      });
    }
  }, [prefs, isLoading]);

  if (!isAuthenticated && !authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Seo
          title="Notification Preferences | Safepay"
          description="Manage your notification preferences"
          canonicalPath="/merchant/notifications/preferences"
        />
        <Card className="border-border/50 shadow-lg max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <h1 className="text-xl font-bold">Sign in required</h1>
            <p className="text-muted-foreground">Please sign in to manage preferences.</p>
            <Button asChild className="w-full">
              <Link to="/merchant/login">Go to Merchant Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const togglePref = (category: string, channel: string) => {
    const key = `${category}_${channel}` as keyof PrefsKeys;
    setLocalPrefs((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    savePrefs(localPrefs);
    setHasChanges(false);
  };

  return (
    <MerchantLayout>
      <Seo
        title="Notification Preferences | Safepay"
        description="Manage your merchant notification preferences"
        canonicalPath="/merchant/notifications/preferences"
      />

      <section className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" asChild className="gap-2">
          <Link to="/merchant/notifications">
            <ArrowLeft className="h-4 w-4" />
            Back to notifications
          </Link>
        </Button>

        <header>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Notification Preferences</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Choose how you want to be notified for each category
          </p>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <Card key={category.id} className="border-border/50">
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-3">
                    <div className={cn("p-2 rounded-lg bg-muted", category.color)}>
                      <category.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{category.label}</CardTitle>
                      <CardDescription className="text-sm">
                        {category.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {channels.map((channel) => {
                      const key = `${category.id}_${channel.id}` as keyof PrefsKeys;
                      const isEnabled = localPrefs[key] ?? false;

                      return (
                        <div
                          key={channel.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <channel.icon className="h-4 w-4 text-muted-foreground" />
                            <Label htmlFor={`${category.id}-${channel.id}`} className="text-sm">
                              {channel.label}
                            </Label>
                          </div>
                          <Switch
                            id={`${category.id}-${channel.id}`}
                            checked={isEnabled}
                            onCheckedChange={() => togglePref(category.id, channel.id)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Important notice */}
            <Card className="border-orange-500/20 bg-orange-500/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Critical alerts cannot be disabled
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You will always receive in-app notifications for disputes and urgent security
                      alerts to protect your business.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Sticky save button */}
        <div className="sticky bottom-4 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="shadow-lg"
          >
            {isSaving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </section>
    </MerchantLayout>
  );
}
