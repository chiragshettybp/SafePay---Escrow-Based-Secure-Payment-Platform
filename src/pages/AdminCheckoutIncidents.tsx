import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/admin/AdminLayout';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, ShieldAlert, ShieldOff, Power, Eye, CheckCircle } from 'lucide-react';
import { useAdminKillSwitch } from '@/hooks/useAdminKillSwitch';
import { format, formatDistanceStrict } from 'date-fns';

const LEVEL_CONFIG = {
  1: { name: 'Soft Degradation', icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', borderColor: 'border-yellow-500/30' },
  2: { name: 'Block Sessions', icon: ShieldAlert, color: 'text-orange-500', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/30' },
  3: { name: 'Gateway Shutdown', icon: ShieldOff, color: 'text-red-500', bgColor: 'bg-red-500/10', borderColor: 'border-red-500/30' },
  4: { name: 'Full Lockdown', icon: Power, color: 'text-red-700', bgColor: 'bg-red-700/10', borderColor: 'border-red-700/30' },
};

export default function AdminCheckoutIncidents() {
  const navigate = useNavigate();
  const { loading, incidents } = useAdminKillSwitch();

  const getDuration = (incident: typeof incidents[0]) => {
    const start = new Date(incident.activated_at);
    const end = incident.resolved_at ? new Date(incident.resolved_at) : new Date();
    return formatDistanceStrict(start, end);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Incident History"
          description="Audit trail of all kill-switch escalations"
          backLink="/admin/checkout/kill-switch"
        />

        <Card>
          <CardHeader>
            <CardTitle>All Incidents</CardTitle>
            <CardDescription>
              Complete history of platform incidents and escalations
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : incidents.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No Incidents</h3>
                <p className="text-muted-foreground">The platform has no recorded incidents.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Activated At</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((incident) => {
                    const config = LEVEL_CONFIG[incident.level as 1 | 2 | 3 | 4];
                    const Icon = config.icon;
                    
                    return (
                      <TableRow key={incident.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${config.color}`} />
                            <Badge variant="outline" className={`${config.bgColor} ${config.color} ${config.borderColor}`}>
                              Level {incident.level}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={incident.status === 'active' ? 'destructive' : 'secondary'}>
                            {incident.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className="truncate">{incident.reason}</p>
                        </TableCell>
                        <TableCell>
                          {format(new Date(incident.activated_at), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          {getDuration(incident)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/admin/checkout/incidents/${incident.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
