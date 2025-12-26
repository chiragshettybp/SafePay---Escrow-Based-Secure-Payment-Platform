import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  ArrowLeft,
  Server, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Activity,
  TrendingUp,
  TrendingDown,
  Power,
  PowerOff,
  Plus,
  History,
  FileWarning,
  Settings,
  RefreshCw,
  AlertCircle,
  Zap
} from "lucide-react";
import { useAdminGatewayDetails, useAdminGateways, GatewayIncident, GatewayOverride } from "@/hooks/useAdminGateways";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function AdminCheckoutGatewayDetails() {
  const { gateway_id } = useParams<{ gateway_id: string }>();
  const navigate = useNavigate();
  const { 
    gateway, 
    errorLogs, 
    adminActions, 
    allIncidents,
    isLoading, 
    timeRange, 
    setTimeRange,
    refetch 
  } = useAdminGatewayDetails(gateway_id || '');
  
  const { updateGatewayStatus, updateGatewayPriority, createIncident, resolveIncident, createOverride, deactivateOverride } = useAdminGateways();

  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState<{ open: boolean; incident: GatewayIncident | null }>({ open: false, incident: null });
  const [isProcessing, setIsProcessing] = useState(false);

  // Form states
  const [incidentForm, setIncidentForm] = useState({
    type: 'degradation' as GatewayIncident['incident_type'],
    severity: 'medium' as GatewayIncident['severity'],
    title: '',
    description: '',
  });

  const [overrideForm, setOverrideForm] = useState({
    type: 'disable' as GatewayOverride['override_type'],
    reason: '',
    duration: '15',
  });

  const [resolveNotes, setResolveNotes] = useState('');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>;
      case 'degraded':
        return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Degraded</Badge>;
      case 'disabled':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Disabled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-500 text-white">Critical</Badge>;
      case 'high':
        return <Badge className="bg-orange-500 text-white">High</Badge>;
      case 'medium':
        return <Badge className="bg-amber-500 text-white">Medium</Badge>;
      case 'low':
        return <Badge className="bg-blue-500 text-white">Low</Badge>;
      default:
        return <Badge variant="secondary">{severity}</Badge>;
    }
  };

  const handleStatusChange = async (newStatus: 'active' | 'degraded' | 'disabled') => {
    if (!gateway) return;
    setIsProcessing(true);
    try {
      await updateGatewayStatus(gateway.id, newStatus, `Status changed to ${newStatus} from gateway details page`);
      refetch();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateIncident = async () => {
    if (!gateway || !incidentForm.title.trim()) return;
    setIsProcessing(true);
    try {
      await createIncident(gateway.id, incidentForm.type, incidentForm.severity, incidentForm.title, incidentForm.description);
      setShowIncidentDialog(false);
      setIncidentForm({ type: 'degradation', severity: 'medium', title: '', description: '' });
      refetch();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveIncident = async () => {
    if (!showResolveDialog.incident) return;
    setIsProcessing(true);
    try {
      await resolveIncident(showResolveDialog.incident.id, resolveNotes);
      setShowResolveDialog({ open: false, incident: null });
      setResolveNotes('');
      refetch();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateOverride = async () => {
    if (!gateway || !overrideForm.reason.trim()) return;
    setIsProcessing(true);
    try {
      const expiresAt = overrideForm.duration 
        ? new Date(Date.now() + parseInt(overrideForm.duration) * 60 * 1000).toISOString()
        : undefined;
      await createOverride(gateway.id, overrideForm.type, overrideForm.reason, {}, expiresAt);
      setShowOverrideDialog(false);
      setOverrideForm({ type: 'disable', reason: '', duration: '15' });
      refetch();
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-64" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  if (!gateway) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="text-lg text-muted-foreground">Gateway not found</p>
          <Button variant="outline" onClick={() => navigate('/admin/checkout/gateways')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Gateways
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/checkout/gateways')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">{gateway.display_name}</h1>
              {getStatusBadge(gateway.status)}
              {gateway.is_default && <Badge variant="outline">Default</Badge>}
            </div>
            <p className="text-muted-foreground">Gateway ID: {gateway.id}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()} disabled={isProcessing}>
              <RefreshCw className={cn("h-4 w-4 mr-2", isProcessing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Active Incidents Alert */}
        {gateway.activeIncidents && gateway.activeIncidents.length > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-medium text-amber-600">Active Incidents</h3>
                  <div className="space-y-2 mt-2">
                    {gateway.activeIncidents.map((incident) => (
                      <div key={incident.id} className="flex items-center justify-between p-2 rounded bg-background/50">
                        <div>
                          <span className="font-medium">{incident.title}</span>
                          <span className="mx-2">·</span>
                          {getSeverityBadge(incident.severity)}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowResolveDialog({ open: true, incident })}
                        >
                          Resolve
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  gateway.health && gateway.health.success_rate_24h >= 95 ? "bg-emerald-500/10" : "bg-amber-500/10"
                )}>
                  <TrendingUp className={cn(
                    "h-5 w-5",
                    gateway.health && gateway.health.success_rate_24h >= 95 ? "text-emerald-500" : "text-amber-500"
                  )} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate (24h)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {gateway.health?.success_rate_24h.toFixed(1) || '0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Failure Rate (24h)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {gateway.health?.failure_rate_24h.toFixed(1) || '0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Latency</p>
                  <p className="text-2xl font-bold text-foreground">
                    {gateway.health?.avg_latency_ms || '0'}ms
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Attempts (24h)</p>
                  <p className="text-2xl font-bold text-foreground">
                    {gateway.health?.total_attempts_24h.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="controls" className="space-y-4">
          <TabsList className="grid grid-cols-4 lg:w-[500px]">
            <TabsTrigger value="controls">
              <Settings className="h-4 w-4 mr-2 hidden sm:inline" />
              Controls
            </TabsTrigger>
            <TabsTrigger value="errors">
              <FileWarning className="h-4 w-4 mr-2 hidden sm:inline" />
              Errors
            </TabsTrigger>
            <TabsTrigger value="incidents">
              <AlertTriangle className="h-4 w-4 mr-2 hidden sm:inline" />
              Incidents
            </TabsTrigger>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2 hidden sm:inline" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Controls Tab */}
          <TabsContent value="controls" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Power className="h-5 w-5" />
                  Gateway Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Status Control */}
                <div className="space-y-3">
                  <Label>Gateway Status</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={gateway.status === 'active' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('active')}
                      disabled={isProcessing || gateway.status === 'active'}
                      className={gateway.status === 'active' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Active
                    </Button>
                    <Button
                      variant={gateway.status === 'degraded' ? 'default' : 'outline'}
                      onClick={() => handleStatusChange('degraded')}
                      disabled={isProcessing || gateway.status === 'degraded'}
                      className={gateway.status === 'degraded' ? 'bg-amber-500 hover:bg-amber-600' : ''}
                    >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Degraded
                    </Button>
                    <Button
                      variant={gateway.status === 'disabled' ? 'destructive' : 'outline'}
                      onClick={() => handleStatusChange('disabled')}
                      disabled={isProcessing || gateway.status === 'disabled'}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Disabled
                    </Button>
                  </div>
                </div>

                {/* Priority */}
                <div className="space-y-3">
                  <Label htmlFor="priority">Routing Priority (lower = higher priority)</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="priority"
                      type="number"
                      min={1}
                      max={100}
                      defaultValue={gateway.priority}
                      className="w-24"
                      onBlur={(e) => {
                        const newPriority = parseInt(e.target.value);
                        if (newPriority !== gateway.priority && newPriority >= 1) {
                          updateGatewayPriority(gateway.id, newPriority);
                        }
                      }}
                    />
                    <span className="text-sm text-muted-foreground">
                      Current: {gateway.priority}
                    </span>
                  </div>
                </div>

                {/* Supported Methods */}
                <div className="space-y-3">
                  <Label>Supported Payment Methods</Label>
                  <div className="flex flex-wrap gap-2">
                    {gateway.supported_methods.map((method) => (
                      <Badge key={method} variant="outline" className="text-sm py-1 px-3">
                        {method}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowIncidentDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Incident
                  </Button>
                  <Button variant="outline" onClick={() => setShowOverrideDialog(true)}>
                    <Zap className="h-4 w-4 mr-2" />
                    Add Override
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Active Overrides */}
            {gateway.activeOverrides && gateway.activeOverrides.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Active Overrides
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {gateway.activeOverrides.map((override) => (
                      <div key={override.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{override.override_type.replace(/_/g, ' ')}</Badge>
                            {override.expires_at && (
                              <span className="text-sm text-muted-foreground">
                                Expires: {format(new Date(override.expires_at), 'PPp')}
                              </span>
                            )}
                          </div>
                          <p className="text-sm mt-1">{override.reason}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deactivateOverride(override.id)}
                        >
                          Deactivate
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileWarning className="h-5 w-5" />
                    Error Logs
                  </CardTitle>
                  <Select value={timeRange} onValueChange={(v) => setTimeRange(v as '1h' | '24h' | '7d')}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1h">Last 1 hour</SelectItem>
                      <SelectItem value="24h">Last 24 hours</SelectItem>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {errorLogs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                    <p>No errors in the selected time range</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Error Code</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.created_at), 'PPp')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">{log.error_code || 'UNKNOWN'}</Badge>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {log.error_message || '-'}
                          </TableCell>
                          <TableCell>{log.payment_method || '-'}</TableCell>
                          <TableCell>₹{log.amount?.toLocaleString() || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Incidents Tab */}
          <TabsContent value="incidents" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Incident History
                  </CardTitle>
                  <Button size="sm" onClick={() => setShowIncidentDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Incident
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {allIncidents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-emerald-500" />
                    <p>No incidents recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {allIncidents.map((incident) => (
                      <div
                        key={incident.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          !incident.resolved_at && "border-amber-500/50 bg-amber-500/5"
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{incident.title}</span>
                              {getSeverityBadge(incident.severity)}
                              <Badge variant="outline">{incident.incident_type.replace(/_/g, ' ')}</Badge>
                              {!incident.resolved_at && (
                                <Badge className="bg-red-500/10 text-red-500">Active</Badge>
                              )}
                            </div>
                            {incident.description && (
                              <p className="text-sm text-muted-foreground">{incident.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              Started: {format(new Date(incident.started_at), 'PPp')}
                              {incident.resolved_at && (
                                <> · Resolved: {format(new Date(incident.resolved_at), 'PPp')}</>
                              )}
                            </p>
                          </div>
                          {!incident.resolved_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setShowResolveDialog({ open: true, incident })}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Admin Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {adminActions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4" />
                    <p>No admin actions recorded</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {adminActions.map((action) => (
                      <div key={action.id} className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center justify-between">
                          <div>
                            <Badge variant="outline" className="capitalize">
                              {action.action_type.replace(/_/g, ' ')}
                            </Badge>
                            {action.reason && (
                              <p className="text-sm mt-1">{action.reason}</p>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(action.created_at), 'PPp')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Incident Dialog */}
      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Incident</DialogTitle>
            <DialogDescription>
              Create a new incident record for {gateway.display_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Incident Type</Label>
                <Select
                  value={incidentForm.type}
                  onValueChange={(v) => setIncidentForm({ ...incidentForm, type: v as GatewayIncident['incident_type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="outage">Outage</SelectItem>
                    <SelectItem value="degradation">Degradation</SelectItem>
                    <SelectItem value="high_failure">High Failure Rate</SelectItem>
                    <SelectItem value="high_latency">High Latency</SelectItem>
                    <SelectItem value="manual_disable">Manual Disable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={incidentForm.severity}
                  onValueChange={(v) => setIncidentForm({ ...incidentForm, severity: v as GatewayIncident['severity'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Brief description of the incident"
                value={incidentForm.title}
                onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Additional details..."
                value={incidentForm.description}
                onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIncidentDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateIncident} disabled={isProcessing || !incidentForm.title.trim()}>
              {isProcessing ? 'Creating...' : 'Create Incident'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve Incident Dialog */}
      <Dialog open={showResolveDialog.open} onOpenChange={(open) => !open && setShowResolveDialog({ open: false, incident: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Incident</DialogTitle>
            <DialogDescription>
              Mark this incident as resolved and add resolution notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium">{showResolveDialog.incident?.title}</p>
              <p className="text-sm text-muted-foreground">{showResolveDialog.incident?.description}</p>
            </div>
            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea
                placeholder="What was done to resolve this incident..."
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog({ open: false, incident: null })}>Cancel</Button>
            <Button onClick={handleResolveIncident} disabled={isProcessing} className="bg-emerald-500 hover:bg-emerald-600">
              {isProcessing ? 'Resolving...' : 'Resolve Incident'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Override Dialog */}
      <Dialog open={showOverrideDialog} onOpenChange={setShowOverrideDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Override</DialogTitle>
            <DialogDescription>
              Add a temporary routing override for {gateway.display_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Override Type</Label>
                <Select
                  value={overrideForm.type}
                  onValueChange={(v) => setOverrideForm({ ...overrideForm, type: v as GatewayOverride['override_type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disable">Temporary Disable</SelectItem>
                    <SelectItem value="priority_change">Priority Override</SelectItem>
                    <SelectItem value="method_restrict">Restrict Methods</SelectItem>
                    <SelectItem value="amount_restrict">Restrict Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={5}
                  max={1440}
                  value={overrideForm.duration}
                  onChange={(e) => setOverrideForm({ ...overrideForm, duration: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                placeholder="Reason for this override..."
                value={overrideForm.reason}
                onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOverrideDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateOverride} disabled={isProcessing || !overrideForm.reason.trim()}>
              {isProcessing ? 'Creating...' : 'Create Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
