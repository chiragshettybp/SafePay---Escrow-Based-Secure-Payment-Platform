import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Package,
  Layers,
  RefreshCw,
  Truck,
  Loader2,
  Download,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import {
  useMerchantShipments,
  CARRIERS,
  SHIPMENT_STATUSES,
  type ShipmentStatus,
} from "@/hooks/useMerchantShipments";
import { toast } from "sonner";

type BulkAction = "status" | "carrier" | "export";

export default function MerchantShipmentsBulk() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedIds = searchParams.get("ids")?.split(",") || [];

  const { shipments, isLoading, bulkUpdate, isBulkUpdating } = useMerchantShipments();

  const [selectedIds, setSelectedIds] = useState<string[]>(preselectedIds);
  const [action, setAction] = useState<BulkAction | "">("");
  const [newStatus, setNewStatus] = useState<ShipmentStatus | "">("");
  const [newCarrier, setNewCarrier] = useState("");
  const [notes, setNotes] = useState("");

  const selectedShipments = shipments.filter((s) => selectedIds.includes(s.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedIds(shipments.map((s) => s.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const handleExport = () => {
    if (selectedShipments.length === 0) {
      toast.error("Select shipments to export");
      return;
    }

    const csvContent = [
      ["Shipment ID", "Order ID", "Product", "Customer", "Carrier", "Tracking", "Status", "Updated"].join(","),
      ...selectedShipments.map((s) =>
        [
          s.id,
          s.order_id,
          `"${s.order?.product_name || ""}"`,
          `"${s.customer?.full_name || ""}"`,
          s.carrier || "",
          s.tracking_number || "",
          s.status,
          format(new Date(s.updated_at), "yyyy-MM-dd HH:mm"),
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shipments-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${selectedShipments.length} shipments`);
  };

  const handleBulkUpdate = () => {
    if (selectedIds.length === 0) {
      toast.error("Select shipments to update");
      return;
    }

    if (action === "status" && !newStatus) {
      toast.error("Select a status");
      return;
    }

    if (action === "carrier" && !newCarrier) {
      toast.error("Select a carrier");
      return;
    }

    if (action === "export") {
      handleExport();
      return;
    }

    bulkUpdate(
      {
        shipmentIds: selectedIds,
        action: action as "status" | "carrier",
        data: {
          status: action === "status" ? (newStatus as ShipmentStatus) : undefined,
          carrier: action === "carrier" ? newCarrier : undefined,
          notes: notes.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          navigate("/merchant/shipments");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <MerchantLayout>
        <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Seo
        title="Bulk Actions | Shipments"
        description="Perform bulk actions on multiple shipments"
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
          <div className="flex-1">
            <h1 className="text-lg sm:text-xl font-bold">Bulk Actions</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Update multiple shipments at once
            </p>
          </div>
          <Badge variant="secondary" className="shrink-0">
            {selectedIds.length} selected
          </Badge>
        </div>

        {/* Selection Summary */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Select Shipments
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {shipments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No shipments available
              </p>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {shipments.map((shipment) => (
                  <div
                    key={shipment.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                      selectedIds.includes(shipment.id)
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => toggleSelect(shipment.id)}
                  >
                    <Checkbox
                      checked={selectedIds.includes(shipment.id)}
                      onCheckedChange={() => toggleSelect(shipment.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {shipment.order?.product_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {shipment.carrier} • {shipment.tracking_number?.slice(0, 12) || "N/A"}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0 capitalize text-xs">
                      {shipment.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Selection */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Choose Action</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={action === "status" ? "default" : "outline"}
                className="h-auto py-3 flex flex-col gap-1"
                onClick={() => setAction("status")}
              >
                <RefreshCw className="h-5 w-5" />
                <span className="text-xs">Update Status</span>
              </Button>
              <Button
                variant={action === "carrier" ? "default" : "outline"}
                className="h-auto py-3 flex flex-col gap-1"
                onClick={() => setAction("carrier")}
              >
                <Truck className="h-5 w-5" />
                <span className="text-xs">Change Carrier</span>
              </Button>
              <Button
                variant={action === "export" ? "default" : "outline"}
                className="h-auto py-3 flex flex-col gap-1"
                onClick={() => setAction("export")}
              >
                <Download className="h-5 w-5" />
                <span className="text-xs">Export CSV</span>
              </Button>
            </div>

            {/* Action-specific fields */}
            {action === "status" && (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label>New Status</Label>
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as ShipmentStatus)}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {SHIPMENT_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (optional)</Label>
                  <Textarea
                    placeholder="Add notes for this update..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            )}

            {action === "carrier" && (
              <div className="space-y-3 pt-2">
                <div className="space-y-2">
                  <Label>New Carrier</Label>
                  <Select value={newCarrier} onValueChange={setNewCarrier}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select carrier" />
                    </SelectTrigger>
                    <SelectContent>
                      {CARRIERS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {action === "export" && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="text-muted-foreground">
                  Export {selectedIds.length} selected shipments to CSV file with all details.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Warning */}
        {selectedIds.length > 0 && action && action !== "export" && (
          <Card className="border-0 shadow-sm bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm text-amber-800">
                    Bulk Update Warning
                  </p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    This will update {selectedIds.length} shipment(s). This action cannot be undone.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions - Desktop */}
        <div className="hidden sm:flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate("/merchant/shipments")}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            disabled={selectedIds.length === 0 || !action || isBulkUpdating}
            onClick={handleBulkUpdate}
          >
            {isBulkUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {action === "export"
              ? `Export ${selectedIds.length} Shipments`
              : `Update ${selectedIds.length} Shipments`}
          </Button>
        </div>

        {/* Sticky Actions - Mobile */}
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-background border-t sm:hidden">
          <div className="flex gap-2 max-w-4xl mx-auto">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => navigate("/merchant/shipments")}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-11"
              disabled={selectedIds.length === 0 || !action || isBulkUpdating}
              onClick={handleBulkUpdate}
            >
              {isBulkUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {action === "export" ? "Export" : "Update"} ({selectedIds.length})
            </Button>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
}
