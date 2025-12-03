
import { Header } from "@/components/layout/Header";
import { NotificationList } from "@/components/notifications/NotificationList";
import { PageTransition } from "@/components/layout/PageTransition";

// Mock data
const notifications = [
  {
    id: "n1",
    type: "assignment" as const,
    title: "Database Project Due Soon",
    description: "Your database design project is due in 2 days",
    time: "1 hour ago",
    read: false,
    urgent: true
  },
  {
    id: "n2",
    type: "attendance" as const,
    title: "Attendance Alert",
    description: "Your Physics attendance is now below 75%",
    time: "2 hours ago",
    read: false,
    urgent: true
  },
  {
    id: "n3",
    type: "message" as const,
    title: "CS Group Message",
    description: "Prof. Davis: Class will start 30 minutes late tomorrow",
    time: "3 hours ago",
    read: false
  },
  {
    id: "n4",
    type: "schedule" as const,
    title: "Schedule Change",
    description: "Math class on Friday is moved to Room 202",
    time: "5 hours ago",
    read: true
  },
  {
    id: "n5",
    type: "assignment" as const,
    title: "Physics Lab Report",
    description: "New physics lab report assigned, due next week",
    time: "Yesterday",
    read: true
  },
  {
    id: "n6",
    type: "message" as const,
    title: "Literature Group",
    description: "Sarah: Can someone share last class notes?",
    time: "Yesterday",
    read: true
  },
  {
    id: "n7",
    type: "schedule" as const,
    title: "Holiday Notice",
    description: "University will be closed next Monday for Memorial Day",
    time: "2 days ago",
    read: true
  }
];

const Notifications = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-4xl px-6 py-6">
          <NotificationList notifications={notifications} />
        </main>
      </PageTransition>
    </div>
  );
};

export default Notifications;
