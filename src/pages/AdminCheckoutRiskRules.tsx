import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  Plus, 
  Edit2, 
  Power, 
  PowerOff, 
  AlertTriangle,
  Clock,
  Activity,
  ChevronLeft,
  Save,
  X
} from 'lucide-react';
import { useAdminRisk, RiskRule } from '@/hooks/useAdminRisk';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
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

export default function AdminCheckoutRiskRules() {
  const navigate = useNavigate();
  const { rules, loading, fetchRules, createRule, updateRule, toggleRuleStatus } = useAdminRisk();
  const [editingRule, setEditingRule] = useState<RiskRule | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    ruleId: string;
    isActive: boolean;
    ruleName: string;
  }>({ open: false, ruleId: '', isActive: false, ruleName: '' });
  const [reason, setReason] = useState('');

  // Form state for creating/editing
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rule_type: 'velocity',
    threshold_value: 10,
    time_window_minutes: 60,
    action: 'flag',
    severity: 'medium',
    priority: 50,
    scope: 'global',
  });

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleEdit = (rule: RiskRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      rule_type: rule.rule_type,
      threshold_value: rule.threshold_value || 10,
      time_window_minutes: rule.time_window_minutes || 60,
      action: rule.action,
      severity: rule.severity,
      priority: rule.priority,
      scope: rule.scope,
    });
    setIsCreating(false);
  };

  const handleCreate = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      rule_type: 'velocity',
      threshold_value: 10,
      time_window_minutes: 60,
      action: 'flag',
      severity: 'medium',
      priority: 50,
      scope: 'global',
    });
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Rule name is required');
      return;
    }

    try {
      if (isCreating) {
        await createRule({
          ...formData,
          conditions: { field: formData.rule_type, operator: 'count' },
        });
      } else if (editingRule) {
        await updateRule(editingRule.id, {
          ...formData,
          conditions: { field: formData.rule_type, operator: 'count' },
        }, reason || 'Rule updated');
      }
      setEditingRule(null);
      setIsCreating(false);
      setReason('');
    } catch (err) {
      // Error handled in hook
    }
  };

  const handleToggle = async () => {
    if (!confirmDialog.ruleId || !reason.trim()) {
      toast.error('Please provide a reason');
      return;
    }

    try {
      await toggleRuleStatus(confirmDialog.ruleId, !confirmDialog.isActive, reason);
      setConfirmDialog({ open: false, ruleId: '', isActive: false, ruleName: '' });
      setReason('');
    } catch (err) {
      // Error handled in hook
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'block': return 'bg-destructive text-destructive-foreground';
      case 'flag': return 'bg-yellow-500 text-black';
      default: return 'bg-green-500 text-white';
    }
  };

  const getRuleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      velocity: 'Velocity',
      payment_failure: 'Payment Failure',
      gateway_abuse: 'Gateway Abuse',
      amount_anomaly: 'Amount Anomaly',
      device_reuse: 'Device Reuse',
      geo_ip: 'Geo/IP',
    };
    return labels[type] || type;
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <AdminPageHeader
          title="Risk Rules"
          actions={
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New Rule
            </Button>
          }
        />

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Rules List */}
          <div className={`${editingRule || isCreating ? 'lg:col-span-1' : 'lg:col-span-3'} space-y-3`}>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))
            ) : rules.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">No risk rules configured</p>
                  <Button className="mt-4" onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Rule
                  </Button>
                </CardContent>
              </Card>
            ) : (
              rules.map((rule) => (
                <Card 
                  key={rule.id}
                  className={`cursor-pointer transition-all ${
                    editingRule?.id === rule.id ? 'ring-2 ring-primary' : 'hover:shadow-md'
                  } ${!rule.is_active ? 'opacity-60' : ''}`}
                  onClick={() => handleEdit(rule)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{rule.name}</h3>
                          {!rule.is_active && (
                            <Badge variant="secondary" className="text-xs">Disabled</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {rule.description || 'No description'}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {getRuleTypeLabel(rule.rule_type)}
                          </Badge>
                          <Badge className={`text-xs ${getSeverityColor(rule.severity)}`}>
                            {rule.severity}
                          </Badge>
                          <Badge className={`text-xs ${getActionColor(rule.action)}`}>
                            {rule.action}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold">{rule.trigger_count}</p>
                        <p className="text-xs text-muted-foreground">triggers</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{rule.time_window_minutes}min window</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        <span>Priority {rule.priority}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Edit Panel */}
          {(editingRule || isCreating) && (
            <Card className="lg:col-span-2 h-fit lg:sticky lg:top-4">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {isCreating ? 'Create New Rule' : 'Edit Rule'}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditingRule(null);
                      setIsCreating(false);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Rule Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter rule name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rule Type</Label>
                    <Select
                      value={formData.rule_type}
                      onValueChange={(v) => setFormData({ ...formData, rule_type: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="velocity">Velocity</SelectItem>
                        <SelectItem value="payment_failure">Payment Failure</SelectItem>
                        <SelectItem value="gateway_abuse">Gateway Abuse</SelectItem>
                        <SelectItem value="amount_anomaly">Amount Anomaly</SelectItem>
                        <SelectItem value="device_reuse">Device Reuse</SelectItem>
                        <SelectItem value="geo_ip">Geo/IP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe what this rule does"
                    rows={2}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Threshold Value</Label>
                    <Input
                      type="number"
                      value={formData.threshold_value}
                      onChange={(e) => setFormData({ ...formData, threshold_value: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Time Window (minutes)</Label>
                    <Input
                      type="number"
                      value={formData.time_window_minutes}
                      onChange={(e) => setFormData({ ...formData, time_window_minutes: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select
                      value={formData.action}
                      onValueChange={(v) => setFormData({ ...formData, action: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allow">Allow</SelectItem>
                        <SelectItem value="flag">Flag</SelectItem>
                        <SelectItem value="block">Block</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select
                      value={formData.severity}
                      onValueChange={(v) => setFormData({ ...formData, severity: v })}
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
                  <div className="space-y-2">
                    <Label>Priority (1-100)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Scope</Label>
                  <Select
                    value={formData.scope}
                    onValueChange={(v) => setFormData({ ...formData, scope: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="gateway">Per Gateway</SelectItem>
                      <SelectItem value="merchant">Per Merchant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!isCreating && (
                  <div className="space-y-2">
                    <Label>Change Reason</Label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Why are you making this change?"
                    />
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                  <Button onClick={handleSave} className="flex-1">
                    <Save className="h-4 w-4 mr-2" />
                    {isCreating ? 'Create Rule' : 'Save Changes'}
                  </Button>
                  {editingRule && (
                    <Button
                      variant={editingRule.is_active ? 'destructive' : 'outline'}
                      onClick={() => setConfirmDialog({
                        open: true,
                        ruleId: editingRule.id,
                        isActive: editingRule.is_active,
                        ruleName: editingRule.name,
                      })}
                    >
                      {editingRule.is_active ? (
                        <>
                          <PowerOff className="h-4 w-4 mr-2" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-2" />
                          Enable
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Confirm Toggle Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.isActive ? 'Disable Rule?' : 'Enable Rule?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.isActive
                ? `This will stop "${confirmDialog.ruleName}" from evaluating new checkout sessions. Existing sessions are not affected.`
                : `This will activate "${confirmDialog.ruleName}" and it will start evaluating new checkout sessions immediately.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label>Reason (required)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for this change"
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleToggle}
              className={confirmDialog.isActive ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {confirmDialog.isActive ? 'Disable Rule' : 'Enable Rule'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}