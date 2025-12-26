import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Ban, 
  AlertTriangle, 
  Lock, 
  CheckCircle,
  Shield,
  Zap,
  TrendingUp,
  FileText,
  ArrowLeft
} from 'lucide-react';

export default function AdminCheckoutSettingsCod() {
  const navigate = useNavigate();

  const disabledReasons = [
    {
      icon: Shield,
      title: 'Fraud Prevention',
      description: 'COD has significantly higher fraud and return rates compared to prepaid orders.',
    },
    {
      icon: Zap,
      title: 'Faster Settlements',
      description: 'Prepaid payments allow instant settlement and better cash flow for merchants.',
    },
    {
      icon: TrendingUp,
      title: 'Better Conversion Control',
      description: 'Prepaid-only checkout reduces RTO (Return to Origin) and improves profitability.',
    },
    {
      icon: FileText,
      title: 'Platform Compliance',
      description: 'This platform operates under prepaid-only payment policies for regulatory compliance.',
    },
  ];

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        <AdminPageHeader
          title="COD Settings"
          actions={
            <Button 
              variant="outline" 
              onClick={() => navigate('/admin/checkout/settings')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          }
        />

        {/* Disabled Notice */}
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                <Ban className="h-8 w-8 text-destructive" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h2 className="text-xl font-bold">Cash on Delivery is Disabled</h2>
                  <Badge className="bg-destructive text-destructive-foreground">
                    <Lock className="h-3 w-3 mr-1" />
                    Permanently Locked
                  </Badge>
                </div>
                <p className="text-muted-foreground mb-4">
                  Cash on Delivery (COD) is permanently disabled on this platform. 
                  This checkout system supports prepaid payments only.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="text-sm">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                    UPI
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                    Cards
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                    Wallets
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                    EMI
                  </Badge>
                  <Badge variant="outline" className="text-sm">
                    <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                    NetBanking
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning Notice */}
        <Card className="border-yellow-500/30 bg-yellow-500/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  This page is read-only
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  COD cannot be enabled from this page or any other page. 
                  This is an informational page only with no interactive controls.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reasons for Disabling */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Why COD is Disabled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              {disabledReasons.map((reason, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <reason.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium mb-1">{reason.title}</h3>
                      <p className="text-sm text-muted-foreground">{reason.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Audit Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">COD Status</span>
                <Badge variant="destructive">Permanently Disabled</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Disabled Since</span>
                <span className="font-medium">Platform Launch</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Policy Type</span>
                <span className="font-medium">Prepaid Only</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Can Be Re-enabled</span>
                <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                  <Lock className="h-3 w-3 mr-1" />
                  No
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No Interactive Elements Notice */}
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            This page contains no save buttons, toggles, or API calls that modify data.
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}