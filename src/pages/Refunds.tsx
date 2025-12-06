import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Search, Filter, CreditCard, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useRefunds } from '@/hooks/useRefunds';

const statusConfig = {
  initiated: { label: 'Initiated', variant: 'secondary' as const, icon: Clock },
  processing: { label: 'Processing', variant: 'outline' as const, icon: RefreshCw },
  success: { label: 'Completed', variant: 'default' as const, icon: CheckCircle },
  failed: { label: 'Failed', variant: 'destructive' as const, icon: XCircle },
};

const Refunds = () => {
  const { refunds, isLoading } = useRefunds();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredRefunds = refunds?.filter((refund) => {
    const matchesSearch =
      refund.orders?.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      refund.orders?.merchant_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      refund.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || refund.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const metrics = {
    total: refunds?.length || 0,
    completed: refunds?.filter((r) => r.status === 'success').length || 0,
    pending: refunds?.filter((r) => r.status === 'initiated' || r.status === 'processing').length || 0,
    failed: refunds?.filter((r) => r.status === 'failed').length || 0,
    totalAmount: refunds?.filter((r) => r.status === 'success').reduce((sum, r) => sum + r.amount, 0) || 0,
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.initiated;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getRefundLink = (refund: { id: string; status: string }) => {
    switch (refund.status) {
      case 'success':
        return `/refund/${refund.id}/success`;
      case 'failed':
        return `/refund/${refund.id}/failed`;
      default:
        return `/refund/${refund.id}`;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Refunds</h1>
          <p className="text-muted-foreground">Track all your refund requests and their status</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Refunds</p>
                  <p className="text-2xl font-bold">{metrics.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{metrics.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">{metrics.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Refunded</p>
                  <p className="text-2xl font-bold">₹{metrics.totalAmount.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by product, merchant, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="initiated">Initiated</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="success">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Refunds List */}
        <Card>
          <CardHeader>
            <CardTitle>Refund History</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredRefunds && filteredRefunds.length > 0 ? (
              <div className="space-y-3">
                {filteredRefunds.map((refund) => (
                  <Link
                    key={refund.id}
                    to={getRefundLink(refund)}
                    className="block p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            {refund.orders?.product_name || 'Unknown Product'}
                          </p>
                          {getStatusBadge(refund.status)}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <span>{refund.orders?.merchant_name || 'Unknown Merchant'}</span>
                          <span className="font-mono text-xs">#{refund.id.slice(0, 8)}</span>
                          <span>{format(new Date(refund.created_at), 'PP')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">
                          ₹{refund.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {refund.reason.replace(/_/g, ' ')}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No refunds found</p>
                {searchQuery || statusFilter !== 'all' ? (
                  <Button
                    variant="link"
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Refunds;
