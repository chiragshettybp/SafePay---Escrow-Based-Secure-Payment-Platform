import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMerchantWallet } from "@/hooks/useMerchantWallet";
import { 
  ArrowLeft, 
  Wallet,
  Building2,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info
} from "lucide-react";

export default function MerchantWithdraw() {
  const navigate = useNavigate();
  const {
    wallet,
    isLoadingWallet,
    bankAccounts,
    isLoadingBankAccounts,
    createPayout,
    isCreatingPayout,
    MINIMUM_WITHDRAWAL,
    PAYOUT_FEE_PERCENT,
  } = useMerchantWallet();

  const [amount, setAmount] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const verifiedAccounts = bankAccounts.filter(ba => ba.is_verified);
  const selectedAccount = bankAccounts.find(ba => ba.id === selectedAccountId);
  
  const parsedAmount = parseFloat(amount) || 0;
  const fee = parsedAmount * (PAYOUT_FEE_PERCENT / 100);
  const netAmount = parsedAmount - fee;

  const isLoading = isLoadingWallet || isLoadingBankAccounts;

  const handleAmountChange = (value: string) => {
    // Only allow numbers and one decimal point
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length > 2) return;
    if (parts[1] && parts[1].length > 2) return;
    
    setAmount(cleaned);
    setError("");
  };

  const handleMaxAmount = () => {
    if (wallet) {
      setAmount(wallet.available_balance.toFixed(2));
    }
  };

  const validateAndSubmit = async () => {
    if (!wallet) {
      setError("Wallet not found");
      return;
    }

    if (parsedAmount < MINIMUM_WITHDRAWAL) {
      setError(`Minimum withdrawal is ₹${MINIMUM_WITHDRAWAL}`);
      return;
    }

    if (parsedAmount > wallet.available_balance) {
      setError("Insufficient balance");
      return;
    }

    if (!selectedAccountId) {
      setError("Please select a bank account");
      return;
    }

    if (!selectedAccount?.is_verified) {
      setError("Selected bank account is not verified");
      return;
    }

    try {
      const payout = await createPayout({
        amount: parsedAmount,
        bank_account_id: selectedAccountId,
        notes: notes || undefined,
      });
      
      navigate(`/merchant/payouts/success/${payout.id}`);
    } catch (err) {
      // Error is handled in the hook
    }
  };

  if (isLoading) {
    return (
      <MerchantLayout>
        <PageTransition>
          <div className="space-y-6 max-w-2xl mx-auto">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64" />
          </div>
        </PageTransition>
      </MerchantLayout>
    );
  }

  if (!wallet || verifiedAccounts.length === 0) {
    return (
      <MerchantLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center">
            <Card className="w-full max-w-md glass-card text-center">
              <CardContent className="pt-6">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Cannot Withdraw</h2>
                <p className="text-muted-foreground mb-6">
                  {!wallet 
                    ? "Wallet not found. Please contact support."
                    : "You need a verified bank account to withdraw funds."
                  }
                </p>
                <Button onClick={() => navigate("/merchant/payouts/bank-account")}>
                  Add Bank Account
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <PageTransition>
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Header */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/merchant/payouts")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Payouts
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Withdraw Funds</h1>
            <p className="text-muted-foreground mt-1">
              Request a payout to your bank account
            </p>
          </div>

          {/* Withdrawal Summary */}
          <Card className="glass-card border-green-500/20 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available Balance</p>
                  <p className="text-3xl font-bold text-green-500">
                    ₹{wallet.available_balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="h-14 w-14 rounded-full bg-green-500/10 flex items-center justify-center">
                  <Wallet className="h-7 w-7 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal Form */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Withdrawal Details</CardTitle>
              <CardDescription>
                Enter the amount and select your bank account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="amount">Amount</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleMaxAmount}
                    className="text-primary"
                  >
                    Max
                  </Button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">
                    ₹
                  </span>
                  <Input
                    id="amount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="pl-8 text-2xl h-14 font-semibold"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Minimum withdrawal: ₹{MINIMUM_WITHDRAWAL}
                </p>
              </div>

              {/* Bank Account Selection */}
              <div className="space-y-2">
                <Label htmlFor="bank_account">Destination Bank Account</Label>
                <Select
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                >
                  <SelectTrigger className="h-14">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {verifiedAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>{account.bank_name}</span>
                          <span className="text-muted-foreground">
                            •••• {account.account_number.slice(-4)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Account Details */}
              {selectedAccount && (
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{selectedAccount.bank_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {selectedAccount.account_holder_name} • •••• {selectedAccount.account_number.slice(-4)}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-green-500 text-white gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Verified
                    </Badge>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add a note for this withdrawal..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Fees Summary */}
              {parsedAmount > 0 && (
                <div className="p-4 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Withdrawal Amount</span>
                    <span>₹{parsedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {PAYOUT_FEE_PERCENT > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Processing Fee ({PAYOUT_FEE_PERCENT}%)</span>
                      <span>-₹{fee.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t flex items-center justify-between font-semibold">
                    <span>You'll Receive</span>
                    <span className="text-green-500">₹{netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              {/* Processing Time Info */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Withdrawals are typically processed within 1-2 business days.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate("/merchant/payouts")}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={validateAndSubmit}
                  disabled={isCreatingPayout || parsedAmount <= 0 || !selectedAccountId}
                >
                  {isCreatingPayout ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Confirm Withdrawal
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </MerchantLayout>
  );
}