import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PageTransition } from "@/components/layout/PageTransition";
import { useOrder, useOrders } from "@/hooks/useOrders";
import { useDeliveryProof } from "@/hooks/useTracking";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Package,
  User,
  IndianRupee,
  Calendar,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Upload,
  X,
  ImageIcon,
  Shield,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ConfirmDelivery() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { data: order, isLoading: orderLoading } = useOrder(orderId || "");
  const { confirmDelivery, isConfirming } = useOrders();
  const { uploadProof, saveDeliveryProof, isSaving } = useDeliveryProof();
  
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please select a JPG, PNG, or WebP image",
        variant: "destructive",
      });
      return;
    }

    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setProofPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeFile = () => {
    setProofFile(null);
    setProofPreview(null);
  };

  const handleConfirm = async () => {
    if (!orderId || !confirmed) return;

    setIsProcessing(true);

    try {
      // Upload proof if provided
      if (proofFile) {
        const filePath = await uploadProof(proofFile);
        if (filePath) {
          saveDeliveryProof({
            orderId,
            filePath,
            notes: notes.trim() || undefined,
          });
        }
      }

      // Confirm delivery
      confirmDelivery(orderId);
      
      toast({
        title: "Delivery Confirmed",
        description: "Payment has been released to the merchant.",
      });

      navigate(`/order/${orderId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to confirm delivery. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (orderLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The order you're looking for doesn't exist.
            </p>
            <Button asChild>
              <Link to="/orders">Back to Orders</Link>
            </Button>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  const canConfirm = order.status === "delivered" || order.status === "escrow_locked" || order.status === "in_progress";

  if (!canConfirm) {
    return (
      <DashboardLayout>
        <PageTransition>
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-warning mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Cannot Confirm Delivery</h2>
            <p className="text-muted-foreground mb-4">
              This order is not eligible for delivery confirmation. Current status: {order.status}
            </p>
            <Button asChild>
              <Link to={`/order/${orderId}`}>View Order Details</Link>
            </Button>
          </div>
        </PageTransition>
      </DashboardLayout>
    );
  }

  const isProcessingAny = isProcessing || isConfirming || isSaving;

  return (
    <DashboardLayout>
      <PageTransition>
        <div className="max-w-2xl mx-auto space-y-6 pb-24 sm:pb-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Confirm Delivery</h1>
              <p className="text-muted-foreground">
                Order #{order.id.slice(0, 8)} • {order.product_name}
              </p>
            </div>
          </div>

          {/* Order Summary */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Merchant</p>
                    <p className="font-medium text-foreground">{order.merchant_name}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <IndianRupee className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Amount</p>
                    <p className="font-medium text-foreground">{formatCurrency(order.amount)}</p>
                  </div>
                </div>

                {order.expected_delivery_date && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 sm:col-span-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Expected Delivery</p>
                      <p className="font-medium text-foreground">
                        {format(new Date(order.expected_delivery_date), "MMMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Proof Upload (Optional) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Delivery Proof (Optional)
              </CardTitle>
              <CardDescription>
                Upload a photo as proof of delivery for your records
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!proofPreview ? (
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleFileChange}
                    className="hidden"
                    id="proof-upload"
                  />
                  <label htmlFor="proof-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG or WebP (max 10MB)
                    </p>
                  </label>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={proofPreview}
                    alt="Delivery proof"
                    className="w-full max-h-64 object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={removeFile}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about the delivery..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Confirmation */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-primary mb-1">Important Notice</p>
                  <p className="text-muted-foreground">
                    By confirming delivery, you acknowledge that you have received the product/service 
                    in satisfactory condition. The payment of ₹{order.amount.toFixed(2)} will be 
                    released to the merchant. This action cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Checkbox
                  id="confirm"
                  checked={confirmed}
                  onCheckedChange={(checked) => setConfirmed(checked as boolean)}
                />
                <Label htmlFor="confirm" className="text-sm cursor-pointer leading-relaxed">
                  I confirm that I have received the product/service as described and authorize 
                  the release of payment to the merchant.
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Desktop Actions */}
          <div className="hidden sm:flex gap-3">
            <Button
              onClick={handleConfirm}
              disabled={!confirmed || isProcessingAny}
              className="flex-1"
              size="lg"
            >
              {isProcessingAny ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Delivery & Release Payment
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="flex-1"
              size="lg"
            >
              Cancel
            </Button>
          </div>

          {/* Mobile Sticky Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border sm:hidden">
            <Button
              onClick={handleConfirm}
              disabled={!confirmed || isProcessingAny}
              className="w-full"
              size="lg"
            >
              {isProcessingAny ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm & Release Payment
                </>
              )}
            </Button>
          </div>
        </div>
      </PageTransition>
    </DashboardLayout>
  );
}
