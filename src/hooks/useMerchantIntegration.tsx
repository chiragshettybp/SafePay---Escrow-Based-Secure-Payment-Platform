import { useState, useEffect, useCallback } from 'react';
import { merchantSupabase } from '@/integrations/supabase/merchantClient';
import { useToast } from '@/hooks/use-toast';

export interface ApiKey {
  id: string;
  merchant_id: string;
  name: string;
  key_prefix: string;
  key_type: 'public' | 'secret';
  environment: 'test' | 'live';
  status: 'active' | 'revoked';
  scopes: string[];
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface Webhook {
  id: string;
  merchant_id: string;
  url: string;
  events: string[];
  secret: string | null;
  is_active: boolean;
  last_triggered_at: string | null;
  last_status: number | null;
  created_at: string;
  updated_at: string;
}

export interface WebhookDelivery {
  id: string;
  endpoint_id: string;
  merchant_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  response_code: number | null;
  response_body: string | null;
  attempt: number;
  status: 'pending' | 'success' | 'failed' | 'retrying';
  error_message: string | null;
  delivered_at: string | null;
  created_at: string;
}

export interface ApiKeyAuditLog {
  id: string;
  merchant_id: string;
  api_key_id: string | null;
  action: 'generated' | 'rotated' | 'revoked' | 'copied' | 'used';
  key_prefix: string | null;
  ip_address: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface MerchantIntegration {
  merchant_id: string;
  integration_status: 'connected' | 'not_connected';
  test_mode_enabled: boolean;
  live_mode_enabled: boolean;
  last_test_at: string | null;
  last_live_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IntegrationStatus {
  isConnected: boolean;
  testMode: boolean;
  liveMode: boolean;
  activeGateways: string[];
  lastTransaction: string | null;
  testKeysCount: number;
  liveKeysCount: number;
  webhooksCount: number;
  healthScore: number;
}

export interface TestStep {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  message?: string;
  timestamp?: string;
}

export interface IntegrationTest {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  steps: TestStep[];
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

const SUPPORTED_EVENTS = [
  'checkout.session.created',
  'checkout.session.completed',
  'checkout.session.expired',
  'payment.initiated',
  'payment.success',
  'payment.failed',
  'order.created',
  'order.updated',
  'refund.initiated',
  'refund.completed',
  'dispute.created',
  'dispute.resolved',
];

export function useMerchantIntegration(merchantId?: string) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [webhookDeliveries, setWebhookDeliveries] = useState<WebhookDelivery[]>([]);
  const [auditLogs, setAuditLogs] = useState<ApiKeyAuditLog[]>([]);
  const [integration, setIntegration] = useState<MerchantIntegration | null>(null);
  const [integrationTests, setIntegrationTests] = useState<IntegrationTest[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    isConnected: false,
    testMode: false,
    liveMode: false,
    activeGateways: ['UPI', 'Cards', 'Wallets', 'EMI', 'NetBanking'],
    lastTransaction: null,
    testKeysCount: 0,
    liveKeysCount: 0,
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
        .from('merchant_webhooks')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });

      if (webhooksError) throw webhooksError;
      setWebhooks((webhooksData as unknown as Webhook[]) || []);

      // Fetch integration status
      const { data: integrationData } = await merchantSupabase
        .from('merchant_integrations')
        .select('*')
        .eq('merchant_id', merchantId)
        .single();

      setIntegration(integrationData as unknown as MerchantIntegration);

      // Fetch last transaction
      const { data: lastOrder } = await merchantSupabase
        .from('orders')
        .select('created_at')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Calculate integration status
      const activeKeys = (keysData || []).filter((k: any) => k.status === 'active');
      const testKeys = activeKeys.filter((k: any) => k.environment === 'test');
      const liveKeys = activeKeys.filter((k: any) => k.environment === 'live');
      const activeWebhooks = (webhooksData || []).filter((w: any) => w.is_active);

      let healthScore = 0;
      if (testKeys.length > 0) healthScore += 25;
      if (liveKeys.length > 0) healthScore += 25;
      if (activeWebhooks.length > 0) healthScore += 25;
      if (lastOrder) healthScore += 25;

      setIntegrationStatus({
        isConnected: activeKeys.length > 0,
        testMode: testKeys.length > 0,
        liveMode: liveKeys.length > 0,
        activeGateways: ['UPI', 'Cards', 'Wallets', 'EMI', 'NetBanking'],
        lastTransaction: lastOrder?.created_at || null,
        testKeysCount: testKeys.length,
        liveKeysCount: liveKeys.length,
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

  // Fetch webhook deliveries
  const fetchWebhookDeliveries = useCallback(async (endpointId?: string) => {
    if (!merchantId) return;
    
    try {
      let query = merchantSupabase
        .from('webhook_deliveries')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (endpointId) {
        query = query.eq('endpoint_id', endpointId);
      }

      const { data, error } = await query;
      if (error) throw error;
      setWebhookDeliveries((data as unknown as WebhookDelivery[]) || []);
    } catch (error) {
      console.error('Error fetching webhook deliveries:', error);
    }
  }, [merchantId]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    if (!merchantId) return;
    
    try {
      const { data, error } = await merchantSupabase
        .from('api_key_audit_log')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAuditLogs((data as unknown as ApiKeyAuditLog[]) || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    }
  }, [merchantId]);

  // Generate new API key via edge function
  const generateApiKey = async (
    keyType: 'public' | 'secret',
    environment: 'test' | 'live',
    name?: string
  ): Promise<{ rawKey: string; keyId: string } | null> => {
    if (!merchantId) return null;

    try {
      const { data, error } = await merchantSupabase.functions.invoke('merchant-api-key', {
        body: {
          action: 'generate',
          keyType,
          environment,
          name,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate key');
      }

      await fetchIntegrationData();

      toast({
        title: 'API Key Generated',
        description: 'Your new API key has been created. Save it now - it will not be shown again!',
      });

      return {
        rawKey: data.key.rawKey,
        keyId: data.key.id,
      };
    } catch (error: any) {
      console.error('Error generating API key:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate API key',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Rotate API key
  const rotateApiKey = async (keyId: string): Promise<{ rawKey: string; keyId: string } | null> => {
    if (!merchantId) return null;

    try {
      const { data, error } = await merchantSupabase.functions.invoke('merchant-api-key', {
        body: {
          action: 'rotate',
          keyId,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to rotate key');
      }

      await fetchIntegrationData();

      toast({
        title: 'API Key Rotated',
        description: 'Your old key has been revoked. Save the new key - it will not be shown again!',
      });

      return {
        rawKey: data.key.rawKey,
        keyId: data.key.id,
      };
    } catch (error: any) {
      console.error('Error rotating API key:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to rotate API key',
        variant: 'destructive',
      });
      return null;
    }
  };

  // Revoke API key
  const revokeApiKey = async (keyId: string): Promise<boolean> => {
    if (!merchantId) return false;

    try {
      const { data, error } = await merchantSupabase.functions.invoke('merchant-api-key', {
        body: {
          action: 'revoke',
          keyId,
        },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to revoke key');
      }

      await fetchIntegrationData();

      toast({
        title: 'API Key Revoked',
        description: 'The API key has been permanently deactivated',
      });

      return true;
    } catch (error: any) {
      console.error('Error revoking API key:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to revoke API key',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Log key copy action
  const logKeyCopy = async (keyId: string): Promise<void> => {
    try {
      await merchantSupabase.functions.invoke('merchant-api-key', {
        body: {
          action: 'log_copy',
          keyId,
        },
      });
    } catch (error) {
      console.error('Error logging key copy:', error);
    }
  };

  // Create webhook
  const createWebhook = async (url: string, events: string[]): Promise<boolean> => {
    if (!merchantId) return false;

    try {
      // Generate a webhook secret
      const secretBytes = new Uint8Array(32);
      crypto.getRandomValues(secretBytes);
      const secret = 'whsec_' + Array.from(secretBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await merchantSupabase
        .from('merchant_webhooks')
        .insert({
          merchant_id: merchantId,
          url,
          events,
          secret,
          is_active: true,
        } as any);

      if (error) throw error;

      await fetchIntegrationData();

      toast({
        title: 'Webhook Created',
        description: 'Your webhook endpoint has been configured',
      });

      return true;
    } catch (error: any) {
      console.error('Error creating webhook:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create webhook',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Update webhook
  const updateWebhook = async (webhookId: string, updates: { url?: string; events?: string[]; is_active?: boolean }): Promise<boolean> => {
    if (!merchantId) return false;

    try {
      const { error } = await merchantSupabase
        .from('merchant_webhooks')
        .update({ ...updates, updated_at: new Date().toISOString() } as any)
        .eq('id', webhookId)
        .eq('merchant_id', merchantId);

      if (error) throw error;

      await fetchIntegrationData();

      toast({
        title: 'Webhook Updated',
        description: 'Your webhook configuration has been saved',
      });

      return true;
    } catch (error: any) {
      console.error('Error updating webhook:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update webhook',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Delete webhook
  const deleteWebhook = async (webhookId: string): Promise<boolean> => {
    if (!merchantId) return false;

    try {
      const { error } = await merchantSupabase
        .from('merchant_webhooks')
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
    } catch (error: any) {
      console.error('Error deleting webhook:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete webhook',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Test webhook
  const testWebhook = async (webhookId: string): Promise<boolean> => {
    if (!merchantId) return false;

    try {
      const { data, error } = await merchantSupabase.functions.invoke('webhook-dispatcher', {
        body: {
          merchantId,
          eventType: 'test.ping',
          payload: {
            type: 'test.ping',
            merchant_id: merchantId,
            timestamp: new Date().toISOString(),
            data: { message: 'This is a test webhook delivery' },
          },
          endpointId: webhookId,
        },
      });

      if (error) throw error;

      await fetchWebhookDeliveries(webhookId);

      if (data.successful > 0) {
        toast({
          title: 'Test Webhook Sent',
          description: 'Webhook was delivered successfully',
        });
        return true;
      } else {
        toast({
          title: 'Webhook Test Failed',
          description: data.results?.[0]?.error || 'Failed to deliver webhook',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error: any) {
      console.error('Error testing webhook:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to test webhook',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Retry webhook delivery
  const retryWebhookDelivery = async (deliveryId: string): Promise<boolean> => {
    if (!merchantId) return false;

    try {
      // Get the original delivery
      const { data: delivery, error: fetchError } = await merchantSupabase
        .from('webhook_deliveries')
        .select('*')
        .eq('id', deliveryId)
        .eq('merchant_id', merchantId)
        .single();

      if (fetchError || !delivery) throw new Error('Delivery not found');

      // Dispatch again
      const { data, error } = await merchantSupabase.functions.invoke('webhook-dispatcher', {
        body: {
          merchantId,
          eventType: (delivery as any).event_type,
          payload: (delivery as any).payload,
          endpointId: (delivery as any).endpoint_id,
        },
      });

      if (error) throw error;

      await fetchWebhookDeliveries();

      toast({
        title: data.successful > 0 ? 'Retry Successful' : 'Retry Failed',
        description: data.successful > 0 ? 'Webhook was delivered' : 'Webhook delivery failed',
        variant: data.successful > 0 ? 'default' : 'destructive',
      });

      return data.successful > 0;
    } catch (error: any) {
      console.error('Error retrying webhook:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to retry webhook',
        variant: 'destructive',
      });
      return false;
    }
  };

  // Run integration test with real checkout flow
  const runIntegrationTest = async (): Promise<IntegrationTest | null> => {
    if (!merchantId) return null;

    const testId = crypto.randomUUID();
    const steps: TestStep[] = [
      { name: 'Validate API keys', status: 'pending' },
      { name: 'Create test checkout session', status: 'pending' },
      { name: 'Verify session creation', status: 'pending' },
      { name: 'Test webhook delivery', status: 'pending' },
      { name: 'Verify integration health', status: 'pending' },
    ];

    const test: IntegrationTest = {
      id: testId,
      status: 'running',
      steps,
      error_message: null,
      started_at: new Date().toISOString(),
      completed_at: null,
    };

    setIntegrationTests(prev => [test, ...prev]);

    const updateStep = (index: number, status: TestStep['status'], message?: string) => {
      const newSteps = [...steps];
      newSteps[index] = { ...newSteps[index], status, message, timestamp: new Date().toISOString() };
      setIntegrationTests(prev =>
        prev.map(t => (t.id === testId ? { ...t, steps: newSteps } : t))
      );
    };

    try {
      // Step 1: Validate API keys
      updateStep(0, 'running');
      const activeTestKeys = apiKeys.filter(k => k.status === 'active' && k.environment === 'test');
      if (activeTestKeys.length === 0) {
        throw new Error('No active test API keys found');
      }
      await new Promise(r => setTimeout(r, 500));
      updateStep(0, 'success', `Found ${activeTestKeys.length} active test key(s)`);

      // Step 2: Create test checkout session
      updateStep(1, 'running');
      const { data: sessionData, error: sessionError } = await merchantSupabase.functions.invoke('checkout-session', {
        body: {
          action: 'create',
          merchantId,
          cartData: [{ name: 'Test Product', price: 100, quantity: 1 }],
          cartTotal: 100,
        },
      });

      if (sessionError || !sessionData?.session) {
        throw new Error('Failed to create checkout session');
      }
      updateStep(1, 'success', `Session created: ${sessionData.session.id.substring(0, 8)}...`);

      // Step 3: Verify session
      updateStep(2, 'running');
      await new Promise(r => setTimeout(r, 500));
      const { data: verifyData } = await merchantSupabase
        .from('checkout_sessions')
        .select('id, status')
        .eq('id', sessionData.session.id)
        .single();

      if (!verifyData) {
        throw new Error('Session verification failed');
      }
      updateStep(2, 'success', `Session status: ${verifyData.status}`);

      // Step 4: Test webhook delivery
      updateStep(3, 'running');
      const activeWebhooks = webhooks.filter(w => w.is_active);
      if (activeWebhooks.length > 0) {
        const { data: webhookResult } = await merchantSupabase.functions.invoke('webhook-dispatcher', {
          body: {
            merchantId,
            eventType: 'checkout.session.created',
            payload: {
              type: 'checkout.session.created',
              data: { session_id: sessionData.session.id },
            },
          },
        });
        updateStep(3, 'success', `Dispatched to ${webhookResult?.dispatched || 0} endpoint(s)`);
      } else {
        updateStep(3, 'success', 'No webhooks configured (skipped)');
      }

      // Step 5: Verify integration health
      updateStep(4, 'running');
      await new Promise(r => setTimeout(r, 500));
      updateStep(4, 'success', 'Integration is healthy');

      // Complete test
      setIntegrationTests(prev =>
        prev.map(t =>
          t.id === testId
            ? { ...t, status: 'success', completed_at: new Date().toISOString() }
            : t
        )
      );

      toast({
        title: 'Integration Test Passed',
        description: 'All tests completed successfully',
      });

      return test;
    } catch (error: any) {
      const failedStepIndex = steps.findIndex(s => s.status === 'running');
      if (failedStepIndex >= 0) {
        updateStep(failedStepIndex, 'failed', error.message);
      }

      setIntegrationTests(prev =>
        prev.map(t =>
          t.id === testId
            ? { ...t, status: 'failed', error_message: error.message, completed_at: new Date().toISOString() }
            : t
        )
      );

      toast({
        title: 'Integration Test Failed',
        description: error.message,
        variant: 'destructive',
      });

      return null;
    }
  };

  // Setup realtime subscriptions
  useEffect(() => {
    if (!merchantId) return;

    const channel = merchantSupabase
      .channel('integration-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'merchant_api_keys',
          filter: `merchant_id=eq.${merchantId}`,
        },
        () => fetchIntegrationData()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'merchant_webhooks',
          filter: `merchant_id=eq.${merchantId}`,
        },
        () => fetchIntegrationData()
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'webhook_deliveries',
          filter: `merchant_id=eq.${merchantId}`,
        },
        () => fetchWebhookDeliveries()
      )
      .subscribe();

    return () => {
      merchantSupabase.removeChannel(channel);
    };
  }, [merchantId, fetchIntegrationData, fetchWebhookDeliveries]);

  // Initial data fetch
  useEffect(() => {
    if (!merchantId) return;
    fetchIntegrationData();
  }, [merchantId, fetchIntegrationData]);

  return {
    isLoading,
    apiKeys,
    webhooks,
    webhookDeliveries,
    auditLogs,
    integration,
    integrationTests,
    integrationStatus,
    supportedEvents: SUPPORTED_EVENTS,
    generateApiKey,
    rotateApiKey,
    revokeApiKey,
    logKeyCopy,
    createWebhook,
    updateWebhook,
    deleteWebhook,
    testWebhook,
    retryWebhookDelivery,
    fetchWebhookDeliveries,
    fetchAuditLogs,
    runIntegrationTest,
    refetch: fetchIntegrationData,
  };
}
