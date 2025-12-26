import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TestTube, 
  Play,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ArrowLeft,
  Zap,
  CreditCard,
  Wallet,
  Smartphone,
  Building,
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';
import { useMerchantIntegration, IntegrationTest, TestStep } from '@/hooks/useMerchantIntegration';
import { format } from 'date-fns';

const paymentMethods = [
  { id: 'upi', name: 'UPI', icon: Smartphone },
  { id: 'card', name: 'Card', icon: CreditCard },
  { id: 'wallet', name: 'Wallet', icon: Wallet },
  { id: 'netbanking', name: 'NetBanking', icon: Building },
];

export default function MerchantCheckoutIntegrationTest() {
  const navigate = useNavigate();
  const { merchant } = useMerchantAuth();
  const { integrationTests, integrationStatus, isLoading, runIntegrationTest } = useMerchantIntegration(merchant?.id);

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('upi');
  const [testAmount, setTestAmount] = useState('100');
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<IntegrationTest | null>(null);

  // Watch for test updates
  useEffect(() => {
    if (currentTest) {
      const updated = integrationTests.find(t => t.id === currentTest.id);
      if (updated) {
        setCurrentTest(updated);
        if (updated.status === 'success' || updated.status === 'failed') {
          setIsRunning(false);
        }
      }
    }
  }, [integrationTests, currentTest]);

  const handleRunTest = async () => {
    setIsRunning(true);
    const testId = await runIntegrationTest('full');
    if (testId) {
      const test = integrationTests.find(t => t.id === testId);
      if (test) setCurrentTest(test);
    } else {
      setIsRunning(false);
    }
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'running':
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTestProgress = () => {
    if (!currentTest) return 0;
    const completed = currentTest.steps.filter(s => s.status === 'success' || s.status === 'failed').length;
    return (completed / currentTest.steps.length) * 100;
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
      <Seo title="Integration Test" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/merchant/checkout/integration')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Integration Test</h1>
            <p className="text-muted-foreground">
              Verify your checkout integration end-to-end
            </p>
          </div>
        </div>

        {/* Prerequisites Check */}
        {!integrationStatus.isConnected && (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-800 dark:text-amber-300">Integration Not Connected</p>
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Please generate API keys before running integration tests.
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => navigate('/merchant/checkout/integration/api-keys')}
                  >
                    Generate API Keys
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Test Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Test Configuration
              </CardTitle>
              <CardDescription>
                Configure and run a test checkout flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Payment Method */}
              <div className="space-y-3">
                <Label>Payment Method (Test Mode)</Label>
                <RadioGroup
                  value={selectedPaymentMethod}
                  onValueChange={setSelectedPaymentMethod}
                  className="grid grid-cols-2 gap-3"
                >
                  {paymentMethods.map((method) => (
                    <div key={method.id}>
                      <RadioGroupItem
                        value={method.id}
                        id={method.id}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={method.id}
                        className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                      >
                        <method.icon className="h-4 w-4" />
                        {method.name}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* Test Amount */}
              <div className="space-y-2">
                <Label htmlFor="testAmount">Test Amount (₹)</Label>
                <Input
                  id="testAmount"
                  type="number"
                  value={testAmount}
                  onChange={(e) => setTestAmount(e.target.value)}
                  min="1"
                  max="10000"
                />
                <p className="text-xs text-muted-foreground">
                  Test mode - no real money will be charged
                </p>
              </div>

              {/* Run Test Button */}
              <Button 
                onClick={handleRunTest} 
                disabled={isRunning || !integrationStatus.isConnected}
                className="w-full"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Test Checkout
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Test Results
              </CardTitle>
              {currentTest && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={
                    currentTest.status === 'success' ? 'default' :
                    currentTest.status === 'failed' ? 'destructive' :
                    'secondary'
                  }>
                    {currentTest.status === 'success' ? 'Passed' :
                     currentTest.status === 'failed' ? 'Failed' :
                     currentTest.status === 'running' ? 'Running' : 'Pending'}
                  </Badge>
                  {currentTest.started_at && (
                    <span className="text-xs text-muted-foreground">
                      Started {format(new Date(currentTest.started_at), 'HH:mm:ss')}
                    </span>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {currentTest ? (
                <div className="space-y-4">
                  {/* Progress */}
                  {isRunning && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span>{Math.round(getTestProgress())}%</span>
                      </div>
                      <Progress value={getTestProgress()} className="h-2" />
                    </div>
                  )}

                  {/* Steps */}
                  <div className="space-y-3">
                    {currentTest.steps.map((step, index) => (
                      <div 
                        key={index}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${
                          step.status === 'success' ? 'bg-green-50 dark:bg-green-900/20 border-green-200' :
                          step.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20 border-red-200' :
                          step.status === 'running' ? 'bg-primary/5 border-primary/20' :
                          'bg-muted/50'
                        }`}
                      >
                        {getStepIcon(step.status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{step.name}</p>
                          {step.message && (
                            <p className="text-xs text-muted-foreground mt-1">{step.message}</p>
                          )}
                          {step.timestamp && (
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(step.timestamp), 'HH:mm:ss')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Error Message */}
                  {currentTest.error_message && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200">
                      <p className="text-sm text-red-700 dark:text-red-400">
                        {currentTest.error_message}
                      </p>
                    </div>
                  )}

                  {/* Retry Button */}
                  {currentTest.status === 'failed' && (
                    <Button 
                      variant="outline" 
                      onClick={handleRunTest}
                      className="w-full"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retry Test
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <TestTube className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                  <p className="text-muted-foreground">No test results yet</p>
                  <p className="text-sm text-muted-foreground">Run a test to see results here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Test History */}
        <Card>
          <CardHeader>
            <CardTitle>Test History</CardTitle>
          </CardHeader>
          <CardContent>
            {integrationTests.length > 0 ? (
              <div className="space-y-2">
                {integrationTests.slice(0, 5).map((test) => (
                  <div 
                    key={test.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                    onClick={() => setCurrentTest(test)}
                  >
                    <div className="flex items-center gap-3">
                      {test.status === 'success' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : test.status === 'failed' ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium text-sm capitalize">{test.test_type} Test</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(test.started_at), 'MMM d, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={
                      test.status === 'success' ? 'default' :
                      test.status === 'failed' ? 'destructive' :
                      'secondary'
                    }>
                      {test.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No previous tests</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
