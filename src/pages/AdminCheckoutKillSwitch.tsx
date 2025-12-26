import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Shield, ShieldOff, ShieldAlert, Zap, Power, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useAdminKillSwitch } from '@/hooks/useAdminKillSwitch';
import { format } from 'date-fns';
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

const LEVEL_CONFIG = {
  1: {
    name: 'Soft Degradation',
    description: 'Show warning banner on checkout. Payments continue.',
    icon: AlertTriangle,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
  },
  2: {
    name: 'Block New Sessions',
    description: 'Block new checkout sessions. Existing sessions can complete.',
    icon: ShieldAlert,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/30',
  },
  3: {
    name: 'Gateway Shutdown',
    description: 'Disable all payment gateways. Force payment failures.',
    icon: ShieldOff,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  4: {
    name: 'Full Lockdown',
    description: 'Block all sessions, disable payment links, maintenance mode.',
    icon: Power,
    color: 'text-red-700',
    bgColor: 'bg-red-700/10',
    borderColor: 'border-red-700/30',
  },
};

export default function AdminCheckoutKillSwitch() {
  const navigate = useNavigate();
  const {
    loading,
    activeIncident,
    currentLevel,
    isCheckoutLocked,
    isGatewayShutdown,
    isPaymentLinksDisabled,
    isDegradationWarning,
    activateKillSwitch,
    deactivateKillSwitch,
    incidents,
  } = useAdminKillSwitch();

  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3 | 4 | null>(null);
  const [reason, setReason] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleActivate = async () => {
    if (!selectedLevel || reason.length < 10) return;

    setIsSubmitting(true);
    const success = await activateKillSwitch(selectedLevel, reason);
    setIsSubmitting(false);

    if (success) {
      setConfirmDialogOpen(false);
      setSelectedLevel(null);
      setReason('');
    }
  };

  const handleDeactivate = async () => {
    if (!activeIncident || resolutionNotes.length < 10) return;

    setIsSubmitting(true);
    const success = await deactivateKillSwitch(activeIncident.id, resolutionNotes);
    setIsSubmitting(false);

    if (success) {
      setDeactivateDialogOpen(false);
      setResolutionNotes('');
    }
  };

  const getStatusBadge = () => {
    if (currentLevel === 0) {
      return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">Active</Badge>;
    }
    const config = LEVEL_CONFIG[currentLevel as 1 | 2 | 3 | 4];
    return <Badge variant="outline" className={`${config.bgColor} ${config.color} ${config.borderColor}`}>Level {currentLevel} - {config.name}</Badge>;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Kill-Switch Control"
          subtitle="Emergency platform controls for checkout system"
          backUrl="/admin/checkout"
        />

        {/* Current Platform Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Platform Status
                </CardTitle>
                <CardDescription>Current state of the checkout system</CardDescription>
              </div>
              {getStatusBadge()}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`p-4 rounded-lg border ${isDegradationWarning ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-muted/50 border-border'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {isDegradationWarning ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                  <span className="text-sm font-medium">Warning Banner</span>
                </div>
                <span className={`text-sm ${isDegradationWarning ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                  {isDegradationWarning ? 'Showing' : 'Hidden'}
                </span>
              </div>

              <div className={`p-4 rounded-lg border ${isCheckoutLocked ? 'bg-orange-500/10 border-orange-500/30' : 'bg-muted/50 border-border'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {isCheckoutLocked ? <ShieldAlert className="h-4 w-4 text-orange-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                  <span className="text-sm font-medium">New Sessions</span>
                </div>
                <span className={`text-sm ${isCheckoutLocked ? 'text-orange-500' : 'text-muted-foreground'}`}>
                  {isCheckoutLocked ? 'Blocked' : 'Allowed'}
                </span>
              </div>

              <div className={`p-4 rounded-lg border ${isGatewayShutdown ? 'bg-red-500/10 border-red-500/30' : 'bg-muted/50 border-border'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {isGatewayShutdown ? <ShieldOff className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                  <span className="text-sm font-medium">Payment Gateways</span>
                </div>
                <span className={`text-sm ${isGatewayShutdown ? 'text-red-500' : 'text-muted-foreground'}`}>
                  {isGatewayShutdown ? 'Shutdown' : 'Active'}
                </span>
              </div>

              <div className={`p-4 rounded-lg border ${isPaymentLinksDisabled ? 'bg-red-700/10 border-red-700/30' : 'bg-muted/50 border-border'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {isPaymentLinksDisabled ? <Power className="h-4 w-4 text-red-700" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                  <span className="text-sm font-medium">Payment Links</span>
                </div>
                <span className={`text-sm ${isPaymentLinksDisabled ? 'text-red-700' : 'text-muted-foreground'}`}>
                  {isPaymentLinksDisabled ? 'Disabled' : 'Active'}
                </span>
              </div>
            </div>

            {activeIncident && (
              <div className="mt-4 p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-destructive flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Active Incident
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">{activeIncident.reason}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Since {format(new Date(activeIncident.activated_at), 'MMM d, HH:mm')}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/admin/checkout/incidents/${activeIncident.id}`)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kill-Switch Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Kill-Switch Controls
            </CardTitle>
            <CardDescription>
              Activate emergency controls. Each level includes all lower levels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeIncident ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border">
                  <p className="text-sm text-muted-foreground">
                    An incident is currently active. Deactivate it to restore normal operations.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="w-full border-green-500/30 text-green-500 hover:bg-green-500/10"
                  onClick={() => setDeactivateDialogOpen(true)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Deactivate Kill-Switch & Restore System
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {([1, 2, 3, 4] as const).map((level) => {
                  const config = LEVEL_CONFIG[level];
                  const Icon = config.icon;
                  
                  return (
                    <button
                      key={level}
                      onClick={() => {
                        setSelectedLevel(level);
                        setConfirmDialogOpen(true);
                      }}
                      disabled={loading}
                      className={`p-4 rounded-lg border text-left transition-all hover:scale-[1.02] ${config.bgColor} ${config.borderColor} hover:border-opacity-60`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className={`h-5 w-5 ${config.color}`} />
                        <span className={`font-medium ${config.color}`}>Level {level}</span>
                      </div>
                      <h4 className="font-medium mb-1">{config.name}</h4>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Incidents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Incidents</CardTitle>
                <CardDescription>History of kill-switch activations</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/admin/checkout/incidents')}>
                View All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {incidents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No incidents recorded
              </div>
            ) : (
              <div className="space-y-2">
                {incidents.slice(0, 5).map((incident) => {
                  const config = LEVEL_CONFIG[incident.level as 1 | 2 | 3 | 4];
                  return (
                    <div
                      key={incident.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70"
                      onClick={() => navigate(`/admin/checkout/incidents/${incident.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={`${config.bgColor} ${config.color} ${config.borderColor}`}>
                          L{incident.level}
                        </Badge>
                        <div>
                          <p className="text-sm font-medium line-clamp-1">{incident.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(incident.activated_at), 'MMM d, yyyy HH:mm')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={incident.status === 'active' ? 'destructive' : 'secondary'}>
                        {incident.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activation Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Activate Kill-Switch Level {selectedLevel}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedLevel && LEVEL_CONFIG[selectedLevel].description}
              <br /><br />
              This action will immediately affect live checkout traffic.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Reason (required, min 10 characters)</Label>
              <Textarea
                id="reason"
                placeholder="Explain why you're activating the kill-switch..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleActivate}
              disabled={isSubmitting || reason.length < 10}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? 'Activating...' : 'Activate Kill-Switch'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deactivation Dialog */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-green-500">
              <CheckCircle className="h-5 w-5" />
              Restore System Operations?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the kill-switch and restore normal checkout operations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="resolution">Resolution Notes (required, min 10 characters)</Label>
              <Textarea
                id="resolution"
                placeholder="Explain how the issue was resolved..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={isSubmitting || resolutionNotes.length < 10}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {isSubmitting ? 'Restoring...' : 'Restore System'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
