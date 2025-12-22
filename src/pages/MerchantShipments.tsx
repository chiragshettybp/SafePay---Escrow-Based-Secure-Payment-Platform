import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Seo } from "@/components/seo/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Package,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  RefreshCw,
  Upload,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  ChevronRight,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { 
  useMerchantShipments, 
  CARRIERS, 
  SHIPMENT_STATUSES,
  type ShipmentFilters,
  type Shipment,
} from "@/hooks/useMerchantShipments";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "outline" },
  packed: { label: "Packed", variant: "secondary" },
  shipped: { label: "Shipped", variant: "default" },
  in_transit: { label: "In Transit", variant: "default" },
  out_for_delivery: { label: "Out for Delivery", variant: "default" },
  delivered: { label: "Delivered", variant: "secondary" },
  failed: { label: "Failed", variant: "destructive" },
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending": return <Clock className="h-3.5 w-3.5" />;
    case "packed": return <Package className="h-3.5 w-3.5" />;
    case "shipped":
    case "in_transit":
    case "out_for_delivery": return <Truck className="h-3.5 w-3.5" />;
    case "delivered": return <CheckCircle className="h-3.5 w-3.5" />;
    case "failed": return <XCircle className="h-3.5 w-3.5" />;
    default: return <Package className="h-3.5 w-3.5" />;
  }
};

