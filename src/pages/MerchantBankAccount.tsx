import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMerchantWallet } from "@/hooks/useMerchantWallet";
import { 
  ArrowLeft, 
  Building2, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Clock,
  Loader2,
  Info,
  Shield
} from "lucide-react";
import { z } from "zod";

const bankAccountSchema = z.object({
  account_holder_name: z.string().min(2, "Account holder name is required"),
  account_number: z.string().min(8, "Account number must be at least 8 digits"),
  confirm_account_number: z.string(),
  bank_name: z.string().min(2, "Bank name is required"),
  ifsc_code: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format"),
  branch_name: z.string().optional(),
  account_type: z.enum(["savings", "current"]),
  is_default: z.boolean(),
}).refine((data) => data.account_number === data.confirm_account_number, {
  message: "Account numbers don't match",
  path: ["confirm_account_number"],
});

type FormData = z.infer<typeof bankAccountSchema>;

const initialFormData: FormData = {
  account_holder_name: "",
  account_number: "",
  confirm_account_number: "",
  bank_name: "",
  ifsc_code: "",
  branch_name: "",
  account_type: "savings",
  is_default: true,
};

export default function MerchantBankAccount() {
  const navigate = useNavigate();
  const {
    bankAccounts,
    isLoadingBankAccounts,
    addBankAccount,
    isAddingBankAccount,
    deleteBankAccount,
    isDeletingBankAccount,
  } = useMerchantWallet();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const result = bankAccountSchema.safeParse(formData);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          newErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(newErrors);
      return;
    }

    addBankAccount({
      account_holder_name: formData.account_holder_name,
      account_number: formData.account_number,
      bank_name: formData.bank_name,
      ifsc_code: formData.ifsc_code.toUpperCase(),
      branch_name: formData.branch_name || undefined,
      account_type: formData.account_type,
      is_default: formData.is_default,
    }, {
      onSuccess: () => {
        setShowForm(false);
        setFormData(initialFormData);
      },
    });
  };

  const handleDelete = (id: string) => {
    deleteBankAccount(id);
  };

  if (isLoadingBankAccounts) {
    return (
      <MerchantLayout>
        <PageTransition>
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64" />
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
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Bank Accounts</h1>
            <p className="text-muted-foreground mt-1">
              Manage your bank accounts for receiving payouts
            </p>
          </div>

          {/* Verification Info */}
          <Card className="glass-card border-blue-500/20 bg-blue-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-blue-600">Bank Verification</p>
                  <p className="text-sm text-muted-foreground">
                    Your bank account will undergo verification before you can receive payouts.
                    This usually takes 1-2 business days.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Bank Accounts */}
          {bankAccounts.length > 0 && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Linked Accounts</CardTitle>
                <CardDescription>
                  Your registered bank accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {bankAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{account.bank_name}</p>
                          {account.is_default && (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          •••• {account.account_number.slice(-4)} • {account.account_holder_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        className={
                          account.is_verified 
                            ? "bg-green-500 text-white gap-1" 
                            : "bg-amber-500 text-white gap-1"
                        }
                      >
                        {account.is_verified ? (
                          <>
                            <CheckCircle className="h-3 w-3" />
                            Verified
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3" />
                            Pending
                          </>
                        )}
                      </Badge>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Bank Account?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove this bank account? 
                              You won't be able to receive payouts to this account.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(account.id)}
                              disabled={isDeletingBankAccount}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {isDeletingBankAccount ? (
                                <>
                                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  Removing...
                                </>
                              ) : (
                                "Remove"
                              )}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Add Bank Account Form */}
          {showForm ? (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Add New Bank Account</CardTitle>
                <CardDescription>
                  Enter your bank account details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="account_holder_name">Account Holder Name</Label>
                      <Input
                        id="account_holder_name"
                        placeholder="John Doe"
                        value={formData.account_holder_name}
                        onChange={(e) => handleInputChange("account_holder_name", e.target.value)}
                      />
                      {errors.account_holder_name && (
                        <p className="text-sm text-destructive">{errors.account_holder_name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="account_number">Account Number</Label>
                      <Input
                        id="account_number"
                        placeholder="Enter account number"
                        value={formData.account_number}
                        onChange={(e) => handleInputChange("account_number", e.target.value.replace(/\D/g, ""))}
                      />
                      {errors.account_number && (
                        <p className="text-sm text-destructive">{errors.account_number}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm_account_number">Confirm Account Number</Label>
                      <Input
                        id="confirm_account_number"
                        placeholder="Re-enter account number"
                        value={formData.confirm_account_number}
                        onChange={(e) => handleInputChange("confirm_account_number", e.target.value.replace(/\D/g, ""))}
                      />
                      {errors.confirm_account_number && (
                        <p className="text-sm text-destructive">{errors.confirm_account_number}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bank_name">Bank Name</Label>
                        <Input
                          id="bank_name"
                          placeholder="e.g., State Bank of India"
                          value={formData.bank_name}
                          onChange={(e) => handleInputChange("bank_name", e.target.value)}
                        />
                        {errors.bank_name && (
                          <p className="text-sm text-destructive">{errors.bank_name}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ifsc_code">IFSC Code</Label>
                        <Input
                          id="ifsc_code"
                          placeholder="e.g., SBIN0001234"
                          value={formData.ifsc_code}
                          onChange={(e) => handleInputChange("ifsc_code", e.target.value.toUpperCase())}
                          maxLength={11}
                        />
                        {errors.ifsc_code && (
                          <p className="text-sm text-destructive">{errors.ifsc_code}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="branch_name">Branch Name (Optional)</Label>
                        <Input
                          id="branch_name"
                          placeholder="e.g., Main Branch"
                          value={formData.branch_name}
                          onChange={(e) => handleInputChange("branch_name", e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="account_type">Account Type</Label>
                        <Select
                          value={formData.account_type}
                          onValueChange={(value) => handleInputChange("account_type", value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="savings">Savings</SelectItem>
                            <SelectItem value="current">Current</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="is_default" className="cursor-pointer">
                          Set as Default Account
                        </Label>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <Switch
                        id="is_default"
                        checked={formData.is_default}
                        onCheckedChange={(checked) => handleInputChange("is_default", checked)}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setShowForm(false);
                        setFormData(initialFormData);
                        setErrors({});
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1"
                      disabled={isAddingBankAccount}
                    >
                      {isAddingBankAccount ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        "Save Bank Account"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          ) : (
            <Button
              className="w-full h-14"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-5 w-5 mr-2" />
              Add New Bank Account
            </Button>
          )}
        </div>
      </PageTransition>
    </MerchantLayout>
  );
}