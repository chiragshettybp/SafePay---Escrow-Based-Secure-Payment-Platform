import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Edit,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';
import { useMerchantIntegration, Webhook as WebhookType } from '@/hooks/useMerchantIntegration';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function MerchantCheckoutIntegrationWebhooks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { merchant } = useMerchantAuth();
  const { 
    webhooks, 
    webhookLogs,
    isLoading, 
    supportedEvents,
    createWebhook, 
    updateWebhook, 
    deleteWebhook,
    fetchWebhookLogs 
  } = useMerchantIntegration(merchant?.id);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState<WebhookType | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null);
  const [expandedWebhook, setExpandedWebhook] = useState<string | null>(null);
  
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleCreateWebhook = async () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (newWebhookEvents.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one event',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    const success = await createWebhook(newWebhookName.trim(), newWebhookUrl.trim(), newWebhookEvents);
    setIsSaving(false);

    if (success) {
      setShowCreateDialog(false);
      setNewWebhookName('');
      setNewWebhookUrl('');
      setNewWebhookEvents([]);
    }
  };

  const handleUpdateWebhook = async () => {
    if (!showEditDialog) return;

    setIsSaving(true);
    await updateWebhook(showEditDialog.id, {
      name: showEditDialog.name,
      url: showEditDialog.url,
      events: showEditDialog.events,
      is_active: showEditDialog.is_active,
    });
    setIsSaving(false);
    setShowEditDialog(null);
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    await deleteWebhook(webhookId);
    setShowDeleteDialog(null);
  };

  const handleToggleEvent = (event: string, checked: boolean) => {
    if (checked) {
      setNewWebhookEvents([...newWebhookEvents, event]);
    } else {
      setNewWebhookEvents(newWebhookEvents.filter(e => e !== event));
    }
  };

  const handleToggleEditEvent = (event: string, checked: boolean) => {
    if (!showEditDialog) return;
    
    const events = checked
      ? [...showEditDialog.events, event]
      : showEditDialog.events.filter(e => e !== event);
    
    setShowEditDialog({ ...showEditDialog, events });
  };

  const handleExpandWebhook = (webhookId: string) => {
    if (expandedWebhook === webhookId) {
      setExpandedWebhook(null);
    } else {
      setExpandedWebhook(webhookId);
      fetchWebhookLogs(webhookId);
    }
  };

  if (isLoading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Seo title="Webhooks" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/merchant/checkout/integration')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Webhooks</h1>
              <p className="text-muted-foreground">
                Receive real-time event notifications
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Endpoint
          </Button>
        </div>

        {/* Supported Events Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Supported Events (Prepaid Only)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {supportedEvents.map((event) => (
                <Badge key={event} variant="secondary" className="font-mono text-xs">
                  {event}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Webhooks List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Endpoints
            </CardTitle>
            <CardDescription>
              Configure URLs to receive checkout event notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            {webhooks.length > 0 ? (
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <WebhookCard
                    key={webhook.id}
                    webhook={webhook}
                    isExpanded={expandedWebhook === webhook.id}
                    logs={expandedWebhook === webhook.id ? webhookLogs : []}
                    onToggleExpand={() => handleExpandWebhook(webhook.id)}
                    onEdit={() => setShowEditDialog(webhook)}
                    onDelete={() => setShowDeleteDialog(webhook.id)}
                    onToggleActive={(active) => updateWebhook(webhook.id, { is_active: active })}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Webhook className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground mb-4">No webhook endpoints configured</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Endpoint
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Webhook Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Webhook Endpoint</DialogTitle>
              <DialogDescription>
                Configure a URL to receive real-time event notifications
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookName">Name</Label>
                <Input
                  id="webhookName"
                  placeholder="e.g., Order Notification"
                  value={newWebhookName}
                  onChange={(e) => setNewWebhookName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Endpoint URL</Label>
                <Input
                  id="webhookUrl"
                  type="url"
                  placeholder="https://your-server.com/webhooks"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Events to Subscribe</Label>
                <div className="grid gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                  {supportedEvents.map((event) => (
                    <div key={event} className="flex items-center space-x-2">
                      <Checkbox
                        id={event}
                        checked={newWebhookEvents.includes(event)}
                        onCheckedChange={(checked) => handleToggleEvent(event, checked as boolean)}
                      />
                      <Label htmlFor={event} className="font-mono text-sm cursor-pointer">
                        {event}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateWebhook} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Webhook
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Webhook Dialog */}
        <Dialog open={!!showEditDialog} onOpenChange={() => setShowEditDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Webhook</DialogTitle>
              <DialogDescription>
                Update webhook configuration
              </DialogDescription>
            </DialogHeader>

            {showEditDialog && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="editWebhookName">Name</Label>
                  <Input
                    id="editWebhookName"
                    value={showEditDialog.name}
                    onChange={(e) => setShowEditDialog({ ...showEditDialog, name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editWebhookUrl">Endpoint URL</Label>
                  <Input
                    id="editWebhookUrl"
                    type="url"
                    value={showEditDialog.url}
                    onChange={(e) => setShowEditDialog({ ...showEditDialog, url: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch
                    checked={showEditDialog.is_active}
                    onCheckedChange={(checked) => setShowEditDialog({ ...showEditDialog, is_active: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Events</Label>
                  <div className="grid gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                    {supportedEvents.map((event) => (
                      <div key={event} className="flex items-center space-x-2">
                        <Checkbox
                          id={`edit-${event}`}
                          checked={showEditDialog.events.includes(event)}
                          onCheckedChange={(checked) => handleToggleEditEvent(event, checked as boolean)}
                        />
                        <Label htmlFor={`edit-${event}`} className="font-mono text-sm cursor-pointer">
                          {event}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateWebhook} disabled={isSaving}>
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!showDeleteDialog} onOpenChange={() => setShowDeleteDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. You will stop receiving events at this endpoint.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => showDeleteDialog && handleDeleteWebhook(showDeleteDialog)}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MerchantLayout>
  );
}

function WebhookCard({
  webhook,
  isExpanded,
  logs,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  webhook: WebhookType;
  isExpanded: boolean;
  logs: { id: string; event_type: string; response_code: number | null; success: boolean; created_at: string }[];
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
}) {
  const getStatusBadge = () => {
    if (!webhook.is_active) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    if (webhook.failure_count > 3) {
      return <Badge variant="destructive">Failing</Badge>;
    }
    if (webhook.last_response_code && webhook.last_response_code >= 200 && webhook.last_response_code < 300) {
      return <Badge variant="default" className="bg-green-600">Healthy</Badge>;
    }
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div className="border rounded-lg">
        <div className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{webhook.name}</span>
                {getStatusBadge()}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{webhook.url}</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {webhook.events.slice(0, 3).map((event) => (
                  <Badge key={event} variant="outline" className="font-mono text-xs">
                    {event}
                  </Badge>
                ))}
                {webhook.events.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{webhook.events.length - 3} more
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={webhook.is_active}
                onCheckedChange={onToggleActive}
              />
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4" />
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>

          {webhook.last_triggered_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Last triggered: {format(new Date(webhook.last_triggered_at), 'MMM d, yyyy HH:mm')}
              {webhook.last_response_code && ` • Response: ${webhook.last_response_code}`}
            </p>
          )}
        </div>

        <CollapsibleContent>
          <div className="border-t p-4 bg-muted/50">
            <h4 className="text-sm font-medium mb-3">Recent Deliveries</h4>
            {logs.length > 0 ? (
              <div className="space-y-2">
                {logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-center justify-between text-sm p-2 bg-background rounded">
                    <div className="flex items-center gap-2">
                      {log.success ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-mono text-xs">{log.event_type}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span>{log.response_code || '-'}</span>
                      <span>•</span>
                      <span>{format(new Date(log.created_at), 'HH:mm:ss')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No delivery logs yet</p>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
