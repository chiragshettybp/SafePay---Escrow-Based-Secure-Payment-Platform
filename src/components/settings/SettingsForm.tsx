
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function SettingsForm() {
  const [settings, setSettings] = useState({
    classReminders: true,
    attendanceAlerts: true,
    assignmentDeadlines: true,
    whatsappForwarding: false,
    dailySchedule: true,
    vibrateOnNotification: true,
    soundOnNotification: false,
  });
  
  const handleToggle = (setting: keyof typeof settings) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };
  
  const handleSave = () => {
    toast.success("Settings saved successfully");
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="classReminders">Class Reminders</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications before each class
              </p>
            </div>
            <Switch
              id="classReminders"
              checked={settings.classReminders}
              onCheckedChange={() => handleToggle('classReminders')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="attendanceAlerts">Attendance Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified about your attendance status
              </p>
            </div>
            <Switch
              id="attendanceAlerts"
              checked={settings.attendanceAlerts}
              onCheckedChange={() => handleToggle('attendanceAlerts')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="assignmentDeadlines">Assignment Deadlines</Label>
              <p className="text-sm text-muted-foreground">
                Receive alerts about upcoming deadlines
              </p>
            </div>
            <Switch
              id="assignmentDeadlines"
              checked={settings.assignmentDeadlines}
              onCheckedChange={() => handleToggle('assignmentDeadlines')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="whatsappForwarding">WhatsApp Forwarding</Label>
              <p className="text-sm text-muted-foreground">
                Get important WhatsApp messages in the app
              </p>
            </div>
            <Switch
              id="whatsappForwarding"
              checked={settings.whatsappForwarding}
              onCheckedChange={() => handleToggle('whatsappForwarding')}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="dailySchedule">Daily Schedule</Label>
              <p className="text-sm text-muted-foreground">
                Receive tomorrow's schedule every night
              </p>
            </div>
            <Switch
              id="dailySchedule"
              checked={settings.dailySchedule}
              onCheckedChange={() => handleToggle('dailySchedule')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="vibrateOnNotification">Vibration</Label>
              <p className="text-sm text-muted-foreground">
                Vibrate when receiving notifications
              </p>
            </div>
            <Switch
              id="vibrateOnNotification"
              checked={settings.vibrateOnNotification}
              onCheckedChange={() => handleToggle('vibrateOnNotification')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="soundOnNotification">Sound</Label>
              <p className="text-sm text-muted-foreground">
                Play sound when receiving notifications
              </p>
            </div>
            <Switch
              id="soundOnNotification"
              checked={settings.soundOnNotification}
              onCheckedChange={() => handleToggle('soundOnNotification')}
            />
          </div>
        </CardContent>
      </Card>
      
      <Button 
        className="w-full"
        onClick={handleSave}
      >
        Save Settings
      </Button>
    </div>
  );
}
