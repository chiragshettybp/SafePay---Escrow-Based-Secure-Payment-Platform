
import { Header } from "@/components/layout/Header";
import { AccountDetails } from "@/components/auth/AccountDetails";
import { PageTransition } from "@/components/layout/PageTransition";

const Account = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-3xl px-6 py-6">
          <h1 className="text-2xl font-bold tracking-tight mb-6">My Account</h1>
          <AccountDetails />
        </main>
      </PageTransition>
    </div>
  );
};

export default Account;
