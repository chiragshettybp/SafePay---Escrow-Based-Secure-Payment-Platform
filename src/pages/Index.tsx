import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, Wallet, ArrowRight, CheckCircle, Users, CreditCard, RefreshCw, LogOut } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { PageTransition } from "@/components/layout/PageTransition";

export default function Index() {
  const { isAuthenticated, user, profile, logout, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/dashboard");
    } else {
      navigate("/customer-signup");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageTransition>
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold text-foreground">SafePay</span>
            </div>
            
            <div className="flex items-center gap-3">
              {isLoading ? (
                <div className="h-10 w-24 bg-muted animate-pulse rounded-lg" />
              ) : isAuthenticated ? (
                <>
                  <span className="text-sm text-muted-foreground hidden sm:block">
                    {profile?.full_name || profile?.phone || user?.email}
                  </span>
                  <Button variant="outline" size="sm" onClick={logout} className="border-border">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/customer-login">
                    <Button variant="ghost" size="sm">Sign In</Button>
                  </Link>
                  <Link to="/customer-signup">
                    <Button size="sm">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="container mx-auto px-4 pt-32 pb-20">
          <div className="text-center space-y-8 animate-fade-in max-w-4xl mx-auto">
            <Badge variant="secondary" className="text-sm px-4 py-2">
              Secure Escrow Payments
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold leading-tight">
              <span className="text-gradient">Secure</span> Payments,{" "}
              <span className="text-gradient-secondary">Protected</span> Transactions
            </h1>
            
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              SafePay ensures your money is protected until delivery is confirmed. 
              Buy with confidence, sell with trust.
            </p>

            <div className="flex gap-4 justify-center flex-wrap">
              <Button size="lg" className="gap-2 h-12 px-8" onClick={handleGetStarted}>
                {isAuthenticated ? "Go to Dashboard" : "Start Now"}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 border-border">
                Learn More
              </Button>
            </div>

            {/* User Status */}
            {isAuthenticated && (
              <div className="glass-card inline-flex items-center gap-3 px-6 py-3 rounded-full animate-fade-in">
                <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  Logged in as <span className="text-foreground font-medium">{profile?.phone || user?.email}</span>
                </span>
              </div>
            )}
          </div>

          {/* Features Grid */}
          <div className="mt-24 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass-card p-6 space-y-4 hover-scale">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">Escrow Protection</h3>
              <p className="text-sm text-muted-foreground">
                Funds are held securely until delivery is confirmed by the buyer.
              </p>
            </Card>

            <Card className="glass-card p-6 space-y-4 hover-scale">
              <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-secondary" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">Dispute Resolution</h3>
              <p className="text-sm text-muted-foreground">
                Fair mediation process to resolve any transaction issues.
              </p>
            </Card>

            <Card className="glass-card p-6 space-y-4 hover-scale">
              <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                <Wallet className="h-6 w-6 text-success" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">Instant Transfers</h3>
              <p className="text-sm text-muted-foreground">
                Quick fund releases after successful delivery confirmation.
              </p>
            </Card>

            <Card className="glass-card p-6 space-y-4 hover-scale">
              <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-warning" />
              </div>
              <h3 className="font-semibold text-lg text-foreground">Easy Refunds</h3>
              <p className="text-sm text-muted-foreground">
                Seamless refund process if something goes wrong.
              </p>
            </Card>
          </div>

          {/* How It Works */}
          <div className="mt-32">
            <div className="text-center mb-12">
              <Badge variant="outline" className="mb-4">How It Works</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
                Simple & Secure Process
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                  <CreditCard className="h-8 w-8 text-primary" />
                </div>
                <div className="text-4xl font-bold text-primary">01</div>
                <h3 className="font-semibold text-lg text-foreground">Buyer Pays</h3>
                <p className="text-muted-foreground text-sm">
                  Buyer initiates payment which is held in escrow safely.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto">
                  <Users className="h-8 w-8 text-secondary" />
                </div>
                <div className="text-4xl font-bold text-secondary">02</div>
                <h3 className="font-semibold text-lg text-foreground">Seller Delivers</h3>
                <p className="text-muted-foreground text-sm">
                  Seller ships the product or delivers the service.
                </p>
              </div>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
                <div className="text-4xl font-bold text-success">03</div>
                <h3 className="font-semibold text-lg text-foreground">Funds Released</h3>
                <p className="text-muted-foreground text-sm">
                  Buyer confirms delivery and funds are released to seller.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="mt-32">
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-8 sm:p-12 text-center space-y-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
                  Ready to transact securely?
                </h2>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  Join thousands of users who trust SafePay for their online transactions.
                </p>
                <div className="flex gap-4 justify-center flex-wrap">
                  {!isAuthenticated ? (
                    <>
                      <Link to="/customer-signup">
                        <Button size="lg" className="h-12 px-8">
                          Create Free Account
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      <Link to="/customer-login">
                        <Button variant="outline" size="lg" className="h-12 px-8 border-border">
                          Sign In
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <Button size="lg" className="h-12 px-8" onClick={handleGetStarted}>
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <footer className="mt-24 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            <p>© 2024 SafePay. All rights reserved.</p>
          </footer>
        </div>
      </PageTransition>
    </div>
  );
}
