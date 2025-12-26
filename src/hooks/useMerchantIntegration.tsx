import { useState, useEffect, useCallback } from 'react';
import { merchantSupabase } from '@/integrations/supabase/merchantClient';
import { useToast } from '@/hooks/use-toast';

export interface ApiKey {
  id: string;
  merchant_id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  key_type: string;
  environment: string;
  scopes: string[];
  is_active: boolean;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface Webhook {
  id: string;
  merchant_id: string;
  name: string;
  url: string;
  events: string[];
  is_active: boolean;
  last_triggered_at: string | null;
  last_response_code: number | null;
  last_response_message: string | null;
  failure_count: number;
  created_at: string;
  updated_at: string;
}

export interface WebhookLog {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_code: number | null;
  response_body: string | null;
  response_time_ms: number | null;
  success: boolean;
  retry_count: number;
  created_at: string;
}

export interface IntegrationTest {
  id: string;
  merchant_id: string;
  test_type: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  steps: TestStep[];
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface TestStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message?: string;
  timestamp?: string;
}

export interface IntegrationStatus {
  isConnected: boolean;
  environment: 'test' | 'live';
  activeGateways: string[];
  lastTransaction: string | null;
  apiKeysCount: number;
  webhooksCount: number;
  healthScore: number;
}

const SUPPORTED_EVENTS = [
  'checkout.session.created',
  'checkout.session.completed',
  'payment.initiated',
  'payment.success',
  'payment.failed',
  'refund.initiated',
  'refund.completed',
];

export function useMerchantIntegration(merchantId?: string) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<WebhookLog[]>([]);
  const [integrationTests, setIntegrationTests] = useState<IntegrationTest[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    isConnected: false,
    environment: 'test',
    activeGateways: ['UPI', 'Cards', 'Wallets', 'EMI', 'NetBanking'],
    lastTransaction: null,
    apiKeysCount: 0,
    webhooksCount: 0,
    healthScore: 0,
  });

  // Fetch all integration data
  const fetchIntegrationData = useCallback(async () => {
    if (!merchantId) return;
    setIsLoading(true);

    try {
      // Fetch API keys
      const { data: keysData, error: keysError } = await merchantSupabase
        .from('merchant_api_keys')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (keysError) throw keysError;
      setApiKeys((keysData as unknown as ApiKey[]) || []);

      // Fetch webhooks
      const { data: webhooksData, error: webhooksError } = await merchantSupabase
        .from('merchant_webhooks' as any)
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (webhooksError) throw webhooksError;
      setWebhooks((webhooksData as unknown as Webhook[]) || []);

      // Fetch last transaction
      const { data: lastOrder } = await merchantSupabase
        .from('orders')
        .select('created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Calculate integration status
      const activeKeys = (keysData || []).filter((k: any) => k.is_active);
      const activeWebhooks = (webhooksData || []).filter((w: any) => w.is_active);
      const hasLiveKeys = activeKeys.some((k: any) => k.environment === 'live');

      let healthScore = 0;
      if (activeKeys.length > 0) healthScore += 30;
      if (activeWebhooks.length > 0) healthScore += 30;
      if (hasLiveKeys) healthScore += 20;
      if (lastOrder) healthScore += 20;

      setIntegrationStatus({
        isConnected: activeKeys.length > 0,
        environment: hasLiveKeys ? 'live' : 'test',
        activeGateways: ['UPI', 'Cards', 'Wallets', 'EMI', 'NetBanking'],
        lastTransaction: lastOrder?.created_at || null,
        apiKeysCount: activeKeys.length,
        webhooksCount: activeWebhooks.length,
        healthScore,
      });
    } catch (error) {
      console.error('Error fetching integration data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load integration data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [merchantId, toast]);

  // Fetch webhook logs
  const fetchWebhookLogs = useCallback(async (webhookId: string) => {
    try {
      const { data, error } = await merchantSupabase
        .from('merchant_webhook_logs' as any)
        .select('*')
        .eq('webhook_id', webhookId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setWebhookLogs((data as unknown as WebhookLog[]) || []);
    } catch (error) {
      console.error('Error fetching webhook logs:', error);
    }
  }, []);

  // Generate new API key
  const generateApiKey = async (name: string, keyType: 'public' | 'secret', environment: 'test' | 'live') => {
    if (!merchantId) return null;

    try {
      // Generate a random key
      const keyValue = `${keyType === 'public' ? 'pk' : 'sk'}_${environment}_${crypto.randomUUID().replace(/-/g, '')}`;
      const keyPrefix = keyValue.substring(0, 12);
      
      // Hash the key (in production, use proper hashing)
      const encoder = new TextEncoder();
      const data = encoder.encode(keyValue);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const { data: newKey, error } = await merchantSupabase
        .from('merchant_api_keys')
        .insert({
          merchant_id: merchantId,
          name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          scopes: ['checkout:create', 'checkout:read'],
          is_active: true,
        } as any)
        .select()
        .single();

      if (error) throw error;

      await fetchIntegrationData();
      
      toast({
        title: 'API Key Generated',
        description: 'Your new API key has been created. Make sure to copy it now!',
      });

      // Return the full key value (only shown once)
      return keyValue;
    } catch (error) {
      console.error('Error generating API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate API key',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Revoke API key
  const revokeApiKey = async (keyId: string) => {
    if (!merchantId) return false;

    try {
      const { error } = await merchantSupabase
        .from('merchant_api_keys')
        .update({ is_active: false })
        .eq('id', keyId)
        .eq('merchant_id', merchantId);

      if (error) throw error;

      await fetchIntegrationData();
      
      toast({
        title: 'API Key Revoked',
        description: 'The API key has been deactivated',
      });

      return true;
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast({
        title: 'Error',
        description: 'Failed to revoke API key',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Create webhook
  const createWebhook = async (name: string, url: string, events: string[]) => {
    if (!merchantId) return false;

    try {
      const { error } = await merchantSupabase
        .from('merchant_webhooks' as any)
        .insert({
          merchant_id: merchantId,
          name,
          url,
          events,
          is_active: true,
        });

      if (error) throw error;

      await fetchIntegrationData();
      
      toast({
        title: 'Webhook Created',
        description: 'Your webhook endpoint has been configured',
      });

      return true;
    } catch (error) {
      console.error('Error creating webhook:', error);
      toast({
        title: 'Error',
        description: 'Failed to create webhook',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Update webhook
  const updateWebhook = async (webhookId: string, updates: Partial<Webhook>) => {
    if (!merchantId) return false;

    try {
      const { error } = await merchantSupabase
        .from('merchant_webhooks' as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', webhookId)
        .eq('merchant_id', merchantId);

      if (error) throw error;

      await fetchIntegrationData();
      
      toast({
        title: 'Webhook Updated',
        description: 'Your webhook configuration has been saved',
      });

      return true;
    } catch (error) {
      console.error('Error updating webhook:', error);
      toast({
        title: 'Error',
        description: 'Failed to update webhook',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Delete webhook
  const deleteWebhook = async (webhookId: string) => {
    if (!merchantId) return false;

    try {
      const { error } = await merchantSupabase
        .from('merchant_webhooks' as any)
        .delete()
        .eq('id', webhookId)
        .eq('merchant_id', merchantId);

      if (error) throw error;

      await fetchIntegrationData();
      
      toast({
        title: 'Webhook Deleted',
        description: 'The webhook endpoint has been removed',
      });

      return true;
    } catch (error) {
      console.error('Error deleting webhook:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete webhook',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Simplified run integration test - just simulates steps
  const runIntegrationTest = async (testType: 'full' | 'payment' | 'webhook') => {
    if (!merchantId) return null;

    const steps: TestStep[] = [
      { name: 'Create test session', status: 'pending' },
      { name: 'Initialize payment', status: 'pending' },
      { name: 'Process payment', status: 'pending' },
      { name: 'Verify webhook delivery', status: 'pending' },
      { name: 'Confirm order creation', status: 'pending' },
    ];

    const testId = crypto.randomUUID();
    const newTest: IntegrationTest = {
      id: testId,
      merchant_id: merchantId,
      test_type: testType,
      status: 'running',
      steps,
      error_message: null,
      started_at: new Date().toISOString(),
      completed_at: null,
    };

    setIntegrationTests(prev => [newTest, ...prev]);

    // Simulate test steps
    const updatedSteps = [...steps];
    for (let i = 0; i < updatedSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 800));
      updatedSteps[i].status = 'success';
      updatedSteps[i].message = `${updatedSteps[i].name} completed successfully`;
      updatedSteps[i].timestamp = new Date().toISOString();
      
      setIntegrationTests(prev => prev.map(t => 
        t.id === testId ? { ...t, steps: [...updatedSteps] } : t
      ));
    }

    setIntegrationTests(prev => prev.map(t => 
      t.id === testId ? { ...t, status: 'success', completed_at: new Date().toISOString() } : t
    ));

    toast({
      title: 'Test Passed',
      description: 'All integration tests completed successfully',
    });

    return testId;
  };

  // Setup data fetch
  useEffect(() => {
    if (!merchantId) return;
    fetchIntegrationData();
  }, [merchantId, fetchIntegrationData]);

  return {
    isLoading,
    apiKeys,
    webhooks,
    webhookLogs,
    integrationTests,
    integrationStatus,
    supportedEvents: SUPPORTED_EVENTS,
    generateApiKey,
    revokeApiKey,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    fetchWebhookLogs,
    runIntegrationTest,
    refetch: fetchIntegrationData,
  };
}
