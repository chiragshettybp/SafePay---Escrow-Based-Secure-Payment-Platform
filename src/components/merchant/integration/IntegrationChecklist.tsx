import { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Key,
  TestTube,
  Webhook,
  Zap,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { merchantSupabase } from '@/integrations/supabase/merchantClient';
import { useToast } from '@/hooks/use-toast';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  completedAt?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
}

interface IntegrationChecklistProps {
  merchantId?: string;
  onNavigate?: (path: string) => void;
}

export function IntegrationChecklist({ merchantId, onNavigate }: IntegrationChecklistProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([
    {
      id: 'api_key_generated',
      label: 'API Key Generated',
      description: 'Create your first API key for authentication',
      completed: false,
      icon: Key,
      href: '/merchant/checkout/integration/api-keys',
    },
    {
      id: 'checkout_tested',
      label: 'Checkout Tested',
      description: 'Run a test checkout flow',
      completed: false,
      icon: TestTube,
      href: '/merchant/checkout/integration/test',
    },
    {
      id: 'webhook_configured',
      label: 'Webhook Configured',
      description: 'Set up webhook for payment notifications',
      completed: false,
      icon: Webhook,
      href: '/merchant/checkout/integration/webhooks',
    },
    {
      id: 'live_mode_enabled',
      label: 'Live Mode Ready',
      description: 'Generate live API keys for production',
      completed: false,
      icon: Zap,
      href: '/merchant/checkout/integration/api-keys',
    },
  ]);

  useEffect(() => {
    if (merchantId) {
      fetchChecklist();
    }
  }, [merchantId]);

  const fetchChecklist = async () => {
    if (!merchantId) return;
    setIsLoading(true);

    try {
      const { data, error } = await merchantSupabase
        .from('merchant_integration_checklist')
        .select('*')
        .eq('merchant_id', merchantId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setChecklist((prev) =>
          prev.map((item) => {
            const fieldName = item.id as keyof typeof data;
            const completedAtField = `${item.id}_at` as keyof typeof data;
            return {
              ...item,
              completed: Boolean(data[fieldName]),
              completedAt: data[completedAtField] as string | undefined,
            };
          })
        );
      }
    } catch (error) {
      console.error('Error fetching checklist:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateChecklistItem = async (itemId: string, completed: boolean) => {
    if (!merchantId) return;

    try {
      const updateData: Record<string, unknown> = {
        merchant_id: merchantId,
        [itemId]: completed,
        [`${itemId}_at`]: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await merchantSupabase
        .from('merchant_integration_checklist')
        .upsert(updateData as any, { onConflict: 'merchant_id' });

      if (error) throw error;

      setChecklist((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                completed,
                completedAt: completed ? new Date().toISOString() : undefined,
              }
            : item
        )
      );

      toast({
        title: completed ? 'Step Completed' : 'Step Unmarked',
        description: `Checklist updated successfully`,
      });
    } catch (error) {
      console.error('Error updating checklist:', error);
      toast({
        title: 'Error',
        description: 'Failed to update checklist',
        variant: 'destructive',
      });
    }
  };

  const completedCount = checklist.filter((item) => item.completed).length;
  const progress = (completedCount / checklist.length) * 100;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Integration Checklist</span>
          <span className="text-sm font-normal text-muted-foreground">
            {completedCount}/{checklist.length} completed
          </span>
        </CardTitle>
        <CardDescription>
          Complete these steps to go live
        </CardDescription>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="space-y-3">
        {checklist.map((item) => (
          <div
            key={item.id}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              item.completed
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-muted/30 hover:bg-muted/50'
            }`}
          >
            <button
              onClick={() => updateChecklistItem(item.id, !item.completed)}
              className="flex-shrink-0 mt-0.5"
            >
              {item.completed ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground hover:text-primary" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <item.icon className={`h-4 w-4 ${item.completed ? 'text-green-600' : 'text-muted-foreground'}`} />
                <p className={`font-medium text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {item.label}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
            </div>
            {item.href && !item.completed && onNavigate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate(item.href!)}
              >
                Start
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
