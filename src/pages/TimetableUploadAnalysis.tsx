
import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { PageTransition } from "@/components/layout/PageTransition";
import { TimetableUpload } from "@/components/timetable/TimetableUpload";
import { TimetableAnalyzer } from "@/components/timetable/TimetableAnalyzer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, MessageSquare } from "lucide-react";

const TimetableUploadAnalysis = () => {
  const [timetableData, setTimetableData] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [dataSource, setDataSource] = useState<string>("whatsapp");

  // Load timetable data from localStorage on initial load
  useEffect(() => {
    const savedData = localStorage.getItem("timetableData");
    if (savedData) {
      try {
        setTimetableData(JSON.parse(savedData));
      } catch (e) {
        console.error("Error parsing saved timetable data:", e);
      }
    } else {
      // If no saved data, use default data for demonstration
      const defaultData = {
        subjects: [{
          id: "math101",
          name: "Mathematics",
          code: "MATH101",
          present: 38,
          total: 45,
          schedule: [{
            day: "Monday",
            time: "10:00 AM"
          }, {
            day: "Wednesday",
            time: "11:00 AM"
          }, {
            day: "Friday",
            time: "09:00 AM"
          }]
        }, {
          id: "cs102",
          name: "Computer Science",
          code: "CS102",
          present: 32,
          total: 40,
          schedule: [{
            day: "Tuesday",
            time: "02:00 PM"
          }, {
            day: "Thursday",
            time: "03:00 PM"
          }]
        }, {
          id: "phys103",
          name: "Physics",
          code: "PHYS103",
          present: 30,
          total: 38,
          schedule: [{
            day: "Monday",
            time: "01:00 PM"
          }, {
            day: "Wednesday",
            time: "02:00 PM"
          }, {
            day: "Friday",
            time: "01:00 PM"
          }]
        }, {
          id: "eng104",
          name: "English Literature",
          code: "ENG104",
          present: 22,
          total: 25,
          schedule: [{
            day: "Tuesday",
            time: "10:00 AM"
          }, {
            day: "Thursday",
            time: "11:00 AM"
          }]
        }]
      };
      setTimetableData(defaultData);
      localStorage.setItem("timetableData", JSON.stringify(defaultData));
    }
  }, []);

  // Function to handle data from TimetableUpload component
  const handleTimetableData = (data: any) => {
    setTimetableData(data);
    localStorage.setItem("timetableData", JSON.stringify(data));
    setShowUpload(false);
  };

  // Function to reset or update timetable data
  const onReset = () => {
    setShowUpload(true);
  };
  
  return <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-4xl px-6 py-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold mb-2">Let's BUNK?</h1>
                <p className="text-muted-foreground">
                  See how many classes you can safely skip while maintaining at least 75% attendance
                </p>
              </div>
              {!showUpload && 
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={onReset} 
                    variant="outline" 
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Update Timetable</span>
                    <span className="sm:hidden">Upload</span>
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowUpload(true);
                      setDataSource("whatsapp");
                    }} 
                    variant="outline" 
                    className="flex items-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 border-green-500/20"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span className="hidden sm:inline">Import from WhatsApp</span>
                    <span className="sm:hidden">WhatsApp</span>
                  </Button>
                </div>
              }
            </div>
            
            {showUpload ? <Card className="glass-card p-6">
                <TimetableUpload onUploadSuccess={handleTimetableData} />
              </Card> : timetableData && <TimetableAnalyzer timetableData={timetableData} onReset={onReset} />}
          </div>
        </main>
      </PageTransition>
    </div>;
};
export default TimetableUploadAnalysis;
