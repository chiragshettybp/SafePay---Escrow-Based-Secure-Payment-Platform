import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrders } from "@/hooks/useOrders";
import { useDisputes, ISSUE_TYPES } from "@/hooks/useDisputes";
import { 
  ArrowLeft, 
  ArrowRight, 
  AlertTriangle,
  Store, 
  IndianRupee,
  FileText,
  Loader2
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function RaiseDispute() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { orders, isLoading: isLoadingOrders } = useOrders();
  const { createDispute, isCreatingDispute } = useDisputes();

  const [issueType, setIssueType] = useState("");
  const [description, setDescription] = useState("");
  const [merchantNotResponded, setMerchantNotResponded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const order = orders.find(o => o.id === orderId);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!issueType) {
      newErrors.issueType = "Please select an issue category";
    }
    if (!description.trim()) {
      newErrors.description = "Please provide a detailed description";
    } else if (description.trim().length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm() || !orderId) return;

    createDispute(
      {
        order_id: orderId,
        reason: ISSUE_TYPES.find(t => t.value === issueType)?.label || issueType,
        description: description.trim(),
        issue_type: issueType,
        merchant_responded: !merchantNotResponded,
      },
      {
        onSuccess: (dispute) => {
          navigate(`/dispute/${dispute.id}/upload`);
        },
      }
    );
  };

  if (isLoadingOrders) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="space-y-4 p-1">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center px-4">
            <Card className="w-full max-w-sm glass-card text-center">
              <CardContent className="pt-6 pb-6">
                <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
                <h2 className="text-lg font-semibold mb-2">Order Not Found</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  The order doesn't exist.
                </p>
                <Button onClick={() => navigate("/orders")} className="w-full">
                  Back to Orders
                </Button>
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="min-h-[calc(100vh-120px)] flex flex-col">
          {/* Header */}
          <div className="mb-4 px-1">
            <Button
              variant="ghost"
              size="sm"
              className="mb-3 -ml-2 text-muted-foreground hover:text-foreground h-9"
              onClick={() => navigate(`/order/${orderId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Back
            </Button>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Raise a Dispute
              </h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Report an issue with your order
            </p>
          </div>

          <div className="flex-1 pb-24 space-y-4 px-1">
            {/* Order Summary - Compact */}
            <Card className="glass-card">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Order</p>
                      <p className="font-medium text-xs truncate">#{order.id.slice(0, 6)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                    <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Merchant</p>
                      <p className="font-medium text-xs truncate">{order.merchant_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/30">
                    <IndianRupee className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] text-muted-foreground">Amount</p>
                      <p className="font-medium text-xs">{formatCurrency(order.amount)}</p>
                    </div>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-muted/30">
                  <p className="text-[10px] text-muted-foreground mb-0.5">Product</p>
                  <p className="font-medium text-sm">{order.product_name}</p>
                </div>
              </CardContent>
            </Card>

            {/* Dispute Form - Compact */}
            <Card className="glass-card">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base">Dispute Details</CardTitle>
                <CardDescription className="text-xs">
                  Provide details about your issue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4">
                {/* Issue Category */}
                <div className="space-y-1.5">
                  <Label htmlFor="issueType" className="text-sm">Issue Category *</Label>
                  <Select value={issueType} onValueChange={(value) => {
                    setIssueType(value);
                    setErrors(prev => ({ ...prev, issueType: "" }));
                  }}>
                    <SelectTrigger className={`h-11 ${errors.issueType ? "border-destructive" : ""}`}>
                      <SelectValue placeholder="Select issue type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ISSUE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.issueType && (
                    <p className="text-xs text-destructive">{errors.issueType}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-sm">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your issue in detail..."
                    rows={4}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setErrors(prev => ({ ...prev, description: "" }));
                    }}
                    className={`text-sm ${errors.description ? "border-destructive" : ""}`}
                  />
                  {errors.description ? (
                    <p className="text-xs text-destructive">{errors.description}</p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">
                      {description.length}/500 (min 20)
                    </p>
                  )}
                </div>

                {/* Merchant Response Checkbox */}
                <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-muted/30">
                  <Checkbox
                    id="merchantNotResponded"
                    checked={merchantNotResponded}
                    onCheckedChange={(checked) => setMerchantNotResponded(checked as boolean)}
                    className="mt-0.5"
                  />
                  <Label 
                    htmlFor="merchantNotResponded" 
                    className="text-xs cursor-pointer leading-relaxed"
                  >
                    Merchant did not respond to my inquiries
                  </Label>
                </div>

                {/* Warning Notice */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-medium text-amber-500 mb-0.5">Important</p>
                      <p className="text-muted-foreground">
                        Filing a dispute will hold funds in escrow until resolved.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Sticky Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border z-40">
            <Button
              className="w-full h-12 max-w-lg mx-auto flex"
              onClick={handleSubmit}
              disabled={isCreatingDispute}
            >
              {isCreatingDispute ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  Continue to Upload Evidence
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
