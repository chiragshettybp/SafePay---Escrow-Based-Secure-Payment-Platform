
import { Header } from "@/components/layout/Header";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { PageTransition } from "@/components/layout/PageTransition";

const ResetPassword = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-md mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight mb-6">Reset Password</h1>
          <ResetPasswordForm />
        </main>
      </PageTransition>
    </div>
  );
};

export default ResetPassword;
