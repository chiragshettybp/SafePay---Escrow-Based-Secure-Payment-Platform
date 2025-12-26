import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, ShieldAlert, ShieldOff, Power, Clock, User, FileText, TrendingDown, CheckCircle } from 'lucide-react';
import { useAdminKillSwitch, type PlatformIncident, type KillSwitchAuditLog } from '@/hooks/useAdminKillSwitch';
import { format } from 'date-fns';

const LEVEL_CONFIG = {
  1: { name: 'Soft Degradation', icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  2: { name: 'Block Sessions', icon: ShieldAlert, color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  3: { name: 'Gateway Shutdown', icon: ShieldOff, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  4: { name: 'Full Lockdown', icon: Power, color: 'text-red-700', bgColor: 'bg-red-700/10', borderColor: 'border-red-700/30' },
};

export default function AdminCheckoutIncidentDetails() {
  const { incident_id } = useParams<{ incident_id: string }>();
  const navigate = useNavigate();
  const { getIncident, getIncidentAuditLogs } = useAdminKillSwitch();

  const [loading, setLoading] = useState(true);
  const [incident, setIncident] = useState<PlatformIncident | null>(null);
  const [auditLogs, setAuditLogs] = useState<KillSwitchAuditLog[]>([]);

  useEffect(() => {
    if (!incident_id) return;

    const loadData = async () => {
      setLoading(true);
      const [incidentData, logsData] = await Promise.all([
        getIncident(incident_id),
        getIncidentAuditLogs(incident_id),
      ]);
      setIncident(incidentData);
      setAuditLogs(logsData);
      setLoading(false);
    };

    loadData();
  }, [incident_id, getIncident, getIncidentAuditLogs]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading incident details...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!incident) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <h2 className="text-xl font-semibold">Incident Not Found</h2>
          <Button className="mt-4" onClick={() => navigate('/admin/checkout/incidents')}>
            Back to Incidents
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const config = LEVEL_CONFIG[incident.level as 1 | 2 | 3 | 4];
  const Icon = config.icon;
  const impactSummary = incident.impact_summary || {};

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title={`Incident: Level ${incident.level}`}
          subtitle={config.name}
          backUrl="/admin/checkout/incidents"
        />

        {/* Status Banner */}
        <Card className={`${incident.status === 'active' ? 'border-destructive/50 bg-destructive/5' : 'border-green-500/30 bg-green-500/5'}`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className={`h-6 w-6 ${config.color}`} />
                <div>
                  <h3 className="font-semibold">
                    {incident.status === 'active' ? 'Active Incident' : 'Resolved Incident'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {incident.status === 'active' 
                      ? 'This incident is currently affecting the platform'
                      : `Resolved on ${format(new Date(incident.resolved_at!), 'MMM d, yyyy HH:mm')}`
                    }
                  </p>
                </div>
              </div>
              <Badge 
                variant={incident.status === 'active' ? 'destructive' : 'outline'}
                className={incident.status === 'resolved' ? 'bg-green-500/10 text-green-500 border-green-500/30' : ''}
              >
                {incident.status === 'active' ? 'ACTIVE' : 'RESOLVED'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Reason */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Incident Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{incident.reason}</p>
              </CardContent>
            </Card>

            {/* Resolution Notes */}
            {incident.resolution_notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    Resolution Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground whitespace-pre-wrap">{incident.resolution_notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline
                </CardTitle>
                <CardDescription>Actions taken during this incident</CardDescription>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No timeline events recorded</p>
                ) : (
                  <div className="space-y-4">
                    {auditLogs.map((log, index) => (
                      <div key={log.id} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-3 h-3 rounded-full ${
                            log.action_type === 'activate' ? 'bg-red-500' : 'bg-green-500'
                          }`} />
                          {index < auditLogs.length - 1 && (
                            <div className="w-0.5 h-full bg-border mt-1" />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium capitalize">{log.action_type.replace('-', ' ')}</span>
                            {log.new_level !== null && (
                              <Badge variant="outline" className="text-xs">
                                Level {log.new_level}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{log.reason}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Incident Info */}
            <Card>
              <CardHeader>
                <CardTitle>Incident Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-sm text-muted-foreground">Level</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`${config.bgColor} ${config.color} ${config.borderColor}`}>
                      Level {incident.level}
                    </Badge>
                    <span className="text-sm">{config.name}</span>
                  </div>
                </div>

                <Separator />

                <div>
                  <span className="text-sm text-muted-foreground">Activated At</span>
                  <p className="font-medium">
                    {format(new Date(incident.activated_at), 'MMM d, yyyy HH:mm:ss')}
                  </p>
                </div>

                {incident.resolved_at && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm text-muted-foreground">Resolved At</span>
                      <p className="font-medium">
                        {format(new Date(incident.resolved_at), 'MMM d, yyyy HH:mm:ss')}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                <div>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" /> Activated By
                  </span>
                  <p className="font-mono text-xs mt-1 truncate">{incident.activated_by}</p>
                </div>

                {incident.resolved_by && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" /> Resolved By
                      </span>
                      <p className="font-mono text-xs mt-1 truncate">{incident.resolved_by}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Impact Summary */}
            {incident.status === 'resolved' && Object.keys(impactSummary).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5" />
                    Impact Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {impactSummary.duration_minutes !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Duration</span>
                      <span className="font-medium">{impactSummary.duration_minutes} min</span>
                    </div>
                  )}
                  {impactSummary.sessions_blocked !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Sessions Blocked</span>
                      <span className="font-medium">{impactSummary.sessions_blocked}</span>
                    </div>
                  )}
                  {impactSummary.payments_failed !== undefined && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Payments Failed</span>
                      <span className="font-medium">{impactSummary.payments_failed}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
