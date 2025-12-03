
import React, { useState } from "react";
import { Upload, FileText, AlertCircle, MessageSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppImport } from "./WhatsAppImport";

interface TimetableUploadProps {
  onUploadSuccess: (data: any) => void;
}

export function TimetableUpload({ onUploadSuccess }: TimetableUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("file");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = [
        "application/json",
        "application/pdf",
        "image/jpeg",
        "image/png"
      ];
      
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Invalid file format",
          description: "Please upload a JSON, PDF, JPEG, or PNG file",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsAnalyzing(true);
    
    try {
      // Process different file types
      if (file.type === "application/json") {
        const fileContent = await file.text();
        const parsedData = JSON.parse(fileContent);
        
        // Validate the data structure (basic validation)
        if (!Array.isArray(parsedData.subjects)) {
          throw new Error("Invalid timetable format");
        }
        
        // Add unique IDs to subjects if they don't exist
        const subjectsWithIds = parsedData.subjects.map((subject: any, index: number) => ({
          ...subject,
          id: subject.id || `subject-${index}`,
          present: subject.attendedClasses || subject.present,
          total: subject.totalClasses || subject.total
        }));
        
        onUploadSuccess({
          ...parsedData,
          subjects: subjectsWithIds
        });
      } else {
        // For PDF, JPEG, PNG files - we'd typically send to a server for processing
        // For now, we'll simulate successful processing with dummy data
        const dummyData = {
          subjects: [
            {
              id: "math101",
              name: "Mathematics",
              code: "MATH101",
              present: 38,
              total: 45,
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
              present: 32,
              total: 40,
              schedule: [
                { day: "Tuesday", time: "02:00 PM" },
                { day: "Thursday", time: "03:00 PM" }
              ]
            },
            {
              id: "phys103",
              name: "Physics",
              code: "PHYS103",
              present: 30,
              total: 38,
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
              total: 25,
              schedule: [
                { day: "Tuesday", time: "10:00 AM" },
                { day: "Thursday", time: "11:00 AM" }
              ]
            }
          ]
        };
        
        onUploadSuccess(dummyData);
        
        toast({
          title: "File processed",
          description: "Your file was processed successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error processing file",
        description: "The file format is invalid or corrupted",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="file" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>File Upload</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span>WhatsApp Import</span>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="file" className="space-y-4">
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            
            <div className="text-center">
              <h3 className="text-lg font-medium mb-1">Upload Your Timetable</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload a JSON, PDF, JPEG, or PNG file with your timetable data to analyze bunking options
              </p>
            </div>
            
            <div className="flex flex-col gap-4 w-full max-w-md">
              <div className="border-2 border-dashed border-white/10 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".json,.pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  id="timetable-upload"
                />
                <label
                  htmlFor="timetable-upload"
                  className="flex flex-col items-center gap-2 cursor-pointer"
                >
                  <FileText className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {file ? file.name : "Select a file"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Click to browse files
                  </span>
                </label>
              </div>
              
              <Button
                onClick={handleUpload}
                disabled={!file || isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Timetable"}
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              <span>Supported formats: JSON, PDF, JPEG, PNG</span>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="whatsapp">
          <WhatsAppImport onImportSuccess={onUploadSuccess} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
