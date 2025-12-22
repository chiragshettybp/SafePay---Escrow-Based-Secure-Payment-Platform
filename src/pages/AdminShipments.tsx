import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminShipments } from '@/hooks/useAdminShipments';
import {
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
} from 'lucide-react';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  pending: { label: 'Pending', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
  picked: { label: 'Picked Up', variant: 'outline', icon: <Package className="h-3 w-3" /> },
  in_transit: { label: 'In Transit', variant: 'default', icon: <Truck className="h-3 w-3" /> },
  out_for_delivery: { label: 'Out for Delivery', variant: 'default', icon: <Truck className="h-3 w-3" /> },
  delivered: { label: 'Delivered', variant: 'default', icon: <CheckCircle className="h-3 w-3" /> },
  failed: { label: 'Failed', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
  returned: { label: 'Returned', variant: 'destructive', icon: <AlertTriangle className="h-3 w-3" /> },
};

export default function AdminShipments() {
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const {
    shipments,
    loading,
    stats,
    filters,
    setFilters,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    totalPages,
    refetch,
  } = useAdminShipments();

  const handleSearch = () => {
    setFilters({ ...filters, search: searchInput });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearFilters = () => {
    setFilters({});
    setSearchInput('');
  };

  const getStatusBadge = (status: string, isDelayed: boolean) => {
    const config = statusConfig[status] || { label: status, variant: 'secondary' as const, icon: null };
    return (
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} className="flex items-center gap-1">
          {config.icon}
          {config.label}
        </Badge>
        {isDelayed && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Delayed
          </Badge>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Shipments</h1>
            <p className="text-muted-foreground">
              Monitor and manage all shipments across the platform
            </p>
          </div>
          <Button variant="outline" onClick={refetch} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-5">
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilters({})}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilters({ status: 'in_transit' })}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Transit</CardTitle>
              <Truck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inTransit}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilters({ status: 'delivered' })}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.delivered}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilters({ isDelayed: true })}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delayed</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.delayed}</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setFilters({ status: 'failed' })}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search by tracking number or shipment ID..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      className="pl-9"
                    />
                  </div>
                  <Button onClick={handleSearch}>Search</Button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2"
                >
                  <Filter className="h-4 w-4" />
                  Filters
                </Button>
              </div>

              {showFilters && (
                <div className="grid gap-4 md:grid-cols-4 pt-4 border-t">
                  <Select
                    value={filters.status || 'all'}
                    onValueChange={(value) =>
                      setFilters({ ...filters, status: value === 'all' ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="picked">Picked Up</SelectItem>
                      <SelectItem value="in_transit">In Transit</SelectItem>
                      <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                      <SelectItem value="delivered">Delivered</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="returned">Returned</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filters.isDelayed === undefined ? 'all' : filters.isDelayed ? 'delayed' : 'on_time'}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        isDelayed: value === 'all' ? undefined : value === 'delayed',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Delay Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Shipments</SelectItem>
                      <SelectItem value="delayed">Delayed Only</SelectItem>
                      <SelectItem value="on_time">On Time Only</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={sortBy}
                    onValueChange={(value) => setSortBy(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Created Date</SelectItem>
                      <SelectItem value="updated_at">Last Updated</SelectItem>
                      <SelectItem value="estimated_delivery">Delivery Date</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={sortOrder}
                    onValueChange={(value) => setSortOrder(value as 'asc' | 'desc')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Order" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Newest First</SelectItem>
                      <SelectItem value="asc">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="ghost" onClick={clearFilters} className="md:col-start-4">
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Shipments Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : shipments.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No shipments found</h3>
                <p className="text-muted-foreground">
                  {Object.keys(filters).length > 0
                    ? 'Try adjusting your filters'
                    : 'Shipments will appear here once created'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shipment</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Carrier</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expected Delivery</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {shipments.map((shipment) => (
                        <TableRow
                          key={shipment.id}
                          className="cursor-pointer hover:bg-accent/50"
                          onClick={() => navigate(`/admin/shipments/${shipment.id}`)}
                        >
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {shipment.shipment_number || shipment.id.slice(0, 8)}
                              </span>
                              {shipment.tracking_number && (
                                <span className="text-xs text-muted-foreground">
                                  {shipment.tracking_number}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">
                              {shipment.order?.id?.slice(0, 8) || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {shipment.merchant?.business_name || shipment.order?.merchant_name || '-'}
                          </TableCell>
                          <TableCell>
                            {shipment.logistics_provider || shipment.carrier || '-'}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(shipment.status, shipment.is_delayed)}
                          </TableCell>
                          <TableCell>
                            {shipment.expected_delivery_date || shipment.estimated_delivery
                              ? format(
                                  new Date(shipment.expected_delivery_date || shipment.estimated_delivery!),
                                  'MMM d, yyyy'
                                )
                              : '-'}
                          </TableCell>
                          <TableCell>
                            {format(new Date(shipment.created_at), 'MMM d, yyyy')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y">
                  {shipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="p-4 cursor-pointer hover:bg-accent/50"
                      onClick={() => navigate(`/admin/shipments/${shipment.id}`)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-medium">
                            {shipment.shipment_number || shipment.id.slice(0, 8)}
                          </span>
                          {shipment.tracking_number && (
                            <p className="text-xs text-muted-foreground">
                              {shipment.tracking_number}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(shipment.status, shipment.is_delayed)}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Merchant:</span>{' '}
                          <span>{shipment.merchant?.business_name || shipment.order?.merchant_name || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Carrier:</span>{' '}
                          <span>{shipment.logistics_provider || shipment.carrier || '-'}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Expected:</span>{' '}
                          <span>
                            {shipment.expected_delivery_date || shipment.estimated_delivery
                              ? format(
                                  new Date(shipment.expected_delivery_date || shipment.estimated_delivery!),
                                  'MMM d'
                                )
                              : '-'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>{' '}
                          <span>{format(new Date(shipment.created_at), 'MMM d')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between p-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.min(totalPages, page + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
