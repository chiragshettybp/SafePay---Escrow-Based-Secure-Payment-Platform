import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Key, 
  Plus, 
  Copy, 
  Trash2, 
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { MerchantLayout } from '@/components/merchant/MerchantLayout';
import { Seo } from '@/components/seo/Seo';
import { useMerchantAuth } from '@/hooks/useMerchantAuth';
import { useMerchantIntegration, ApiKey } from '@/hooks/useMerchantIntegration';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function MerchantCheckoutIntegrationApiKeys() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { merchant } = useMerchantAuth();
  const { apiKeys, isLoading, generateApiKey, revokeApiKey, logKeyCopy } = useMerchantIntegration(merchant?.id);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<'public' | 'secret'>('secret');
  const [newKeyEnv, setNewKeyEnv] = useState<'test' | 'live'>('test');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the API key',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    const result = await generateApiKey(newKeyType, newKeyEnv, newKeyName.trim());
    setIsGenerating(false);

    if (result) {
      setGeneratedKey(result.rawKey);
      setNewKeyName('');
    }
  };

  const handleCopyKey = async (key: string, keyId?: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: 'Copied',
      description: 'API key copied to clipboard',
    });
    
    // Log the copy action if keyId is provided
    if (keyId) {
      await logKeyCopy(keyId);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    await revokeApiKey(keyId);
    setShowRevokeDialog(null);
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
      <Seo title="API Keys" />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/merchant/checkout/integration')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">API Keys</h1>
              <p className="text-muted-foreground">
                Manage your checkout authentication credentials
              </p>
            </div>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Generate Key
          </Button>
        </div>

        {/* Security Notice */}
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">Security Notice</p>
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Secret keys are only shown once when generated. Store them securely. 
                  Never expose secret keys in client-side code.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Active Keys
            </CardTitle>
            <CardDescription>
              Keys used to authenticate checkout API requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apiKeys.length > 0 ? (
              <div className="space-y-4">
                {apiKeys.map((key) => (
                  <KeyCard
                    key={key.id}
                    apiKey={key}
                    onCopy={() => handleCopyKey(key.key_prefix + '...', key.id)}
                    onRevoke={() => setShowRevokeDialog(key.id)}
                    copied={copiedKey === key.key_prefix + '...'}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Key className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground mb-4">No API keys generated yet</p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Generate Your First Key
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Key Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate API Key</DialogTitle>
              <DialogDescription>
                Create a new API key for checkout authentication
              </DialogDescription>
            </DialogHeader>

            {generatedKey ? (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800 dark:text-green-300">Key Generated!</span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-400 mb-3">
                    Copy this key now. You won't be able to see it again.
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      value={generatedKey} 
                      readOnly 
                      className="font-mono text-sm bg-white dark:bg-background"
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => handleCopyKey(generatedKey)}
                    >
                      {copiedKey === generatedKey ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={() => {
                    setGeneratedKey(null);
                    setShowCreateDialog(false);
                  }}>
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., Production Server"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keyType">Key Type</Label>
                    <Select value={newKeyType} onValueChange={(v) => setNewKeyType(v as 'public' | 'secret')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Public Key (pk_)
                          </div>
                        </SelectItem>
                        <SelectItem value="secret">
                          <div className="flex items-center gap-2">
                            <EyeOff className="h-4 w-4" />
                            Secret Key (sk_)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {newKeyType === 'public' 
                        ? 'Safe for frontend code. Limited permissions.'
                        : 'Server-side only. Full API access.'}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keyEnv">Environment</Label>
                    <Select value={newKeyEnv} onValueChange={(v) => setNewKeyEnv(v as 'test' | 'live')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Test Mode</SelectItem>
                        <SelectItem value="live">Live Mode</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleGenerateKey} disabled={isGenerating}>
                    {isGenerating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Generate Key
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Revoke Confirmation Dialog */}
        <AlertDialog open={!!showRevokeDialog} onOpenChange={() => setShowRevokeDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Any applications using this key will immediately 
                lose access to the checkout API.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => showRevokeDialog && handleRevokeKey(showRevokeDialog)}
              >
                Revoke Key
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MerchantLayout>
  );
}

function KeyCard({
  apiKey,
  onCopy,
  onRevoke,
  copied,
}: {
  apiKey: ApiKey;
  onCopy: () => void;
  onRevoke: () => void;
  copied: boolean;
}) {
  const isActive = apiKey.status === 'active';
  
  return (
    <div className={`p-4 rounded-lg border ${isActive ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{apiKey.name}</span>
            <Badge variant={apiKey.key_type === 'public' ? 'secondary' : 'default'}>
              {apiKey.key_type === 'public' ? 'Public' : 'Secret'}
            </Badge>
            <Badge variant={apiKey.environment === 'live' ? 'default' : 'outline'}>
              {apiKey.environment}
            </Badge>
            {!isActive && (
              <Badge variant="destructive">Revoked</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <code className="px-2 py-0.5 bg-muted rounded">{apiKey.key_prefix}...</code>
            <span>•</span>
            <span>Created {format(new Date(apiKey.created_at), 'MMM d, yyyy')}</span>
            {apiKey.last_used_at && (
              <>
                <span>•</span>
                <span>Last used {format(new Date(apiKey.last_used_at), 'MMM d')}</span>
              </>
            )}
          </div>
        </div>

        {isActive && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onCopy}>
              {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={onRevoke}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}