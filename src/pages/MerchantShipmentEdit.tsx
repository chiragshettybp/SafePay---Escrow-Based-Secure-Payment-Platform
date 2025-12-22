import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowLeft, Package, Loader2, Truck } from "lucide-react";
import { format } from "date-fns";
import { useMerchantShipment, useMerchantShipments, CARRIERS } from "@/hooks/useMerchantShipments";

interface FormData {
  carrier: string;
  tracking_number: string;
  estimated_delivery: string;
  notes: string;
}

interface FormErrors {
  carrier?: string;
  tracking_number?: string;
}

export default function MerchantShipmentEdit() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const navigate = useNavigate();

  const { shipment, isLoading } = useMerchantShipment(shipmentId);
  const { updateShipment, isUpdating } = useMerchantShipments();

  const [formData, setFormData] = useState<FormData>({
    carrier: "",
    tracking_number: "",
    estimated_delivery: "",
    notes: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (shipment) {
      setFormData({
        carrier: shipment.carrier || "",
        tracking_number: shipment.tracking_number || "",
        estimated_delivery: shipment.estimated_delivery
          ? format(new Date(shipment.estimated_delivery), "yyyy-MM-dd")
          : "",
        notes: "",
      });
    }
  }, [shipment]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.carrier) {
      newErrors.carrier = "Please select a carrier";
    }
    if (!formData.tracking_number.trim()) {
      newErrors.tracking_number = "Tracking number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !shipmentId) return;

    updateShipment(
      {
        shipmentId,
        data: {
          carrier: formData.carrier,
          tracking_number: formData.tracking_number.trim(),
          estimated_delivery: formData.estimated_delivery || undefined,
          notes: formData.notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          navigate(`/merchant/shipments/${shipmentId}`);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <MerchantLayout>
        <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MerchantLayout>
    );
  }

  if (!shipment) {
    return (
      <MerchantLayout>
        <div className="p-4 sm:p-6 max-w-2xl mx-auto">
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Shipment not found</h3>
              <Button className="mt-4" onClick={() => navigate("/merchant/shipments")}>
                Back to Shipments
              </Button>
            </CardContent>
          </Card>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Seo
        title="Edit Shipment | Merchant"
        description="Update shipment details and tracking information"
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-2xl mx-auto pb-24 sm:pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-bold">Edit Shipment</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-mono">
              {shipmentId?.slice(0, 12)}...
            </p>
          </div>
        </div>

        {/* Order Summary */}
        <Card className="border-0 shadow-sm bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center shrink-0">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{shipment.order?.product_name}</h3>
                <p className="text-xs text-muted-foreground">
                  ₹{shipment.order?.amount?.toLocaleString()}
                </p>
              </div>
              <Badge variant="secondary" className="shrink-0 capitalize">
                {shipment.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Current Info */}
        <Card className="border-0 shadow-sm bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-sm text-primary mb-2">
              <Truck className="h-4 w-4" />
              Current Tracking
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Carrier:</span>
                <span className="ml-2 font-medium">{shipment.carrier || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tracking:</span>
                <span className="ml-2 font-mono">{shipment.tracking_number || "N/A"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Update Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Carrier */}
              <div className="space-y-2">
                <Label htmlFor="carrier">
                  Courier / Carrier <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.carrier}
                  onValueChange={(v) => setFormData({ ...formData, carrier: v })}
                >
                  <SelectTrigger
                    id="carrier"
                    className={`h-12 ${errors.carrier ? "border-destructive" : ""}`}
                  >
                    <SelectValue placeholder="Select carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    {CARRIERS.map((carrier) => (
                      <SelectItem key={carrier} value={carrier}>
                        {carrier}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.carrier && (
                  <p className="text-xs text-destructive">{errors.carrier}</p>
                )}
              </div>

              {/* Tracking Number */}
              <div className="space-y-2">
                <Label htmlFor="tracking_number">
                  Tracking Number <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="tracking_number"
                  placeholder="Enter tracking number"
                  value={formData.tracking_number}
                  onChange={(e) =>
                    setFormData({ ...formData, tracking_number: e.target.value })
                  }
                  className={`h-12 ${errors.tracking_number ? "border-destructive" : ""}`}
                />
                {errors.tracking_number && (
                  <p className="text-xs text-destructive">{errors.tracking_number}</p>
                )}
              </div>

              {/* Estimated Delivery */}
              <div className="space-y-2">
                <Label htmlFor="estimated_delivery">Estimated Delivery Date</Label>
                <Input
                  id="estimated_delivery"
                  type="date"
                  value={formData.estimated_delivery}
                  onChange={(e) =>
                    setFormData({ ...formData, estimated_delivery: e.target.value })
                  }
                  className="h-12"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Update Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Describe what changed..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions - Desktop */}
          <div className="hidden sm:flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>

        {/* Sticky Actions - Mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-background border-t sm:hidden">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11"
              disabled={isUpdating}
              onClick={handleSubmit}
            >
              {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
}