export default function MerchantShipments() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<ShipmentFilters>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { shipments, isLoading, refetch } = useMerchantShipments({
    ...filters,
    search: searchQuery || undefined,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    refetch();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === shipments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(shipments.map((s) => s.id));
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery("");
  };

  return (
    <MerchantLayout>
      <Seo
        title="Shipments | Merchant"
        description="Manage your order shipments and tracking"
      />

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Shipments</h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Manage tracking and deliveries
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-9"
            >
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            {selectedIds.length > 0 && (
              <Button
                size="sm"
                onClick={() => navigate("/merchant/shipments/bulk")}
                className="h-9"
              >
                <Layers className="h-4 w-4 mr-2" />
                Bulk Actions ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by tracking number or order..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
              </form>

              {/* Desktop Filters */}
              <div className="hidden md:flex items-center gap-2">
                <Select
                  value={filters.status || "all"}
                  onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}
                >
                  <SelectTrigger className="w-[140px] h-10">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {SHIPMENT_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={filters.carrier || "all"}
                  onValueChange={(v) => setFilters({ ...filters, carrier: v === "all" ? undefined : v })}
                >
                  <SelectTrigger className="w-[140px] h-10">
                    <SelectValue placeholder="Carrier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Carriers</SelectItem>
                    {CARRIERS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {(filters.status || filters.carrier) && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear
                  </Button>
                )}
              </div>

              {/* Mobile Filter Button */}
              <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="md:hidden h-10 w-10">
                    <Filter className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[60vh]">
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <Select
                        value={filters.status || "all"}
                        onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? undefined : v })}
                      >
                        <SelectTrigger className="w-full h-12">
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          {SHIPMENT_STATUSES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Carrier</label>
                      <Select
                        value={filters.carrier || "all"}
                        onValueChange={(v) => setFilters({ ...filters, carrier: v === "all" ? undefined : v })}
                      >
                        <SelectTrigger className="w-full h-12">
                          <SelectValue placeholder="All Carriers" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Carriers</SelectItem>
                          {CARRIERS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button variant="outline" className="flex-1 h-12" onClick={clearFilters}>
                        Clear All
                      </Button>
                      <Button className="flex-1 h-12" onClick={() => setFiltersOpen(false)}>
                        Apply Filters
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && shipments.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No shipments found</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create shipments from your orders page
              </p>
              <Button className="mt-4" onClick={() => navigate("/merchant/orders")}>
                View Orders
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Desktop Table */}
        {!isLoading && shipments.length > 0 && (
          <Card className="border-0 shadow-sm hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedIds.length === shipments.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Shipment ID</TableHead>
                  <TableHead>Order / Product</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Tracking #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shipments.map((shipment) => (
                  <ShipmentRow
                    key={shipment.id}
                    shipment={shipment}
                    isSelected={selectedIds.includes(shipment.id)}
                    onToggleSelect={() => toggleSelect(shipment.id)}
                    onNavigate={navigate}
                  />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Mobile Cards */}
        {!isLoading && shipments.length > 0 && (
          <div className="md:hidden space-y-3">
            {shipments.map((shipment) => (
              <ShipmentCard
                key={shipment.id}
                shipment={shipment}
                isSelected={selectedIds.includes(shipment.id)}
                onToggleSelect={() => toggleSelect(shipment.id)}
                onNavigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}

// Desktop Table Row Component
function ShipmentRow({
  shipment,
  isSelected,
  onToggleSelect,
  onNavigate,
}: {
  shipment: Shipment;
  isSelected: boolean;
  onToggleSelect: () => void;
  onNavigate: (path: string) => void;
}) {
  const status = statusConfig[shipment.status] || statusConfig.pending;

  return (
    <TableRow>
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </TableCell>
      <TableCell className="font-mono text-xs">
        {shipment.id.slice(0, 8)}...
      </TableCell>
      <TableCell>
        <div>
          <div className="font-medium text-sm truncate max-w-[200px]">
            {shipment.order?.product_name}
          </div>
          <div className="text-xs text-muted-foreground font-mono">
            {shipment.order_id.slice(0, 8)}...
          </div>
        </div>
      </TableCell>
      <TableCell className="text-sm">
        {shipment.customer?.full_name || "Unknown"}
      </TableCell>
      <TableCell className="text-sm">{shipment.carrier || "-"}</TableCell>
      <TableCell className="font-mono text-xs">
        {shipment.tracking_number || "-"}
      </TableCell>
      <TableCell>
        <Badge variant={status.variant} className="gap-1">
          {getStatusIcon(shipment.status)}
          {status.label}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {format(new Date(shipment.updated_at), "MMM d, HH:mm")}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onNavigate(`/merchant/shipments/${shipment.id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate(`/merchant/shipments/${shipment.id}/status`)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Update Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate(`/merchant/shipments/${shipment.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Shipment
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate(`/merchant/shipments/${shipment.id}/proof`)}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Proof
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onNavigate(`/merchant/shipments/${shipment.id}/timeline`)}>
              <Clock className="h-4 w-4 mr-2" />
              View Timeline
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// Mobile Card Component
function ShipmentCard({
  shipment,
  isSelected,
  onToggleSelect,
  onNavigate,
}: {
  shipment: Shipment;
  isSelected: boolean;
  onToggleSelect: () => void;
  onNavigate: (path: string) => void;
}) {
  const status = statusConfig[shipment.status] || statusConfig.pending;
  const [actionsOpen, setActionsOpen] = useState(false);

  return (
    <Card className={`border-0 shadow-sm transition-all ${isSelected ? "ring-2 ring-primary" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelect}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-medium text-sm truncate">
                  {shipment.order?.product_name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {shipment.customer?.full_name || "Unknown Customer"}
                </p>
              </div>
              <Badge variant={status.variant} className="gap-1 shrink-0">
                {getStatusIcon(shipment.status)}
                {status.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <div>
                <span className="text-muted-foreground">Carrier:</span>
                <span className="ml-1 font-medium">{shipment.carrier || "-"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Tracking:</span>
                <span className="ml-1 font-mono">{shipment.tracking_number?.slice(0, 10) || "-"}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                Updated {format(new Date(shipment.updated_at), "MMM d, HH:mm")}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-1"
                onClick={() => onNavigate(`/merchant/shipments/${shipment.id}`)}
              >
                Details
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs flex-1"
                onClick={() => onNavigate(`/merchant/shipments/${shipment.id}/status`)}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Status
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs flex-1"
                onClick={() => onNavigate(`/merchant/shipments/${shipment.id}/proof`)}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                Proof
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onNavigate(`/merchant/shipments/${shipment.id}/timeline`)}
              >
                <Clock className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
