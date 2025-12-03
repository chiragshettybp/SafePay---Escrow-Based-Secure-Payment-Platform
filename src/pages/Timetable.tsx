
import { Header } from "@/components/layout/Header";
import { TimetableGrid } from "@/components/timetable/TimetableGrid";
import { PageTransition } from "@/components/layout/PageTransition";

const Timetable = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-6xl px-6 py-6">
          <TimetableGrid />
        </main>
      </PageTransition>
    </div>
  );
};

export default Timetable;
