import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, AlertCircle, CheckCircle } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useWallet } from "@/hooks/useWallet";

export default function WalletWithdraw() {
  const navigate = useNavigate();
  const {
    wallet,
    bankAccounts,
    isLoadingWallet,
    isLoadingBankAccounts,
    withdrawToBank,
  } = useWallet();

  const [amount, setAmount] = useState("");
  const [selectedBankId, setSelectedBankId] = useState<string | null>(null);

  const verifiedAccounts = bankAccounts?.filter(
    (acc) => acc.verification_status === "verified"
  ) || [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedBankId || !amount) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    await withdrawToBank.mutateAsync({
      bankAccountId: selectedBankId,
      amount: numAmount,
    });

    navigate("/wallet");
  };

  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = numAmount > 0 && numAmount <= (wallet?.balance || 0);

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/wallet")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Withdraw Funds</h1>
              <p className="text-muted-foreground">
                Transfer your wallet balance to your bank account
              </p>
            </div>
          </div>

          {/* Balance Card */}
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-primary/20">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">Available Balance</p>
              {isLoadingWallet ? (
                <Skeleton className="h-10 w-40" />
              ) : (
                <h2 className="text-3xl font-bold text-foreground">
                  {formatCurrency(wallet?.balance || 0)}
                </h2>
              )}
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount Input */}
            <Card>
              <CardHeader>
                <CardTitle>Withdrawal Amount</CardTitle>
                <CardDescription>Enter the amount you want to withdraw</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min="1"
                    max={wallet?.balance || 0}
                    step="0.01"
                    className="text-2xl h-14"
                  />
                  {numAmount > (wallet?.balance || 0) && (
                    <p className="text-sm text-destructive">
                      Amount exceeds available balance
                    </p>
                  )}
                </div>

                {/* Quick amount buttons */}
                <div className="flex flex-wrap gap-2">
                  {[500, 1000, 2500, 5000].map((quickAmount) => (
                    <Button
                      key={quickAmount}
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={(wallet?.balance || 0) < quickAmount}
                      onClick={() => setAmount(quickAmount.toString())}
                    >
                      ₹{quickAmount.toLocaleString()}
                    </Button>
                  ))}
                  {wallet?.balance && wallet.balance > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setAmount(wallet.balance.toString())}
                    >
                      Max
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bank Account Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Select Bank Account
                </CardTitle>
                <CardDescription>
                  Choose a verified bank account to receive the funds
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingBankAccounts ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : verifiedAccounts.length > 0 ? (
                  <div className="space-y-3">
                    {verifiedAccounts.map((account) => (
                      <div
                        key={account.id}
                        className={`relative flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedBankId === account.id
                            ? "border-primary bg-primary/5"
                            : "hover:bg-accent/50"
                        }`}
                        onClick={() => setSelectedBankId(account.id)}
                      >
                        {selectedBankId === account.id && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle className="h-5 w-5 text-primary" />
                          </div>
                        )}
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{account.bank_name}</p>
                            {account.is_default && (
                              <Badge variant="secondary" className="text-xs">
                                Default
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {account.account_holder_name} • ••••{account.account_number.slice(-4)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            IFSC: {account.ifsc_code}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You need a verified bank account to make withdrawals.{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto"
                        onClick={() => navigate("/wallet/bank-account")}
                      >
                        Add a bank account
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}

                {bankAccounts && bankAccounts.length > 0 && verifiedAccounts.length === 0 && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Your bank accounts are pending verification. Withdrawals will be available once verified.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Processing Time Notice */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Withdrawals are typically processed within 2-3 business days. The amount will be deducted from your wallet immediately.
              </AlertDescription>
            </Alert>

            {/* Submit Button */}
            <div className="sticky bottom-4 flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => navigate("/wallet")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  !isValidAmount ||
                  !selectedBankId ||
                  withdrawToBank.isPending
                }
              >
                {withdrawToBank.isPending
                  ? "Processing..."
                  : `Withdraw ${numAmount > 0 ? formatCurrency(numAmount) : ""}`}
              </Button>
            </div>
          </form>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}