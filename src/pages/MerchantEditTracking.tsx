import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { useMerchantTracking } from "@/hooks/useMerchantTracking";
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
import { ArrowLeft, Truck, Loader2, AlertTriangle, Package, MapPin } from "lucide-react";

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

const trackingStatuses = [
  { value: "pending", label: "Pending" },
  { value: "picked_up", label: "Picked Up" },
  { value: "in_transit", label: "In Transit" },
  { value: "out_for_delivery", label: "Out for Delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "returned", label: "Returned" },
];

export default function MerchantEditTracking() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { order, isLoading: orderLoading } = useMerchantOrderDetails(orderId);
  const { tracking, isLoading: trackingLoading, updateTracking, isUpdating } = useMerchantTracking(orderId);

  const [formData, setFormData] = useState({
    tracking_number: "",
    carrier: "",
    status: "",
    location: "",
    estimated_delivery: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  // Initialize form with existing tracking data
  useEffect(() => {
    if (tracking) {
      setFormData({
        tracking_number: tracking.tracking_number || "",
        carrier: tracking.carrier || "",
        status: tracking.status || "",
        location: tracking.location || "",
        estimated_delivery: tracking.estimated_delivery?.split("T")[0] || "",
        notes: "",
      });
    }
  }, [tracking]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};

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
    if (!validate() || !tracking) return;

    updateTracking(
      {
        trackingId: tracking.id,
        formData: {
          tracking_number: formData.tracking_number,
          carrier: formData.carrier,
          status: formData.status,
          location: formData.location || undefined,
          estimated_delivery: formData.estimated_delivery || undefined,
          notes: formData.notes || undefined,
        },
      },
      {
        onSuccess: () => {
          navigate(`/merchant/order/${orderId}`);
        },
      }
    );
  };

  if (orderLoading || trackingLoading) {
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

  if (!tracking) {
    return (
      <MerchantLayout>
        <div className="max-w-2xl mx-auto">
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Truck className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Tracking Found</h2>
            <p className="text-muted-foreground mb-4">
              This order doesn't have tracking information yet. Add it first.
            </p>
            <div className="flex gap-3">
              <Button asChild variant="outline">
                <Link to={`/merchant/order/${orderId}`}>View Order</Link>
              </Button>
              <Button asChild>
                <Link to={`/merchant/order/${orderId}/tracking/add`}>Add Tracking</Link>
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
        title="Edit Tracking | Merchant Portal"
        description="Update shipment tracking information"
        canonicalPath={`/merchant/order/${orderId}/tracking/edit`}
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
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Edit Tracking</h1>
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
              Update Shipment Details
            </CardTitle>
            <CardDescription>
              Modify the tracking information as the shipment progresses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
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
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="status">Shipment Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {trackingStatuses.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estimated_delivery">Estimated Delivery</Label>
                  <Input
                    id="estimated_delivery"
                    type="date"
                    value={formData.estimated_delivery}
                    onChange={(e) =>
                      setFormData({ ...formData, estimated_delivery: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Current Location
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., Mumbai Hub, In Transit to Bangalore"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Update Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any notes about this update..."
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
                <Button type="submit" className="flex-1" disabled={isUpdating}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Truck className="h-4 w-4 mr-2" />
                      Update Tracking
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
