import { useState, useEffect } from "react";
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
  DollarSign,
  FileText,
  Loader2
} from "lucide-react";

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
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <Card className="glass-card">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="min-h-[60vh] flex items-center justify-center">
            <Card className="w-full max-w-md glass-card text-center">
              <CardContent className="pt-6">
                <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
                <p className="text-muted-foreground mb-6">
                  The order you're trying to dispute doesn't exist.
                </p>
                <Button onClick={() => navigate("/orders")}>
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
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
              onClick={() => navigate(`/order/${orderId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Order Details
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-7 w-7 text-destructive" />
              Raise a Dispute
            </h1>
            <p className="text-muted-foreground mt-1">
              Report an issue with your order
            </p>
          </div>

          <div className="flex-1 pb-24 sm:pb-6 space-y-6">
            {/* Order Summary */}
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Order ID</p>
                      <p className="font-medium text-sm">{order.id.slice(0, 8)}...</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <Store className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Merchant</p>
                      <p className="font-medium text-sm">{order.merchant_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Amount</p>
                      <p className="font-medium text-sm">${order.amount.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-muted/30">
                  <p className="text-xs text-muted-foreground mb-1">Product</p>
                  <p className="font-medium">{order.product_name}</p>
                  {order.product_description && (
                    <p className="text-sm text-muted-foreground mt-1">{order.product_description}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Dispute Form */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Dispute Details</CardTitle>
                <CardDescription>
                  Please provide details about your issue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Issue Category */}
                <div className="space-y-2">
                  <Label htmlFor="issueType">Issue Category *</Label>
                  <Select value={issueType} onValueChange={(value) => {
                    setIssueType(value);
                    setErrors(prev => ({ ...prev, issueType: "" }));
                  }}>
                    <SelectTrigger className={errors.issueType ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select the type of issue" />
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
                    <p className="text-sm text-destructive">{errors.issueType}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Detailed Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Please describe your issue in detail. Include specific information about what went wrong, when it happened, and any communication you've had with the merchant..."
                    rows={5}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setErrors(prev => ({ ...prev, description: "" }));
                    }}
                    className={errors.description ? "border-destructive" : ""}
                  />
                  {errors.description ? (
                    <p className="text-sm text-destructive">{errors.description}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {description.length}/500 characters (minimum 20)
                    </p>
                  )}
                </div>

                {/* Merchant Response Checkbox */}
                <div className="flex items-start space-x-3 p-4 rounded-lg bg-muted/30">
                  <Checkbox
                    id="merchantNotResponded"
                    checked={merchantNotResponded}
                    onCheckedChange={(checked) => setMerchantNotResponded(checked as boolean)}
                  />
                  <Label 
                    htmlFor="merchantNotResponded" 
                    className="text-sm cursor-pointer leading-relaxed"
                  >
                    Merchant did not respond to my inquiries
                  </Label>
                </div>

                {/* Warning Notice */}
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-500 mb-1">Important Notice</p>
                      <p className="text-muted-foreground">
                        Filing a dispute will temporarily hold the funds in escrow until the case is resolved. 
                        Please ensure you have supporting evidence ready for the next step.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Desktop Submit Button */}
                <div className="hidden sm:block pt-2">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isCreatingDispute}
                  >
                    {isCreatingDispute ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating Dispute...
                      </>
                    ) : (
                      <>
                        Continue to Upload Evidence
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Sticky Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border sm:hidden">
            <Button
              className="w-full"
              size="lg"
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
                  Continue
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
