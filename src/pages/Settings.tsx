
import { Header } from "@/components/layout/Header";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { PageTransition } from "@/components/layout/PageTransition";

const Settings = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-3xl px-6 py-6">
          <SettingsForm />
        </main>
      </PageTransition>
    </div>
  );
};

export default Settings;
