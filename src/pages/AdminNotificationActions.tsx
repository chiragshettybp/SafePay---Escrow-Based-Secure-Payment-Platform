import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Send, Archive, RotateCcw, Edit, Save, Loader2 } from "lucide-react";
import { useAdminNotificationDetails } from "@/hooks/useAdminNotifications";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminNotificationActions() {
  const { notificationId } = useParams<{ notificationId: string }>();
  const navigate = useNavigate();
  const {
    notification,
    isLoading,
    updateNotification,
    isUpdating,
    sendNotification,
    isSending,
    archiveNotification,
    isArchiving,
    resendNotification,
    isResending,
  } = useAdminNotificationDetails(notificationId || "");

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    message: "",
    type: "",
  });

  const handleStartEdit = () => {
    if (notification) {
      setEditForm({
        title: notification.title,
        message: notification.message,
        type: notification.type,
      });
      setIsEditing(true);
    }
  };

  const handleSaveEdit = () => {
    updateNotification(editForm);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!notification) {
    return null;
  }

  const isDraft = notification.status === "draft";
  const isSent = notification.status === "sent";
  const isScheduled = notification.status === "scheduled";
  const isArchived = notification.status === "archived";

  return (
    <div className="space-y-6">
      {/* Edit Draft */}
      {isDraft && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit Draft
            </CardTitle>
            <CardDescription>Modify the notification before sending</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    rows={4}
                    value={editForm.message}
                    onChange={(e) => setEditForm((f) => ({ ...f, message: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={editForm.type}
                    onValueChange={(value) => setEditForm((f) => ({ ...f, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="alert">Alert</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveEdit} disabled={isUpdating}>
                    {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={handleStartEdit}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Notification
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Send Notification */}
      {isDraft && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Send Notification
            </CardTitle>
            <CardDescription>Send this notification to all targeted users</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Send className="w-4 h-4 mr-2" />
                  Send Now
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Send Notification?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send the notification to all users in the target audience. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => sendNotification()}
                    disabled={isSending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Send
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Resend Notification */}
      {isSent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5" />
              Resend Notification
            </CardTitle>
            <CardDescription>Resend to users who haven't read the notification yet</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Resend to Unread
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Resend Notification?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will resend the notification to all users who haven't read it yet.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => resendNotification()}
                    disabled={isResending}
                  >
                    {isResending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                    Resend
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Archive Notification */}
      {!isArchived && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Archive Notification
            </CardTitle>
            <CardDescription>Move this notification to the archive</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <Archive className="w-4 h-4 mr-2" />
                  Archive
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive Notification?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will archive the notification. It will no longer appear in the main list.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      archiveNotification();
                      navigate("/admin/notifications");
                    }}
                    disabled={isArchiving}
                  >
                    {isArchiving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Archive className="w-4 h-4 mr-2" />}
                    Archive
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}

      {/* Already Archived */}
      {isArchived && (
        <Card>
          <CardContent className="p-6 text-center">
            <Archive className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">This notification is archived</h3>
            <p className="text-muted-foreground">Archived notifications are read-only</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
