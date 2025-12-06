import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import {
  ArrowLeft,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import { useWallet, BankAccountFormData } from "@/hooks/useWallet";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

const bankAccountSchema = z.object({
  account_holder_name: z
    .string()
    .min(2, "Account holder name must be at least 2 characters")
    .max(100, "Account holder name must be less than 100 characters"),
  account_number: z
    .string()
    .min(8, "Account number must be at least 8 digits")
    .max(20, "Account number must be less than 20 digits")
    .regex(/^\d+$/, "Account number must contain only digits"),
  confirm_account_number: z.string(),
  ifsc_code: z
    .string()
    .length(11, "IFSC code must be exactly 11 characters")
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code format"),
  bank_name: z.string().min(2, "Bank name is required"),
  account_type: z.enum(["savings", "current"]),
  is_default: z.boolean(),
}).refine((data) => data.account_number === data.confirm_account_number, {
  message: "Account numbers do not match",
  path: ["confirm_account_number"],
});

type BankAccountFormValues = z.infer<typeof bankAccountSchema>;

export default function WalletBankAccount() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  
  const {
    bankAccounts,
    isLoadingBankAccounts,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
  } = useWallet();

  const editingAccount = editId
    ? bankAccounts?.find((a) => a.id === editId)
    : null;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BankAccountFormValues>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      account_holder_name: "",
      account_number: "",
      confirm_account_number: "",
      ifsc_code: "",
      bank_name: "",
      account_type: "savings",
      is_default: false,
    },
  });

  const isDefault = watch("is_default");

  // Populate form when editing
  useEffect(() => {
    if (editingAccount) {
      reset({
        account_holder_name: editingAccount.account_holder_name,
        account_number: editingAccount.account_number,
        confirm_account_number: editingAccount.account_number,
        ifsc_code: editingAccount.ifsc_code,
        bank_name: editingAccount.bank_name,
        account_type: editingAccount.account_type as "savings" | "current",
        is_default: editingAccount.is_default,
      });
    }
  }, [editingAccount, reset]);

  const onSubmit = async (data: BankAccountFormValues) => {
    const formData: BankAccountFormData = {
      account_holder_name: data.account_holder_name,
      account_number: data.account_number,
      ifsc_code: data.ifsc_code.toUpperCase(),
      bank_name: data.bank_name,
      account_type: data.account_type,
      is_default: data.is_default,
    };

    if (editId && editingAccount) {
      await updateBankAccount.mutateAsync({ id: editId, formData });
    } else {
      await addBankAccount.mutateAsync(formData);
    }
    navigate("/wallet");
  };

  const handleDelete = async () => {
    if (editId) {
      await deleteBankAccount.mutateAsync(editId);
      navigate("/wallet");
    }
  };

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
              <h1 className="text-2xl font-semibold text-foreground">
                {editId ? "Manage Bank Account" : "Add Bank Account"}
              </h1>
              <p className="text-muted-foreground">
                {editId
                  ? "Update your bank account details"
                  : "Add a bank account to receive refunds"}
              </p>
            </div>
          </div>

          {/* Verification Status (when editing) */}
          {editingAccount && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`h-12 w-12 rounded-full flex items-center justify-center ${
                        editingAccount.verification_status === "verified"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : editingAccount.verification_status === "failed"
                          ? "bg-red-100 dark:bg-red-900/30"
                          : "bg-yellow-100 dark:bg-yellow-900/30"
                      }`}
                    >
                      {editingAccount.verification_status === "verified" ? (
                        <CheckCircle className="h-6 w-6 text-green-600" />
                      ) : editingAccount.verification_status === "failed" ? (
                        <AlertCircle className="h-6 w-6 text-red-600" />
                      ) : (
                        <Clock className="h-6 w-6 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">Verification Status</p>
                      <p className="text-sm text-muted-foreground">
                        Last updated:{" "}
                        {format(new Date(editingAccount.updated_at), "PPp")}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      editingAccount.verification_status === "verified"
                        ? "default"
                        : editingAccount.verification_status === "failed"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {editingAccount.verification_status}
                  </Badge>
                </div>
                {editingAccount.verification_status === "pending" && (
                  <p className="text-sm text-muted-foreground mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    Your bank account is being verified. This usually takes 1-2 business days.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Bank Account Details
              </CardTitle>
              <CardDescription>
                Enter your bank account information accurately
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Account Holder Name */}
                <div className="space-y-2">
                  <Label htmlFor="account_holder_name">
                    Account Holder Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="account_holder_name"
                    placeholder="Enter name as per bank records"
                    {...register("account_holder_name")}
                  />
                  {errors.account_holder_name && (
                    <p className="text-sm text-destructive">
                      {errors.account_holder_name.message}
                    </p>
                  )}
                </div>

                {/* Account Number */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account_number">
                      Account Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="account_number"
                      type="password"
                      placeholder="Enter account number"
                      {...register("account_number")}
                    />
                    {errors.account_number && (
                      <p className="text-sm text-destructive">
                        {errors.account_number.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm_account_number">
                      Confirm Account Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="confirm_account_number"
                      placeholder="Re-enter account number"
                      {...register("confirm_account_number")}
                    />
                    {errors.confirm_account_number && (
                      <p className="text-sm text-destructive">
                        {errors.confirm_account_number.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* IFSC & Bank Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ifsc_code">
                      IFSC Code <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="ifsc_code"
                      placeholder="e.g., SBIN0001234"
                      className="uppercase"
                      {...register("ifsc_code")}
                    />
                    {errors.ifsc_code && (
                      <p className="text-sm text-destructive">
                        {errors.ifsc_code.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_name">
                      Bank Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="bank_name"
                      placeholder="Enter bank name"
                      {...register("bank_name")}
                    />
                    {errors.bank_name && (
                      <p className="text-sm text-destructive">
                        {errors.bank_name.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Account Type */}
                <div className="space-y-2">
                  <Label htmlFor="account_type">
                    Account Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={watch("account_type")}
                    onValueChange={(value) =>
                      setValue("account_type", value as "savings" | "current")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Savings Account</SelectItem>
                      <SelectItem value="current">Current Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Default Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
                  <div>
                    <Label htmlFor="is_default" className="font-medium">
                      Set as Default
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Use this account for all refunds
                    </p>
                  </div>
                  <Switch
                    id="is_default"
                    checked={isDefault}
                    onCheckedChange={(checked) => setValue("is_default", checked)}
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  {editId && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          className="sm:mr-auto"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Bank Account?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently
                            remove the bank account from your wallet.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/wallet")}
                    className="sm:ml-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || addBankAccount.isPending || updateBankAccount.isPending}
                  >
                    {(isSubmitting || addBankAccount.isPending || updateBankAccount.isPending) && (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    {editId ? "Update Account" : "Save Account"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Notice */}
          {!editId && (
            <Card className="border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-900/10">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      Verification Required
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300/80 mt-1">
                      Your bank account will undergo verification after submission.
                      This usually takes 1-2 business days. You will be notified
                      once verification is complete.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
