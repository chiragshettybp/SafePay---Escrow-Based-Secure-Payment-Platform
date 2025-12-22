import { useParams, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Package,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  MapPin,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import {
  useMerchantShipment,
  useMerchantShipmentEvents,
} from "@/hooks/useMerchantShipments";

const statusConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: "bg-yellow-500" },
  packed: { icon: <Package className="h-4 w-4" />, color: "bg-blue-500" },
  shipped: { icon: <Truck className="h-4 w-4" />, color: "bg-indigo-500" },
  in_transit: { icon: <Truck className="h-4 w-4" />, color: "bg-purple-500" },
  out_for_delivery: { icon: <Truck className="h-4 w-4" />, color: "bg-orange-500" },
  delivered: { icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-500" },
  failed: { icon: <XCircle className="h-4 w-4" />, color: "bg-red-500" },
  updated: { icon: <Clock className="h-4 w-4" />, color: "bg-gray-500" },
};

export default function MerchantShipmentTimeline() {
  const { shipmentId } = useParams<{ shipmentId: string }>();
  const navigate = useNavigate();

  const { shipment, isLoading: shipmentLoading } = useMerchantShipment(shipmentId);
  const { events, isLoading: eventsLoading } = useMerchantShipmentEvents(shipmentId);

  const isLoading = shipmentLoading || eventsLoading;

  if (isLoading) {
    return (
      <MerchantLayout>
        <div className="p-4 sm:p-6 space-y-4 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
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
        title="Shipment Timeline | Merchant"
        description="View complete shipment history and tracking events"
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-2xl mx-auto">
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
            <h1 className="text-lg sm:text-xl font-bold">Shipment Timeline</h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-mono">
              {shipmentId?.slice(0, 12)}...
            </p>
          </div>
        </div>

        {/* Shipment Summary */}
        <Card className="border-0 shadow-sm bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-background rounded-lg flex items-center justify-center shrink-0">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">
                  {shipment.order?.product_name}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{shipment.carrier || "N/A"}</span>
                  <span>•</span>
                  <span className="font-mono">{shipment.tracking_number || "N/A"}</span>
                </div>
              </div>
              <Badge
                className={`${statusConfig[shipment.status]?.color || "bg-gray-500"} text-white shrink-0`}
              >
                {shipment.status.replace(/_/g, " ")}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Tracking History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No tracking events yet</p>
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => navigate(`/merchant/shipments/${shipmentId}/status`)}
                >
                  Add First Update
                </Button>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-border" />

                <div className="space-y-0">
                  {events.map((event, index) => {
                    const config = statusConfig[event.status] || statusConfig.updated;
                    const isFirst = index === 0;

                    return (
                      <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
                        {/* Timeline dot */}
                        <div
                          className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white ${
                            isFirst ? config.color : "bg-muted-foreground/30"
                          }`}
                        >
                          {isFirst ? config.icon : <div className="w-2 h-2 rounded-full bg-background" />}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium text-sm capitalize">
                                {event.status.replace(/_/g, " ")}
                              </h4>
                              {event.description && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {event.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(event.occurred_at), "MMM d, yyyy")}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {format(new Date(event.occurred_at), "HH:mm")}
                            </span>
                            {event.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {event.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate(`/merchant/shipments/${shipmentId}`)}
          >
            View Details
          </Button>
          <Button
            className="flex-1"
            onClick={() => navigate(`/merchant/shipments/${shipmentId}/status`)}
          >
            Add Update
          </Button>
        </div>
      </div>
    </MerchantLayout>
  );
}
