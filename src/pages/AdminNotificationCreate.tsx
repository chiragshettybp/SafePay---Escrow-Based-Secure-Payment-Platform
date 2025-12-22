import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Bell, Send, Save, Users, AlertTriangle, Info, Clock } from "lucide-react";
import { useCreateNotification } from "@/hooks/useAdminNotifications";
import { Badge } from "@/components/ui/badge";

export default function AdminNotificationCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateNotification();

  const [formData, setFormData] = useState({
    title: "",
    message: "",
    type: "info",
    target_audience: "all",
    scheduled_at: "",
  });

  const [isScheduled, setIsScheduled] = useState(false);

  const handleSubmit = async (saveAsDraft: boolean) => {
    if (!formData.title.trim() || !formData.message.trim()) {
      return;
    }

    const status = saveAsDraft ? "draft" : isScheduled ? "scheduled" : "sent";

    await createMutation.mutateAsync({
      ...formData,
      status,
      scheduled_at: isScheduled && formData.scheduled_at ? formData.scheduled_at : undefined,
    });

    navigate("/admin/notifications");
  };

  const getTypePreview = () => {
    switch (formData.type) {
      case "info":
        return <Badge variant="outline" className="text-blue-600"><Info className="w-3 h-3 mr-1" />Info</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500"><AlertTriangle className="w-3 h-3 mr-1" />Warning</Badge>;
      case "alert":
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Alert</Badge>;
      case "system":
        return <Badge className="bg-purple-500"><Bell className="w-3 h-3 mr-1" />System</Badge>;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/notifications")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Notification</h1>
            <p className="text-muted-foreground">Compose and send a new notification</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Details</CardTitle>
            <CardDescription>Fill in the notification information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter notification title"
                value={formData.title}
                onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                placeholder="Enter notification message"
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData((f) => ({ ...f, message: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData((f) => ({ ...f, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="alert">Alert</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select
                  value={formData.target_audience}
                  onValueChange={(value) => setFormData((f) => ({ ...f, target_audience: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="customers">Customers Only</SelectItem>
                    <SelectItem value="merchants">Merchants Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="schedule"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="schedule" className="cursor-pointer">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Schedule for later
                </Label>
              </div>

              {isScheduled && (
                <div className="space-y-2">
                  <Label htmlFor="scheduled_at">Schedule Date & Time</Label>
                  <Input
                    id="scheduled_at"
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData((f) => ({ ...f, scheduled_at: e.target.value }))}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{formData.title || "Notification Title"}</h4>
                    {getTypePreview()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formData.message || "Notification message will appear here..."}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>
                      {formData.target_audience === "all"
                        ? "All users"
                        : formData.target_audience === "customers"
                        ? "Customers only"
                        : "Merchants only"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleSubmit(true)}
            disabled={createMutation.isPending || !formData.title || !formData.message}
          >
            <Save className="w-4 h-4 mr-2" />
            Save as Draft
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleSubmit(false)}
            disabled={createMutation.isPending || !formData.title || !formData.message}
          >
            <Send className="w-4 h-4 mr-2" />
            {isScheduled ? "Schedule Notification" : "Send Now"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
