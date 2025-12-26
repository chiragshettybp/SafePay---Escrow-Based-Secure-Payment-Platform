import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  Server, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowUpDown,
  Eye,
  Power,
  PowerOff,
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from "lucide-react";
import { useAdminGateways, GatewayWithHealth } from "@/hooks/useAdminGateways";
import { cn } from "@/lib/utils";

export default function AdminCheckoutGateways() {
  const navigate = useNavigate();
  const { 
    gateways, 
    routingRules, 
    isLoading, 
    updateGatewayStatus, 
    updateGatewayPriority,
    updateRoutingRule,
    refetch 
  } = useAdminGateways();
  
  const [disableDialog, setDisableDialog] = useState<{ open: boolean; gateway: GatewayWithHealth | null }>({
    open: false,
    gateway: null,
  });
  const [disableReason, setDisableReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

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

  const getEnvironmentBadge = (env: string) => {
    switch (env) {
      case 'live':
        return <Badge variant="default">Live</Badge>;
      case 'test':
        return <Badge variant="secondary">Test</Badge>;
      case 'both':
        return <Badge className="bg-primary/10 text-primary border-primary/20">Both</Badge>;
      default:
        return <Badge variant="outline">{env}</Badge>;
    }
  };

  const handleDisableGateway = async () => {
    if (!disableDialog.gateway || !disableReason.trim()) return;
    
    setIsProcessing(true);
    try {
      await updateGatewayStatus(disableDialog.gateway.id, 'disabled', disableReason);
      setDisableDialog({ open: false, gateway: null });
      setDisableReason("");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEnableGateway = async (gateway: GatewayWithHealth) => {
    setIsProcessing(true);
    try {
      await updateGatewayStatus(gateway.id, 'active', 'Manually re-enabled by admin');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePriorityChange = async (gateway: GatewayWithHealth, newPriority: number) => {
    await updateGatewayPriority(gateway.id, newPriority);
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

  const activeGateways = gateways.filter(g => g.status === 'active').length;
  const degradedGateways = gateways.filter(g => g.status === 'degraded').length;
  const disabledGateways = gateways.filter(g => g.status === 'disabled').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Gateway Control</h1>
            <p className="text-muted-foreground">Manage payment gateway routing and health</p>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isProcessing}>
            <RefreshCw className={cn("h-4 w-4 mr-2", isProcessing && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-foreground">{activeGateways}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Degraded</p>
                  <p className="text-2xl font-bold text-foreground">{degradedGateways}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Disabled</p>
                  <p className="text-2xl font-bold text-foreground">{disabledGateways}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold text-foreground">{gateways.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gateway Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Payment Gateways
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gateway</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Environment</TableHead>
                    <TableHead>Methods</TableHead>
                    <TableHead>Success (24h)</TableHead>
                    <TableHead>Latency</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gateways.map((gateway) => (
                    <TableRow key={gateway.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            gateway.status === 'active' && "bg-emerald-500",
                            gateway.status === 'degraded' && "bg-amber-500",
                            gateway.status === 'disabled' && "bg-red-500"
                          )} />
                          <span className="font-medium">{gateway.display_name}</span>
                          {gateway.is_default && (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(gateway.status)}</TableCell>
                      <TableCell>{getEnvironmentBadge(gateway.environment)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {gateway.supported_methods.slice(0, 3).map((method) => (
                            <Badge key={method} variant="outline" className="text-xs">
                              {method}
                            </Badge>
                          ))}
                          {gateway.supported_methods.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{gateway.supported_methods.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {gateway.health ? (
                            <>
                              <span className={cn(
                                "font-medium",
                                gateway.health.success_rate_24h >= 95 && "text-emerald-500",
                                gateway.health.success_rate_24h >= 80 && gateway.health.success_rate_24h < 95 && "text-amber-500",
                                gateway.health.success_rate_24h < 80 && "text-red-500"
                              )}>
                                {gateway.health.success_rate_24h.toFixed(1)}%
                              </span>
                              {gateway.health.success_rate_24h >= gateway.health.success_rate_1h ? (
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <TrendingDown className="h-3 w-3 text-red-500" />
                              )}
                            </>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {gateway.health ? (
                          <span className={cn(
                            gateway.health.avg_latency_ms > 3000 && "text-red-500",
                            gateway.health.avg_latency_ms > 1500 && gateway.health.avg_latency_ms <= 3000 && "text-amber-500",
                            gateway.health.avg_latency_ms <= 1500 && "text-emerald-500"
                          )}>
                            {gateway.health.avg_latency_ms}ms
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            defaultValue={gateway.priority}
                            className="w-16 h-8"
                            onBlur={(e) => {
                              const newPriority = parseInt(e.target.value);
                              if (newPriority !== gateway.priority && newPriority >= 1) {
                                handlePriorityChange(gateway, newPriority);
                              }
                            }}
                          />
                          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/checkout/gateways/${gateway.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {gateway.status === 'disabled' ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEnableGateway(gateway)}
                              disabled={isProcessing}
                              className="text-emerald-500 hover:text-emerald-600"
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDisableDialog({ open: true, gateway })}
                              disabled={isProcessing}
                              className="text-red-500 hover:text-red-600"
                            >
                              <PowerOff className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {gateways.map((gateway) => (
                <Card key={gateway.id} className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-3 h-3 rounded-full",
                          gateway.status === 'active' && "bg-emerald-500",
                          gateway.status === 'degraded' && "bg-amber-500",
                          gateway.status === 'disabled' && "bg-red-500"
                        )} />
                        <span className="font-semibold text-lg">{gateway.display_name}</span>
                      </div>
                      {getStatusBadge(gateway.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Environment</span>
                        <div className="mt-1">{getEnvironmentBadge(gateway.environment)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Priority</span>
                        <p className="font-medium mt-1">{gateway.priority}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Success Rate</span>
                        <p className={cn(
                          "font-medium mt-1",
                          gateway.health?.success_rate_24h && gateway.health.success_rate_24h >= 95 && "text-emerald-500",
                          gateway.health?.success_rate_24h && gateway.health.success_rate_24h < 95 && "text-amber-500"
                        )}>
                          {gateway.health?.success_rate_24h.toFixed(1) || '-'}%
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Latency</span>
                        <p className="font-medium mt-1">{gateway.health?.avg_latency_ms || '-'}ms</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {gateway.supported_methods.map((method) => (
                        <Badge key={method} variant="outline" className="text-xs">
                          {method}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate(`/admin/checkout/gateways/${gateway.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </Button>
                      {gateway.status === 'disabled' ? (
                        <Button
                          size="sm"
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                          onClick={() => handleEnableGateway(gateway)}
                          disabled={isProcessing}
                        >
                          <Power className="h-4 w-4 mr-2" />
                          Enable
                        </Button>
                      ) : (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          onClick={() => setDisableDialog({ open: true, gateway })}
                          disabled={isProcessing}
                        >
                          <PowerOff className="h-4 w-4 mr-2" />
                          Disable
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Global Routing Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Global Routing Rules
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {routingRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-4 rounded-lg border bg-card"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium capitalize">
                      {rule.rule_name.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {rule.rule_name === 'auto_fallback' && 'Automatically fallback to next gateway on failure'}
                    {rule.rule_name === 'success_rate_routing' && 'Route based on gateway success rates'}
                    {rule.rule_name === 'latency_routing' && 'Prefer gateways with lower latency'}
                    {rule.rule_name === 'global_failure_threshold' && 'Auto-disable gateways exceeding failure threshold'}
                  </p>
                </div>
                <Switch
                  checked={rule.is_enabled}
                  onCheckedChange={(checked) => updateRoutingRule(rule.rule_name, checked)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Disable Gateway Dialog */}
      <Dialog open={disableDialog.open} onOpenChange={(open) => !open && setDisableDialog({ open: false, gateway: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Disable Gateway
            </DialogTitle>
            <DialogDescription>
              You are about to disable <strong>{disableDialog.gateway?.display_name}</strong>. 
              This will immediately stop routing new payments to this gateway.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-destructive">
                ⚠️ Active payments will complete normally, but no new payments will be routed to this gateway.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="disable-reason">Reason for disabling (required)</Label>
              <Textarea
                id="disable-reason"
                placeholder="Enter the reason for disabling this gateway..."
                value={disableReason}
                onChange={(e) => setDisableReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisableDialog({ open: false, gateway: null })}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableGateway}
              disabled={isProcessing || !disableReason.trim()}
            >
              {isProcessing ? 'Disabling...' : 'Disable Gateway'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
