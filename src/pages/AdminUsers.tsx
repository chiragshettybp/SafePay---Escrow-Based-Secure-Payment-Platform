import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] sm:text-xs">Active</Badge>;
      case 'warned':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-[10px] sm:text-xs">Warned</Badge>;
      case 'suspended':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[10px] sm:text-xs">Suspended</Badge>;
      case 'banned':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] sm:text-xs">Banned</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] sm:text-xs">{status}</Badge>;
    }
  };

  const totalPages = Math.ceil(users.length / pageSize);
  const paginatedUsers = users.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AdminLayout>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <AdminPageHeader
          title="User Management"
          subtitle="Manage customer accounts and enforcement actions"
          actions={
            <span className="text-xs sm:text-sm text-muted-foreground">
              Total: <span className="font-semibold text-foreground">{users.length}</span>
            </span>
          }
        />

        {/* Filters */}
        <Card className="admin-card-compact">
          <CardContent className="p-3 sm:p-4">
            <div className="admin-filters">
              <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, phone..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="pl-10 h-10"
                  />
                </div>
              </form>

              <div className="flex gap-2">
                <Select value={filters.accountStatus} onValueChange={handleStatusFilter}>
                  <SelectTrigger className="w-[120px] sm:w-[140px] h-10 text-xs sm:text-sm">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="warned">Warned</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>

                <Select 
                  value={pageSize.toString()} 
                  onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}
                >
                  <SelectTrigger className="w-[80px] sm:w-[100px] h-10 text-xs sm:text-sm hidden sm:flex">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZE_OPTIONS.map(size => (
                      <SelectItem key={size} value={size.toString()}>{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Table */}
        <Card className="hidden md:block admin-card-compact">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">User</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Orders</TableHead>
                  <TableHead className="text-xs text-right">Spend</TableHead>
                  <TableHead className="text-xs text-right">Disputes</TableHead>
                  <TableHead className="text-xs">Joined</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-8 w-full" /></TableCell>
                      ))}
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
                    <TableRow 
                      key={user.id} 
                      className="hover:bg-muted/50 cursor-pointer" 
                      onClick={() => navigate(`/admin/users/${user.user_id}`)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{user.full_name || 'Unnamed User'}</div>
                          <div className="text-xs text-muted-foreground">{user.phone || 'No phone'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(user.account_status)}</TableCell>
                      <TableCell className="text-right text-sm">{user.total_orders || 0}</TableCell>
                      <TableCell className="text-right text-sm">₹{(user.total_spend || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-right text-sm">{user.disputes_count || 0}</TableCell>
                      <TableCell className="text-sm">{format(new Date(user.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          onClick={(e) => { e.stopPropagation(); navigate(`/admin/users/${user.user_id}`); }}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
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
        <div className="md:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))
          ) : paginatedUsers.length === 0 ? (
            <Card className="admin-card-compact">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No users found</p>
              </CardContent>
            </Card>
          ) : (
            paginatedUsers.map((user) => (
              <Card 
                key={user.id} 
                className="admin-card-compact cursor-pointer active:bg-muted/50 transition-colors touch-highlight"
                onClick={() => navigate(`/admin/users/${user.user_id}`)}
              >
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sm truncate">{user.full_name || 'Unnamed User'}</div>
                      <div className="text-xs text-muted-foreground">{user.phone || 'No phone'}</div>
                    </div>
                    {getStatusBadge(user.account_status)}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-2">
                    <div className="bg-muted/50 rounded-md p-1.5">
                      <div className="text-xs text-muted-foreground">Orders</div>
                      <div className="font-semibold text-sm">{user.total_orders || 0}</div>
                    </div>
                    <div className="bg-muted/50 rounded-md p-1.5">
                      <div className="text-xs text-muted-foreground">Spend</div>
                      <div className="font-semibold text-sm">₹{(user.total_spend || 0).toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/50 rounded-md p-1.5">
                      <div className="text-xs text-muted-foreground">Disputes</div>
                      <div className="font-semibold text-sm">{user.disputes_count || 0}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Joined {format(new Date(user.created_at), 'MMM d, yyyy')}</span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs sm:text-sm text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, users.length)} of {users.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs sm:text-sm min-w-[80px] text-center">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-9 p-0"
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
