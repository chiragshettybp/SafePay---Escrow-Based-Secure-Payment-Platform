import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Loader2, Eye, EyeOff, Shield, LogOut } from "lucide-react";
import { useCustomerSettings } from "@/hooks/useCustomerSettings";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const CustomerSettingsSecurity = () => {
  const navigate = useNavigate();
  const { security, securityLoading, updateSecurity, changePassword } = useCustomerSettings();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    changePassword.mutate(
      { newPassword: passwordForm.newPassword },
      {
        onSuccess: () => {
          setPasswordForm({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        },
      }
    );
  };

  const handleToggle2FA = (enabled: boolean) => {
    updateSecurity.mutate({ two_factor_enabled: enabled });
  };

  const handleLogoutAll = async () => {
    try {
      await supabase.auth.signOut({ scope: "global" });
      toast.success("Logged out from all devices");
      navigate("/customer-login");
    } catch (error) {
      toast.error("Failed to logout from all devices");
    }
  };

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
            <h1 className="text-2xl sm:text-3xl font-bold">Security</h1>
            <p className="text-muted-foreground mt-1">
              Your account is secured using your phone number. Password is optional.
            </p>
          </div>

          <div className="space-y-6">
            {/* Set/Change Password */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg">Set Password (Optional)</CardTitle>
                <CardDescription>
                  Add a password for extra security. This is optional as your phone number is your primary login.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handlePasswordChange}
                  disabled={
                    !passwordForm.newPassword ||
                    !passwordForm.confirmPassword ||
                    changePassword.isPending
                  }
                  className="w-full sm:w-auto"
                >
                  {changePassword.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>

                {security?.last_password_change && (
                  <p className="text-xs text-muted-foreground">
                    Last changed:{" "}
                    {format(new Date(security.last_password_change), "MMM d, yyyy")}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      Two-Factor Authentication
                    </CardTitle>
                    <CardDescription>
                      Add an extra layer of security to your account
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {security?.two_factor_enabled ? "Enabled" : "Disabled"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {security?.two_factor_enabled
                        ? "Your account is protected with 2FA"
                        : "Enable 2FA for enhanced security"}
                    </p>
                  </div>
                  <Switch
                    checked={security?.two_factor_enabled || false}
                    onCheckedChange={handleToggle2FA}
                    disabled={updateSecurity.isPending}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-lg">Sessions</CardTitle>
                <CardDescription>
                  Manage your active sessions across devices
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <Button
                  variant="destructive"
                  onClick={handleLogoutAll}
                  className="w-full sm:w-auto"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Log Out From All Devices
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  This will sign you out from all devices including this one
                </p>
              </CardContent>
            </Card>
          </div>
        </main>
      </PageTransition>
    </div>
  );
};

export default CustomerSettingsSecurity;
