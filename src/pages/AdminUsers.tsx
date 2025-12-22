import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Users, Eye, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export default function AdminUsers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { users, isLoading, filters, setFilters } = useAdminUsers();
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Sync filters with URL
  useEffect(() => {
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    setFilters(prev => ({ ...prev, accountStatus: status, search }));
    setLocalSearch(search);
  }, [searchParams, setFilters]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (localSearch) {
      params.set('search', localSearch);
    } else {
      params.delete('search');
    }
    setSearchParams(params);
  };

  const handleStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams);
    if (status && status !== 'all') {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    setSearchParams(params);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>;
      case 'warned':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Warned</Badge>;
      case 'suspended':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Suspended</Badge>;
      case 'banned':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Banned</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Pagination
  const totalPages = Math.ceil(users.length / pageSize);
  const paginatedUsers = users.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-6 w-6" />
              User Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage customer accounts and enforcement actions
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            Total Users: <span className="font-semibold text-foreground">{users.length}</span>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end">
              <form onSubmit={handleSearchSubmit} className="flex-1">
                <label className="text-sm font-medium mb-2 block">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone, or user ID..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </form>

              <div className="w-full md:w-48">
                <label className="text-sm font-medium mb-2 block">Account Status</label>
                <Select value={filters.accountStatus} onValueChange={handleStatusFilter}>
                  <SelectTrigger>
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="warned">Warned</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full md:w-32">
                <label className="text-sm font-medium mb-2 block">Page Size</label>
                <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <SelectItem key={size} value={size.toString()}>{size} per page</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Table */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead className="text-right">Disputes</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-10 w-48" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                    </TableRow>
                  ))
                ) : paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/admin/users/${user.user_id}`)}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{user.full_name || 'Unnamed User'}</div>
                          <div className="text-sm text-muted-foreground">{user.phone || 'No phone'}</div>
                          <div className="text-xs text-muted-foreground font-mono">{user.user_id.slice(0, 8)}...</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.account_status)}</TableCell>
                      <TableCell className="text-right">{user.total_orders || 0}</TableCell>
                      <TableCell className="text-right">₹{(user.total_spend || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right">{user.disputes_count || 0}</TableCell>
                      <TableCell>{format(new Date(user.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/users/${user.user_id}`); }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))
          ) : paginatedUsers.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No users found
              </CardContent>
            </Card>
          ) : (
            paginatedUsers.map((user) => (
              <Card key={user.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => navigate(`/admin/users/${user.user_id}`)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-medium">{user.full_name || 'Unnamed User'}</div>
                      <div className="text-sm text-muted-foreground">{user.phone || 'No phone'}</div>
                    </div>
                    {getStatusBadge(user.account_status)}
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                    <div>
                      <div className="text-muted-foreground">Orders</div>
                      <div className="font-medium">{user.total_orders || 0}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Spend</div>
                      <div className="font-medium">₹{(user.total_spend || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Disputes</div>
                      <div className="font-medium">{user.disputes_count || 0}</div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="h-4 w-4 mr-2" />
                    View User
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, users.length)} of {users.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
