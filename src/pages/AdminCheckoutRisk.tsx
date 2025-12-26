import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  Ban, 
  TrendingUp, 
  RefreshCw, 
  Eye,
  Activity,
  FileWarning,
  ChevronRight
} from 'lucide-react';
import { useAdminRisk } from '@/hooks/useAdminRisk';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminCheckoutRisk() {
  const navigate = useNavigate();
  const { 
    metrics, 
    signals, 
    distribution, 
    loading,
    fetchMetrics, 
    fetchDistribution, 
    fetchSignals 
  } = useAdminRisk();

  useEffect(() => {
    fetchMetrics();
    fetchDistribution();
    fetchSignals();
  }, [fetchMetrics, fetchDistribution, fetchSignals]);

  const kpiCards = [
    {
      title: 'Sessions Evaluated',
      value: metrics?.totalEvaluated ?? 0,
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      href: '/admin/checkout/sessions',
    },
    {
      title: 'Sessions Flagged',
      value: metrics?.flagged ?? 0,
      icon: FileWarning,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      href: '/admin/checkout/sessions?risk=flagged',
    },
    {
      title: 'Sessions Blocked',
      value: metrics?.blocked ?? 0,
      icon: Ban,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      href: '/admin/checkout/risk/blocked',
    },
    {
      title: 'Block Rate',
      value: `${(metrics?.blockRate ?? 0).toFixed(1)}%`,
      icon: Shield,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'False-Positive Overrides',
      value: metrics?.falsePositiveOverrides ?? 0,
      icon: RefreshCw,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      href: '/admin/checkout/risk/blocked?status=unblocked',
    },
    {
      title: 'Avg Risk Score',
      value: metrics?.avgRiskScore ?? 0,
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
    },
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const maxDistCount = Math.max(...distribution.map(d => d.count), 1);

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <AdminPageHeader
          title="Risk Overview"
          actions={
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => navigate('/admin/checkout/risk/rules')}
              >
                Manage Rules
              </Button>
              <Button onClick={() => navigate('/admin/checkout/risk/blocked')}>
                <Ban className="h-4 w-4 mr-2" />
                Blocked Entities
              </Button>
            </div>
          }
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {kpiCards.map((kpi) => (
            <Card 
              key={kpi.title}
              className={`${kpi.href ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
              onClick={() => kpi.href && navigate(kpi.href)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                  </div>
                  {kpi.href && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
                <p className="text-2xl font-bold">{loading ? <Skeleton className="h-8 w-16" /> : kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Risk Score Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Risk Score Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))
              ) : (
                distribution.map((item) => (
                  <div key={item.range} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{item.range}</span>
                      <span className="text-muted-foreground">
                        {item.count} sessions ({item.blocked} blocked)
                      </span>
                    </div>
                    <div className="relative">
                      <Progress 
                        value={(item.count / maxDistCount) * 100} 
                        className="h-3"
                      />
                      {item.blocked > 0 && (
                        <div 
                          className="absolute top-0 left-0 h-3 bg-destructive/50 rounded-full"
                          style={{ width: `${(item.blocked / maxDistCount) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
              
              <div className="flex gap-4 text-xs text-muted-foreground pt-2 border-t">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-primary" />
                  <span>Total</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded bg-destructive/50" />
                  <span>Blocked</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Risk Signals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Top Risk Signals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  {Array(5).fill(0).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : signals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No risk signals triggered yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {signals.map((signal, index) => (
                    <div 
                      key={signal.name}
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => navigate('/admin/checkout/risk/rules')}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="font-medium text-sm">{signal.name}</p>
                          <Badge className={`text-xs ${getSeverityColor(signal.severity)}`}>
                            {signal.severity}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{signal.count}</p>
                        <p className="text-xs text-muted-foreground">triggers</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/admin/checkout/risk/rules')}
              >
                <Shield className="h-5 w-5" />
                <span>Configure Rules</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/admin/checkout/risk/blocked')}
              >
                <Ban className="h-5 w-5" />
                <span>Review Blocked</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-4 flex-col gap-2"
                onClick={() => navigate('/admin/checkout/sessions')}
              >
                <Eye className="h-5 w-5" />
                <span>View Sessions</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}