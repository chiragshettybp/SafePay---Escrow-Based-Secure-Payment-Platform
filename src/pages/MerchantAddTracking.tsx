import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { useMerchantTracking, TrackingFormData } from "@/hooks/useMerchantTracking";
import { useMerchantOrderDetails } from "@/hooks/useMerchantOrderDetails";
import { Seo } from "@/components/seo/Seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Truck, Loader2, AlertTriangle, Package } from "lucide-react";
import { toast } from "sonner";

const carriers = [
  "Delhivery",
  "BlueDart",
  "DTDC",
  "Ecom Express",
  "FedEx",
  "India Post",
  "XpressBees",
  "Shadowfax",
  "Dunzo",
  "Other",
];

export default function MerchantAddTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { order, isLoading: orderLoading } = useMerchantOrderDetails(orderId);
  const { tracking, addTracking, isAdding } = useMerchantTracking(orderId);

  const [formData, setFormData] = useState<TrackingFormData>({
    tracking_number: "",
    carrier: "",
    estimated_delivery: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TrackingFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TrackingFormData, string>> = {};

    if (!formData.tracking_number.trim()) {
      newErrors.tracking_number = "Tracking number is required";
    }
    if (!formData.carrier) {
      newErrors.carrier = "Please select a carrier";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    addTracking(formData, {
      onSuccess: () => {
        navigate(`/merchant/order/${orderId}`);
      },
    });
  };

  if (orderLoading) {
    return (
      <MerchantLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </MerchantLayout>
    );
  }

  if (!order) {
    return (
      <MerchantLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This order doesn't exist or you don't have access to it.
          </p>
          <Button asChild>
            <Link to="/merchant/orders">Back to Orders</Link>
          </Button>
        </div>
      </MerchantLayout>
    );
  }

  if (tracking) {
    return (
      <MerchantLayout>
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Truck className="h-16 w-16 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Tracking Already Exists</h2>
            <p className="text-muted-foreground mb-4">
              This order already has tracking information. You can edit it instead.
            </p>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link to={`/merchant/order/${orderId}`}>View Order</Link>
              </Button>
              <Button asChild>
                <Link to={`/merchant/order/${orderId}/tracking/edit`}>Edit Tracking</Link>
              </Button>
            </div>
          </div>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Seo
        title="Add Tracking | Merchant Portal"
        description="Add shipment tracking information for your order"
        canonicalPath={`/merchant/order/${orderId}/tracking/add`}
      />

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/merchant/order/${orderId}`)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Add Tracking</h1>
            <p className="text-sm text-muted-foreground">
              Order #{orderId?.slice(0, 8)}
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{order.product_name}</p>
                <p className="text-sm text-muted-foreground">
                  ₹{Number(order.amount).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tracking Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Shipment Details
            </CardTitle>
            <CardDescription>
              Enter the tracking information after dispatching the order
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="tracking_number">
                  Tracking Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tracking_number"
                  placeholder="Enter tracking/AWB number"
                  value={formData.tracking_number}
                  onChange={(e) =>
                    setFormData({ ...formData, tracking_number: e.target.value })
                  }
                  className={errors.tracking_number ? "border-destructive" : ""}
                />
                {errors.tracking_number && (
                  <p className="text-sm text-destructive">{errors.tracking_number}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="carrier">
                  Courier Partner <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.carrier}
                  onValueChange={(value) => setFormData({ ...formData, carrier: value })}
                >
                  <SelectTrigger className={errors.carrier ? "border-destructive" : ""}>
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {carriers.map((carrier) => (
                      <SelectItem key={carrier} value={carrier}>
                        {carrier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.carrier && (
                  <p className="text-sm text-destructive">{errors.carrier}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="estimated_delivery">Estimated Delivery Date</Label>
                <Input
                  id="estimated_delivery"
                  type="date"
                  value={formData.estimated_delivery}
                  onChange={(e) =>
                    setFormData({ ...formData, estimated_delivery: e.target.value })
                  }
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about the shipment..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/merchant/order/${orderId}`)}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isAdding}>
                  {isAdding ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4 mr-2" />
                      Add Tracking
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
