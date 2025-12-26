import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { useCustomerDrafts } from "@/hooks/useDraftPayments";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Save, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const editSchema = z.object({
  amount: z.number().min(1, "Minimum amount is ₹1").max(10000000, "Maximum amount is ₹1,00,00,000"),
  product_name: z.string().min(1, "Description is required").max(200, "Description too long"),
  product_description: z.string().max(500, "Notes too long").optional(),
});

export default function DraftEdit() {
  const { draftId } = useParams<{ draftId: string }>();
  const navigate = useNavigate();
  const { drafts, isLoading, updateDraft, isUpdating } = useCustomerDrafts();
  
  const [amount, setAmount] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const draft = drafts.find(d => d.id === draftId);

  // Initialize form with draft data
  useEffect(() => {
    if (draft) {
      setAmount(String(draft.amount));
      setProductName(draft.product_name);
      setProductDescription(draft.product_description || "");
    }
  }, [draft]);

  const validateForm = () => {
    const result = editSchema.safeParse({
      amount: parseFloat(amount) || 0,
      product_name: productName.trim(),
      product_description: productDescription.trim() || undefined,
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !draft) return;

    try {
      await updateDraft({
        orderId: draft.id,
        amount: parseFloat(amount),
        productName: productName.trim(),
        productDescription: productDescription.trim() || undefined,
      });
      toast.success("Draft updated successfully");
      navigate(`/drafts/${draft.id}`);
    } catch (error) {
      // Error handled by hook
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <Seo title="Edit Draft" description="Edit draft payment" canonicalPath={`/drafts/${draftId}/edit`} />
        <PageTransition>
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (!draft) {
    return (
      <DashboardLayout>
        <Seo title="Draft Not Found" description="Draft payment not found" canonicalPath={`/drafts/${draftId}/edit`} />
        <PageTransition>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Draft Not Found</h2>
            <p className="text-muted-foreground mb-4">This draft may have been deleted or doesn't exist.</p>
            <Button onClick={() => navigate("/drafts")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Drafts
            </Button>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (draft.draft_status !== "draft" && draft.draft_status !== "active") {
    return (
      <DashboardLayout>
        <Seo title="Cannot Edit Draft" description="This draft cannot be edited" canonicalPath={`/drafts/${draftId}/edit`} />
        <PageTransition>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold mb-2">Cannot Edit This Draft</h2>
            <p className="text-muted-foreground mb-4">
              Only drafts in "Draft" status can be edited. This draft is currently "{draft.draft_status}".
            </p>
            <Button onClick={() => navigate(`/drafts/${draft.id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Draft Details
            </Button>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Seo
        title="Edit Draft Payment"
        description="Edit your draft payment details"
        canonicalPath={`/drafts/${draftId}/edit`}
      />
      <PageTransition>
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Header */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              className="-ml-2 mb-4 text-muted-foreground hover:text-foreground"
              onClick={() => navigate(`/drafts/${draft.id}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Draft
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Edit Draft</h1>
            <p className="text-sm text-muted-foreground mt-1 font-mono">
              #{draft.id}
            </p>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>
                Update the payment information below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Merchant (Read-only) */}
                <div className="space-y-2">
                  <Label>Merchant</Label>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="font-medium">{draft.merchant_name}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      ID: {draft.merchant_id.slice(0, 8)}...
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Merchant cannot be changed. Create a new draft to use a different merchant.
                  </p>
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Payment Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      ₹
                    </span>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      className="pl-7"
                      min="1"
                      max="10000000"
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
                      Min: ₹1 • Max: ₹1,00,00,000
                    </p>
                  )}
                </div>

                {/* Description */}
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

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Additional details about this payment..."
                    maxLength={500}
                    rows={3}
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {productDescription.length}/500 characters
                  </p>
                </div>

                {/* Submit */}
                <div className="flex items-center gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(`/drafts/${draft.id}`)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isUpdating} className="flex-1">
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
