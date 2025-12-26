import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Ban, 
  Unlock, 
  Shield, 
  Search, 
  Filter, 
  Eye,
  Clock,
  AlertTriangle,
  Plus,
  MessageSquare,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useAdminRisk, BlockedEntity, BlockedFilters } from '@/hooks/useAdminRisk';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdminCheckoutRiskBlocked() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { 
    blockedEntities, 
    rules,
    loading, 
    fetchBlockedEntities, 
    fetchRules,
    unblockEntity, 
    addEntityNote,
    blockEntity 
  } = useAdminRisk();

  const [filters, setFilters] = useState<BlockedFilters>({
    status: (searchParams.get('status') as BlockedFilters['status']) || 'active',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<BlockedEntity | null>(null);
  const [unblockDialog, setUnblockDialog] = useState<{
    open: boolean;
    entity: BlockedEntity | null;
    permanent: boolean;
  }>({ open: false, entity: null, permanent: false });
  const [reason, setReason] = useState('');
  const [noteDialog, setNoteDialog] = useState<{
    open: boolean;
    entity: BlockedEntity | null;
  }>({ open: false, entity: null });
  const [note, setNote] = useState('');
  const [blockDialog, setBlockDialog] = useState(false);
  const [newBlock, setNewBlock] = useState({
    entityType: 'ip',
    entityIdentifier: '',
    reason: '',
    expiresInHours: 24,
    isPermanent: false,
  });

  useEffect(() => {
    fetchBlockedEntities(filters);
    fetchRules();
  }, [fetchBlockedEntities, fetchRules, filters]);

  const filteredEntities = blockedEntities.filter(entity => {
    if (!searchTerm) return true;
    return (
      entity.entity_identifier.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.block_reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.rule_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleUnblock = async () => {
    if (!unblockDialog.entity || !reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      await unblockEntity(unblockDialog.entity.id, reason, unblockDialog.permanent);
      setUnblockDialog({ open: false, entity: null, permanent: false });
      setReason('');
    } catch (err) {
      // Error handled in hook
    }
  };

  const handleAddNote = async () => {
    if (!noteDialog.entity || !note.trim()) {
      toast.error('Please enter a note');
      return;
    }

    try {
      await addEntityNote(noteDialog.entity.id, note);
      setNoteDialog({ open: false, entity: null });
      setNote('');
    } catch (err) {
      // Error handled in hook
    }
  };

  const handleBlock = async () => {
    if (!newBlock.entityIdentifier.trim() || !newBlock.reason.trim()) {
      toast.error('Entity and reason are required');
      return;
    }

    try {
      const expiresAt = newBlock.isPermanent 
        ? undefined 
        : new Date(Date.now() + newBlock.expiresInHours * 60 * 60 * 1000).toISOString();
      
      await blockEntity(
        newBlock.entityType,
        newBlock.entityIdentifier,
        newBlock.reason,
        expiresAt,
        newBlock.isPermanent
      );
      setBlockDialog(false);
      setNewBlock({
        entityType: 'ip',
        entityIdentifier: '',
        reason: '',
        expiresInHours: 24,
        isPermanent: false,
      });
    } catch (err) {
      // Error handled in hook
    }
  };

  const getEntityTypeIcon = (type: string) => {
    switch (type) {
      case 'ip': return '🌐';
      case 'device': return '📱';
      case 'user': return '👤';
      case 'session': return '🔗';
      default: return '❓';
    }
  };

  const getStatusBadge = (entity: BlockedEntity) => {
    if (entity.is_whitelisted) {
      return <Badge className="bg-green-500 text-white">Whitelisted</Badge>;
    }
    if (entity.unblocked_at) {
      return <Badge variant="secondary">Unblocked</Badge>;
    }
    if (entity.expires_at && new Date(entity.expires_at) < new Date()) {
      return <Badge variant="outline">Expired</Badge>;
    }
    return <Badge className="bg-destructive text-destructive-foreground">Active</Badge>;
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <AdminPageHeader
          title="Blocked Entities"
          actions={
            <Button onClick={() => setBlockDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Block Entity
            </Button>
          }
        />

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search blocked entities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Select
                  value={filters.status || 'all'}
                  onValueChange={(v) => setFilters({ ...filters, status: v === 'all' ? undefined : v as BlockedFilters['status'] })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="unblocked">Unblocked</SelectItem>
                    <SelectItem value="whitelisted">Whitelisted</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filters.entityType || 'all'}
                  onValueChange={(v) => setFilters({ ...filters, entityType: v === 'all' ? undefined : v })}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="ip">IP</SelectItem>
                    <SelectItem value="device">Device</SelectItem>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="session">Session</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Blocked Entities List */}
        <div className="space-y-3">
          {loading ? (
            Array(5).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : filteredEntities.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-muted-foreground">No blocked entities found</p>
              </CardContent>
            </Card>
          ) : (
            filteredEntities.map((entity) => (
              <Card 
                key={entity.id}
                className={`${entity.unblocked_at || entity.is_whitelisted ? 'opacity-70' : ''}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{getEntityTypeIcon(entity.entity_type)}</span>
                        <span className="font-medium capitalize">{entity.entity_type}</span>
                        {getStatusBadge(entity)}
                      </div>
                      <p className="font-mono text-sm bg-muted px-2 py-1 rounded inline-block mb-2">
                        {entity.entity_identifier_masked || entity.entity_identifier}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Reason:</strong> {entity.block_reason}
                      </p>
                      {entity.rule_name && (
                        <Badge variant="outline" className="text-xs">
                          Rule: {entity.rule_name}
                        </Badge>
                      )}
                      {entity.risk_score && (
                        <Badge variant="outline" className="text-xs ml-1">
                          Score: {entity.risk_score}
                        </Badge>
                      )}
                      {entity.admin_notes && (
                        <p className="text-sm mt-2 p-2 bg-muted rounded">
                          <MessageSquare className="h-3 w-3 inline mr-1" />
                          {entity.admin_notes}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:text-right">
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 sm:justify-end">
                          <Clock className="h-3 w-3" />
                          <span>Blocked {format(new Date(entity.blocked_at), 'MMM d, HH:mm')}</span>
                        </div>
                        {entity.expires_at && !entity.is_permanent && (
                          <div className="flex items-center gap-1 sm:justify-end mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Expires {format(new Date(entity.expires_at), 'MMM d, HH:mm')}</span>
                          </div>
                        )}
                        {entity.is_permanent && (
                          <div className="flex items-center gap-1 sm:justify-end mt-1 text-destructive">
                            <Ban className="h-3 w-3" />
                            <span>Permanent</span>
                          </div>
                        )}
                      </div>
                      {!entity.unblocked_at && !entity.is_whitelisted && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setNoteDialog({ open: true, entity })}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Note
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setUnblockDialog({ open: true, entity, permanent: false })}
                          >
                            <Unlock className="h-3 w-3 mr-1" />
                            Unblock
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => setUnblockDialog({ open: true, entity, permanent: true })}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Whitelist
                          </Button>
                        </div>
                      )}
                      {entity.session_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/admin/checkout/session/${entity.session_id}`)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View Session
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Unblock Dialog */}
      <AlertDialog 
        open={unblockDialog.open} 
        onOpenChange={(open) => setUnblockDialog({ ...unblockDialog, open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {unblockDialog.permanent ? 'Whitelist Entity?' : 'Unblock Entity?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {unblockDialog.permanent
                ? 'This will permanently whitelist this entity. It will never be blocked by automatic rules again.'
                : 'This will unblock this entity. It may be blocked again if it triggers risk rules.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label>Reason (required)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for this action"
              className="mt-1"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblock}>
              {unblockDialog.permanent ? 'Whitelist' : 'Unblock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Note Dialog */}
      <Dialog open={noteDialog.open} onOpenChange={(open) => setNoteDialog({ ...noteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin Note</DialogTitle>
            <DialogDescription>
              Add an internal note for this blocked entity.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label>Note</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Enter your note..."
              className="mt-1"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog({ open: false, entity: null })}>
              Cancel
            </Button>
            <Button onClick={handleAddNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Entity Dialog */}
      <Dialog open={blockDialog} onOpenChange={setBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Entity</DialogTitle>
            <DialogDescription>
              Manually block an IP, device, or user from checkout.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Entity Type</Label>
              <Select
                value={newBlock.entityType}
                onValueChange={(v) => setNewBlock({ ...newBlock, entityType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ip">IP Address</SelectItem>
                  <SelectItem value="device">Device Fingerprint</SelectItem>
                  <SelectItem value="user">User ID</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Entity Identifier *</Label>
              <Input
                value={newBlock.entityIdentifier}
                onChange={(e) => setNewBlock({ ...newBlock, entityIdentifier: e.target.value })}
                placeholder={newBlock.entityType === 'ip' ? '192.168.1.1' : 'Enter identifier'}
              />
            </div>
            <div className="space-y-2">
              <Label>Reason *</Label>
              <Textarea
                value={newBlock.reason}
                onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })}
                placeholder="Why are you blocking this entity?"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-2">
                <Label>Expires In (hours)</Label>
                <Input
                  type="number"
                  value={newBlock.expiresInHours}
                  onChange={(e) => setNewBlock({ ...newBlock, expiresInHours: Number(e.target.value) })}
                  disabled={newBlock.isPermanent}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="permanent"
                  checked={newBlock.isPermanent}
                  onChange={(e) => setNewBlock({ ...newBlock, isPermanent: e.target.checked })}
                  className="h-4 w-4"
                />
                <Label htmlFor="permanent" className="text-sm">Permanent</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlock}>
              <Ban className="h-4 w-4 mr-2" />
              Block Entity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}