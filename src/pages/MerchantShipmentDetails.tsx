import { useParams, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Package,
  Truck,
  MapPin,
  Calendar,
  User,
  Phone,
  Clock,
  Edit,
  RefreshCw,
  Upload,
  ExternalLink,
  CheckCircle,
  XCircle,
  Image,
} from "lucide-react";
import { format } from "date-fns";
import {
  useMerchantShipment,
  useMerchantShipmentEvents,
  useMerchantShipmentProofs,
} from "@/hooks/useMerchantShipments";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-yellow-500" },
  packed: { label: "Packed", color: "bg-blue-500" },
  shipped: { label: "Shipped", color: "bg-indigo-500" },
  in_transit: { label: "In Transit", color: "bg-purple-500" },
  out_for_delivery: { label: "Out for Delivery", color: "bg-orange-500" },
  delivered: { label: "Delivered", color: "bg-green-500" },
  failed: { label: "Failed", color: "bg-red-500" },
};

export default function MerchantShipmentDetails() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const navigate = useNavigate();

  const { shipment, isLoading } = useMerchantShipment(shipmentId);
  const { events, isLoading: eventsLoading } = useMerchantShipmentEvents(shipmentId);
  const { proofs, getFileUrl, isLoading: proofsLoading } = useMerchantShipmentProofs(shipment?.order_id);

  if (isLoading) {
    return (
      <MerchantLayout>
        <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MerchantLayout>
    );
  }

  if (!shipment) {
    return (
      <MerchantLayout>
        <div className="p-4 sm:p-6 max-w-4xl mx-auto">
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

  const status = statusConfig[shipment.status] || statusConfig.pending;

  return (
    <MerchantLayout>
      <Seo
        title="Shipment Details | Merchant"
        description="View shipment details and tracking information"
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto pb-24 sm:pb-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/merchant/shipments")}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold truncate">Shipment Details</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-mono">
              {shipmentId?.slice(0, 12)}...
            </p>
          </div>
          <Badge className={`${status.color} text-white shrink-0`}>
            {status.label}
          </Badge>
        </div>

        {/* Shipment Summary */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Shipment Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" />
                  Carrier
                </div>
                <p className="font-medium text-sm">{shipment.carrier || "Not specified"}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Package className="h-3.5 w-3.5" />
                  Tracking Number
                </div>
                <p className="font-mono text-sm">{shipment.tracking_number || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  Current Location
                </div>
                <p className="font-medium text-sm">{shipment.location || "Unknown"}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  Est. Delivery
                </div>
                <p className="font-medium text-sm">
                  {shipment.estimated_delivery
                    ? format(new Date(shipment.estimated_delivery), "MMM d, yyyy")
                    : "Not set"}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Created: {format(new Date(shipment.created_at), "MMM d, yyyy HH:mm")}</span>
              <span>Updated: {format(new Date(shipment.updated_at), "MMM d, yyyy HH:mm")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-lg flex items-center justify-center shrink-0">
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm sm:text-base truncate">
                  {shipment.order?.product_name}
                </h3>
                <p className="text-sm font-semibold mt-1">
                  ₹{shipment.order?.amount?.toLocaleString()}
                </p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <User className="h-3.5 w-3.5" />
                  Customer
                </div>
                <p className="font-medium text-sm">{shipment.customer?.full_name || "Unknown"}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  Phone
                </div>
                <p className="font-medium text-sm">{shipment.customer?.phone || "N/A"}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => navigate(`/merchant/order/${shipment.order_id}`)}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full Order
            </Button>
          </CardContent>
        </Card>

        {/* Timeline Preview */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Updates</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/merchant/shipments/${shipmentId}/timeline`)}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No tracking events yet
              </p>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 3).map((event, index) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${index === 0 ? "bg-primary" : "bg-muted-foreground/30"}`} />
                      {index < Math.min(events.length, 3) - 1 && (
                        <div className="w-0.5 flex-1 bg-muted-foreground/20 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm capitalize">
                          {event.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(event.occurred_at), "MMM d, HH:mm")}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.description}
                        </p>
                      )}
                      {event.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Proofs */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Delivery Proofs</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/merchant/shipments/${shipmentId}/proof`)}
            >
              Upload
            </Button>
          </CardHeader>
          <CardContent>
            {proofsLoading ? (
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="aspect-square" />
                <Skeleton className="aspect-square" />
              </div>
            ) : proofs.length === 0 ? (
              <div className="text-center py-6">
                <Image className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No proofs uploaded</p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate(`/merchant/shipments/${shipmentId}/proof`)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Proof
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {proofs.map((proof) => (
                  <a
                    key={proof.id}
                    href={getFileUrl(proof.file_path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square bg-muted rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={getFileUrl(proof.file_path)}
                      alt="Delivery proof"
                      className="w-full h-full object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sticky Actions - Mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-background border-t sm:hidden">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => navigate(`/merchant/shipments/${shipmentId}/edit`)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button
              className="flex-1 h-11"
              onClick={() => navigate(`/merchant/shipments/${shipmentId}/status`)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Status
            </Button>
          </div>
        </div>

        {/* Desktop Actions */}
        <div className="hidden sm:flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/merchant/shipments/${shipmentId}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Shipment
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/merchant/shipments/${shipmentId}/proof`)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Proof
          </Button>
          <Button
            className="flex-1"
            onClick={() => navigate(`/merchant/shipments/${shipmentId}/status`)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Update Status
          </Button>
        </div>
      </div>
    </MerchantLayout>
  );
}
