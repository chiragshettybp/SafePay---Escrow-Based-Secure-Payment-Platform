
import { Header } from "@/components/layout/Header";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { PageTransition } from "@/components/layout/PageTransition";

const SignUp = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <PageTransition>
        <main className="flex-1 container max-w-md mx-auto px-6 py-8">
          <h1 className="text-2xl font-bold tracking-tight mb-6">Create Account</h1>
          <SignUpForm />
        </main>
      </PageTransition>
    </div>
  );
};

export default SignUp;
