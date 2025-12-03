
import React, { useState } from "react";
import { MessageSquare, Users, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WhatsAppImportProps {
  onImportSuccess: (data: any) => void;
}

// Mock WhatsApp groups data
const mockGroups = [
  { id: "group1", name: "CSE Batch 2023", messages: 1250 },
  { id: "group2", name: "Data Structures Class", messages: 856 },
  { id: "group3", name: "Physics Lab Group", messages: 523 },
  { id: "group4", name: "College Events", messages: 341 },
];

export function WhatsAppImport({ onImportSuccess }: WhatsAppImportProps) {
  const [selectedGroup, setSelectedGroup] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpInput, setShowOtpInput] = useState(false);
  const { toast } = useToast();

  const handleAuthenticate = () => {
    // Simulate OTP sending
    if (!phone) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number",
        variant: "destructive",
      });
      return;
    }
    
    // Simulate OTP being sent
    setShowOtpInput(true);
    toast({
      title: "OTP Sent",
      description: "A 6-digit code has been sent to your WhatsApp number",
    });
  };

  const handleVerifyOtp = () => {
    // Simulate OTP verification
    if (otp.length !== 6) {
      toast({
        title: "Error",
        description: "Please enter a valid 6-digit OTP",
        variant: "destructive",
      });
      return;
    }

    // Simulate successful authentication
    setIsAuthenticated(true);
    setShowOtpInput(false);
    toast({
      title: "Authentication Successful",
      description: "You can now select a WhatsApp group",
    });
  };

  const handleGroupSelect = (value: string) => {
    setSelectedGroup(value);
  };

  const handleImport = () => {
    if (!selectedGroup) return;
    
    setIsAnalyzing(true);
    
    // Simulate processing delay
    setTimeout(() => {
      // Generate mock timetable data
      const timetableData = {
        subjects: [
          {
            id: "math101",
            name: "Mathematics",
            code: "MATH101",
            present: 42,
            total: 50,
            schedule: [
              { day: "Monday", time: "10:00 AM" },
              { day: "Wednesday", time: "11:00 AM" },
              { day: "Friday", time: "09:00 AM" }
            ]
          },
          {
            id: "cs102",
            name: "Computer Science",
            code: "CS102",
            present: 35,
            total: 45,
            schedule: [
              { day: "Tuesday", time: "02:00 PM" },
              { day: "Thursday", time: "03:00 PM" }
            ]
          },
          {
            id: "phys103",
            name: "Physics",
            code: "PHYS103",
            present: 28,
            total: 40,
            schedule: [
              { day: "Monday", time: "01:00 PM" },
              { day: "Wednesday", time: "02:00 PM" },
              { day: "Friday", time: "01:00 PM" }
            ]
          },
          {
            id: "eng104",
            name: "English Literature",
            code: "ENG104",
            present: 22,
            total: 30,
            schedule: [
              { day: "Tuesday", time: "10:00 AM" },
              { day: "Thursday", time: "11:00 AM" }
            ]
          }
        ]
      };
      
      onImportSuccess(timetableData);
      
      toast({
        title: "Import Successful",
        description: "Your timetable data has been extracted from WhatsApp",
      });
      
      setIsAnalyzing(false);
    }, 2000);
  };
  
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="p-4 rounded-full bg-green-500/10">
          <MessageSquare className="h-8 w-8 text-green-500" />
        </div>
        
        <div className="text-center">
          <h3 className="text-lg font-medium mb-1">Connect WhatsApp</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Import your timetable and attendance data directly from your college WhatsApp groups
          </p>
        </div>
        
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Your WhatsApp Number</Label>
                <div className="flex gap-2">
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleAuthenticate}
                    disabled={!phone || showOtpInput}
                  >
                    {showOtpInput ? "Sent" : "Send OTP"}
                  </Button>
                </div>
              </div>
              
              {showOtpInput && (
                <div className="space-y-2">
                  <Label htmlFor="otp">Enter OTP</Label>
                  <div className="flex gap-2">
                    <Input
                      id="otp"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="6-digit code"
                      className="flex-1"
                      maxLength={6}
                    />
                    <Button 
                      onClick={handleVerifyOtp}
                      disabled={otp.length !== 6}
                    >
                      Verify
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 text-center text-xs text-muted-foreground">
              <p>We use this only to authenticate with WhatsApp.</p>
              <p>Your data remains private and secure.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="p-4 rounded-full bg-green-500/10">
        <Users className="h-8 w-8 text-green-500" />
      </div>
      
      <div className="text-center">
        <h3 className="text-lg font-medium mb-1">Select WhatsApp Group</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Choose the college or class group that contains your timetable information
        </p>
      </div>
      
      <div className="w-full max-w-md space-y-4">
        <Select value={selectedGroup} onValueChange={handleGroupSelect}>
          <SelectTrigger>
            <SelectValue placeholder="Select a WhatsApp group" />
          </SelectTrigger>
          <SelectContent>
            {mockGroups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                <div className="flex items-center justify-between w-full">
                  <span>{group.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {group.messages} messages
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="w-full"
              disabled={!selectedGroup || isAnalyzing}
            >
              {isAnalyzing ? "Analyzing..." : "Import from WhatsApp"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Import Data from WhatsApp</DialogTitle>
              <DialogDescription>
                This will analyze your WhatsApp group messages to extract timetable and attendance data.
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-green-500/10">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Extract Class Schedules</p>
                    <p className="text-muted-foreground">Including subject, time, and location</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-green-500/10">
                    <Check className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Analyze Attendance Patterns</p>
                    <p className="text-muted-foreground">Based on class announcements and discussions</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-yellow-500/10">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Privacy Notice</p>
                    <p className="text-muted-foreground">Only class and attendance data will be processed</p>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                onClick={handleImport}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? "Processing..." : "Proceed with Import"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        <p className="text-xs text-center text-muted-foreground">
          We'll extract only the timetable and attendance information from your selected group
        </p>
      </div>
    </div>
  );
}
