
import { Header } from "@/components/layout/Header";
import { AttendanceChart } from "@/components/attendance/AttendanceChart";
import { SubjectAttendance } from "@/components/attendance/SubjectAttendance";
import { PageTransition } from "@/components/layout/PageTransition";

// Mock data
const subjects = [
  { id: "sub1", name: "Mathematics", present: 17, total: 20 },
  { id: "sub2", name: "Physics", present: 15, total: 20 },
  { id: "sub3", name: "Computer Science", present: 19, total: 20 },
  { id: "sub4", name: "Chemistry", present: 16, total: 20 },
  { id: "sub5", name: "Literature", present: 14, total: 20 }
];

const Attendance = () => {
  // Calculate overall attendance
  const totalPresent = subjects.reduce((acc, subject) => acc + subject.present, 0);
  const totalClasses = subjects.reduce((acc, subject) => acc + subject.total, 0);
  const totalAbsent = totalClasses - totalPresent;
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-4xl px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AttendanceChart 
              present={totalPresent}
              absent={totalAbsent}
            />
            
            <SubjectAttendance subjects={subjects} />
          </div>
        </main>
      </PageTransition>
    </div>
  );
};

export default Attendance;
