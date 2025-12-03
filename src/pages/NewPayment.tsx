import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePaymentFlow, MerchantOption } from "@/hooks/usePaymentFlow";
import { ArrowLeft, ArrowRight, ChevronsUpDown, Check, Loader2, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const paymentSchema = z.object({
  merchant_id: z.string().min(1, "Please select a merchant"),
  amount: z.number().min(1, "Minimum amount is $1").max(100000, "Maximum amount is $100,000"),
  product_name: z.string().min(1, "Payment description is required").max(200, "Description too long"),
  notes: z.string().max(500, "Notes too long").optional(),
});

export default function NewPayment() {
  const navigate = useNavigate();
  const { merchants, isMerchantsLoading, createDraft, isCreatingDraft } = usePaymentFlow();
  
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantOption | null>(null);
  const [amount, setAmount] = useState("");
  const [productName, setProductName] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const result = paymentSchema.safeParse({
      merchant_id: selectedMerchant?.id || "",
      amount: parseFloat(amount) || 0,
      product_name: productName.trim(),
      notes: notes.trim() || undefined,
    });

    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        newErrors[field] = err.message;
      });
      setErrors(newErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  const isFormValid = useMemo(() => {
    return (
      selectedMerchant &&
      parseFloat(amount) >= 1 &&
      parseFloat(amount) <= 100000 &&
      productName.trim().length > 0
    );
  }, [selectedMerchant, amount, productName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !selectedMerchant) return;

    createDraft({
      merchant_id: selectedMerchant.id,
      merchant_name: selectedMerchant.name,
      amount: parseFloat(amount),
      product_name: productName.trim(),
      product_description: notes.trim() || undefined,
    });
  };

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="min-h-[calc(100vh-120px)] flex flex-col">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">New Payment</h1>
            <p className="text-muted-foreground mt-1">
              Create a new escrow payment to a merchant
            </p>
          </div>

          {/* Form Card */}
          <div className="flex-1 flex items-start justify-center pb-20 sm:pb-0">
            <Card className="w-full max-w-[500px] glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  Payment Details
                </CardTitle>
                <CardDescription>
                  Enter the payment information below
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Merchant Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="merchant">Select Merchant *</Label>
                    <Popover open={merchantOpen} onOpenChange={setMerchantOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={merchantOpen}
                          className={cn(
                            "w-full justify-between",
                            !selectedMerchant && "text-muted-foreground"
                          )}
                          disabled={isMerchantsLoading}
                        >
                          {isMerchantsLoading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Loading merchants...
                            </>
                          ) : selectedMerchant ? (
                            selectedMerchant.name
                          ) : (
                            "Search for a merchant..."
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Search merchant..." />
                          <CommandList>
                            <CommandEmpty>No merchant found.</CommandEmpty>
                            <CommandGroup>
                              {merchants.map((merchant) => (
                                <CommandItem
                                  key={merchant.id}
                                  value={merchant.name}
                                  onSelect={() => {
                                    setSelectedMerchant(merchant);
                                    setMerchantOpen(false);
                                    setErrors((prev) => ({ ...prev, merchant_id: "" }));
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedMerchant?.id === merchant.id
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {merchant.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {errors.merchant_id && (
                      <p className="text-sm text-destructive">{errors.merchant_id}</p>
                    )}
                  </div>

                  {/* Payment Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Payment Amount *</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        className="pl-7"
                        min="1"
                        max="100000"
                        step="0.01"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          setErrors((prev) => ({ ...prev, amount: "" }));
                        }}
                      />
                    </div>
                    {errors.amount ? (
                      <p className="text-sm text-destructive">{errors.amount}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Min: $1 • Max: $100,000
                      </p>
                    )}
                  </div>

                  {/* Payment Description */}
                  <div className="space-y-2">
                    <Label htmlFor="product_name">Payment Description *</Label>
                    <Input
                      id="product_name"
                      placeholder="e.g., Website Development Service"
                      maxLength={200}
                      value={productName}
                      onChange={(e) => {
                        setProductName(e.target.value);
                        setErrors((prev) => ({ ...prev, product_name: "" }));
                      }}
                    />
                    {errors.product_name && (
                      <p className="text-sm text-destructive">{errors.product_name}</p>
                    )}
                  </div>

                  {/* Notes (Optional) */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional details about this payment..."
                      maxLength={500}
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {notes.length}/500 characters
                    </p>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 sm:pt-2">
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={!isFormValid || isCreatingDraft}
                    >
                      {isCreatingDraft ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          Continue to Review
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Sticky Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border sm:hidden">
            <Button
              type="button"
              className="w-full"
              size="lg"
              disabled={!isFormValid || isCreatingDraft}
              onClick={handleSubmit}
            >
              {isCreatingDraft ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  Continue to Review
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
