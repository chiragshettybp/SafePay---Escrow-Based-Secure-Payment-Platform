import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ArrowLeft,
  Package,
  Loader2,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  MapPin,
} from "lucide-react";
import {
  useMerchantShipment,
  useMerchantShipments,
  SHIPMENT_STATUSES,
  type ShipmentStatus,
} from "@/hooks/useMerchantShipments";

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4" />,
  packed: <Package className="h-4 w-4" />,
  shipped: <Truck className="h-4 w-4" />,
  in_transit: <Truck className="h-4 w-4" />,
  out_for_delivery: <Truck className="h-4 w-4" />,
  delivered: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
};

export default function MerchantShipmentStatus() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const navigate = useNavigate();

  const { shipment, isLoading } = useMerchantShipment(shipmentId);
  const { updateStatus, isUpdatingStatus } = useMerchantShipments();

  const [selectedStatus, setSelectedStatus] = useState<ShipmentStatus | "">("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStatus || !shipmentId) return;

    updateStatus(
      {
        shipmentId,
        data: {
          status: selectedStatus,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
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
        title="Update Status | Merchant"
        description="Update shipment status"
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
            <h1 className="text-lg sm:text-xl font-bold">Update Status</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Change shipment progress
            </p>
          </div>
        </div>

        {/* Current Status */}
        <Card className="border-0 shadow-sm bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center">
                  <Package className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Current Status</p>
                  <p className="font-medium text-sm capitalize">
                    {shipment.status.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="capitalize">
                {shipment.carrier || "N/A"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Select New Status</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedStatus}
                onValueChange={(v) => setSelectedStatus(v as ShipmentStatus)}
                className="space-y-2"
              >
                {SHIPMENT_STATUSES.map((status) => {
                  const isCurrent = status.value === shipment.status;
                  const isDisabled = isCurrent;

                  return (
                    <div
                      key={status.value}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        selectedStatus === status.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      } ${isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                      onClick={() => !isDisabled && setSelectedStatus(status.value)}
                    >
                      <RadioGroupItem
                        value={status.value}
                        id={status.value}
                        disabled={isDisabled}
                        className="shrink-0"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        {statusIcons[status.value]}
                        <Label
                          htmlFor={status.value}
                          className={`cursor-pointer font-medium ${isDisabled ? "cursor-not-allowed" : ""}`}
                        >
                          {status.label}
                        </Label>
                      </div>
                      {isCurrent && (
                        <Badge variant="outline" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location" className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  Current Location
                </Label>
                <Input
                  id="location"
                  placeholder="e.g., Mumbai Hub, Out for delivery from Delhi"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-12"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any status update notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Warning for Delivered */}
          {selectedStatus === "delivered" && (
            <Card className="border-0 shadow-sm bg-green-500/10 border-green-500/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-green-800">
                      Marking as Delivered
                    </p>
                    <p className="text-xs text-green-700 mt-0.5">
                      This will update the order status and notify the customer to confirm delivery.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warning for Failed */}
          {selectedStatus === "failed" && (
            <Card className="border-0 shadow-sm bg-destructive/10 border-destructive/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm text-destructive">
                      Marking as Failed
                    </p>
                    <p className="text-xs text-destructive/80 mt-0.5">
                      The customer will be notified about the delivery failure.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
            <Button
              type="submit"
              className="flex-1"
              disabled={!selectedStatus || isUpdatingStatus}
            >
              {isUpdatingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Status
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
              disabled={!selectedStatus || isUpdatingStatus}
              onClick={handleSubmit}
            >
              {isUpdatingStatus && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Status
            </Button>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
}
