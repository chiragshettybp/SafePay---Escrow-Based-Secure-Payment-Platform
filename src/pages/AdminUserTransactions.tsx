import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowLeft,
  User,
  Wallet,
  History,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
} from 'lucide-react';
import { format } from 'date-fns';
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

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
}

interface Transaction {
  id: string;
  wallet_id: string;
  customer_id: string;
  type: string;
  amount: number;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  status: string;
  created_at: string;
}

export default function AdminUserTransactions() {
  const { user_id } = useParams<{ user_id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchData = useCallback(async () => {
    if (!user_id) return;
    setIsLoading(true);

    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name')
        .eq('user_id', user_id)
        .single();

      if (profileError) throw profileError;
      setUser(profile);

      // Fetch transactions
      let query = supabase
        .from('wallet_transactions')
        .select('*')
        .eq('customer_id', user_id)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: txData, error: txError } = await query;

      if (txError) throw txError;
      setTransactions(txData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load transactions',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user_id, typeFilter, statusFilter, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!user_id) return;

    const channel = supabase
      .channel(`user-transactions-${user_id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `customer_id=eq.${user_id}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user_id, fetchData]);

  const filteredTransactions = transactions.filter(tx => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      tx.id.toLowerCase().includes(searchLower) ||
      tx.reference_id?.toLowerCase().includes(searchLower) ||
      tx.description?.toLowerCase().includes(searchLower)
    );
  });

  const getTypeBadge = (type: string) => {
    if (type === 'credit') {
      return <Badge className="bg-green-500/20 text-green-400"><ArrowDownLeft className="h-3 w-3 mr-1" />Credit</Badge>;
    }
    return <Badge className="bg-red-500/20 text-red-400"><ArrowUpRight className="h-3 w-3 mr-1" />Debit</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-400">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSourceLabel = (referenceType: string | null) => {
    switch (referenceType) {
      case 'refund':
        return 'Refund';
      case 'cashback':
        return 'Cashback';
      case 'admin_adjustment':
        return 'Admin';
      case 'order':
        return 'Order';
      case 'withdrawal':
        return 'Withdrawal';
      default:
        return referenceType || 'Unknown';
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">User not found</p>
          <Button variant="outline" onClick={() => navigate('/admin/users')} className="mt-4">
            Back to Users
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/users/${user_id}/wallet`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <History className="h-6 w-6" />
                Wallet Transactions
              </h1>
              <p className="text-muted-foreground">{user.full_name || 'Unnamed User'}</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate(`/admin/users/${user_id}/wallet`)}>
            <Wallet className="h-4 w-4 mr-2" />
            Back to Wallet
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, reference, description..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Transaction Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="debit">Debit</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              {filteredTransactions.length} transaction(s) found (Read-only audit log)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground" />
                <p className="text-muted-foreground mt-2">No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div>{format(new Date(tx.created_at), 'MMM d, yyyy')}</div>
                              <div className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'HH:mm:ss')}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getTypeBadge(tx.type)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getSourceLabel(tx.reference_type)}</Badge>
                        </TableCell>
                        <TableCell>
                          <span className={tx.type === 'credit' ? 'text-green-400' : 'text-red-400'}>
                            {tx.type === 'credit' ? '+' : '-'}₹{tx.amount.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(tx.status)}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">
                            {tx.reference_id ? `${tx.reference_id.slice(0, 8)}...` : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground max-w-xs truncate block">
                            {tx.description || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}