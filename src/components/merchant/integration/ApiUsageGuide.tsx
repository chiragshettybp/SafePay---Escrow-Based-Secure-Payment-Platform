import { useState } from 'react';
import { 
  Server, 
  ShoppingCart, 
  ArrowRight, 
  Shield, 
  AlertTriangle,
  Copy,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Code,
  Webhook
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';

interface CodeBlockProps {
  code: string;
  language: string;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: 'Copied',
      description: 'Code copied to clipboard',
    });
  };

  return (
    <div className="relative group">
      <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
        <Badge variant="outline" className="text-xs">
          {language}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="h-8 w-8 p-0"
        >
          {copied ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm font-mono whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

interface ExpandableSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function ExpandableSection({ title, children, defaultOpen = false }: ExpandableSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-between p-4 h-auto text-left"
        >
          <span className="font-semibold">{title}</span>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ApiUsageGuide() {
  return (
    <div className="space-y-6">
      {/* Critical Clarification */}
      <Alert className="border-primary/50 bg-primary/5">
        <Shield className="h-5 w-5" />
        <AlertDescription className="ml-2">
          <p className="font-semibold text-foreground mb-1">Who Uses the API Key?</p>
          <p className="text-sm">
            API keys are used by <strong>your server or ecommerce platform</strong> — NOT by customers.
            Customers never see keys and never enter them.
          </p>
        </AlertDescription>
      </Alert>

      {/* Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            How Checkout Works
          </CardTitle>
          <CardDescription>
            The complete flow from cart to payment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Customer adds product to cart', actor: 'Customer', color: 'bg-blue-500' },
              { step: 2, title: 'Customer clicks "Checkout"', actor: 'Customer', color: 'bg-blue-500' },
              { step: 3, title: 'Your server creates checkout session using API key', actor: 'Your Server', color: 'bg-green-500' },
              { step: 4, title: 'Customer is redirected to hosted checkout', actor: 'SafePay', color: 'bg-purple-500' },
              { step: 5, title: 'Payment completes (prepaid only)', actor: 'Customer', color: 'bg-blue-500' },
              { step: 6, title: 'Webhook confirms payment to your server', actor: 'SafePay', color: 'bg-purple-500' },
            ].map((item, index) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full ${item.color} text-white flex items-center justify-center font-bold text-sm`}>
                  {item.step}
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-medium">{item.title}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {item.actor}
                  </Badge>
                </div>
                {index < 5 && (
                  <ArrowRight className="h-5 w-5 text-muted-foreground mt-1.5 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plain Language Explanation */}
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground leading-relaxed">
            When a customer clicks checkout on your website, <strong>your server</strong> talks to our system 
            using your API key to create a secure checkout session. We return a checkout URL. 
            Your customer is redirected there and completes payment.
          </p>
        </CardContent>
      </Card>

      {/* Server-Side Examples */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Server-Side Integration
          </CardTitle>
          <CardDescription>
            Copy-paste examples for your backend
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ExpandableSection title="Node.js (Express)" defaultOpen>
            <CodeBlock
              language="javascript"
              code={`const response = await fetch("https://sgpefhfmcykwtfqfwzcq.supabase.co/functions/v1/checkout-session", {
  method: "POST",
  headers: {
    "Authorization": "Bearer YOUR_SECRET_API_KEY",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    order_id: "ORD_123",
    amount: 1499,
    currency: "INR",
    customer: {
      phone: "9XXXXXXXXX"
    },
    success_url: "https://yourstore.com/success",
    cancel_url: "https://yourstore.com/cancel"
  })
});

const data = await response.json();

// Redirect customer to checkout
res.redirect(data.checkout_url);`}
            />
          </ExpandableSection>

          <ExpandableSection title="cURL">
            <CodeBlock
              language="bash"
              code={`curl https://sgpefhfmcykwtfqfwzcq.supabase.co/functions/v1/checkout-session \\
  -H "Authorization: Bearer YOUR_SECRET_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "order_id": "ORD_123",
    "amount": 1499,
    "currency": "INR",
    "customer": { "phone": "9XXXXXXXXX" },
    "success_url": "https://yourstore.com/success",
    "cancel_url": "https://yourstore.com/cancel"
  }'`}
            />
          </ExpandableSection>

          <ExpandableSection title="Python (requests)">
            <CodeBlock
              language="python"
              code={`import requests

response = requests.post(
    "https://sgpefhfmcykwtfqfwzcq.supabase.co/functions/v1/checkout-session",
    headers={
        "Authorization": "Bearer YOUR_SECRET_API_KEY",
        "Content-Type": "application/json"
    },
    json={
        "order_id": "ORD_123",
        "amount": 1499,
        "currency": "INR",
        "customer": {"phone": "9XXXXXXXXX"},
        "success_url": "https://yourstore.com/success",
        "cancel_url": "https://yourstore.com/cancel"
    }
)

data = response.json()
# Redirect customer to data["checkout_url"]`}
            />
          </ExpandableSection>

          <ExpandableSection title="PHP">
            <CodeBlock
              language="php"
              code={`<?php
$ch = curl_init();

curl_setopt_array($ch, [
    CURLOPT_URL => "https://sgpefhfmcykwtfqfwzcq.supabase.co/functions/v1/checkout-session",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer YOUR_SECRET_API_KEY",
        "Content-Type: application/json"
    ],
    CURLOPT_POSTFIELDS => json_encode([
        "order_id" => "ORD_123",
        "amount" => 1499,
        "currency" => "INR",
        "customer" => ["phone" => "9XXXXXXXXX"],
        "success_url" => "https://yourstore.com/success",
        "cancel_url" => "https://yourstore.com/cancel"
    ])
]);

$response = curl_exec($ch);
$data = json_decode($response, true);
curl_close($ch);

// Redirect: header("Location: " . $data["checkout_url"]);
?>`}
            />
          </ExpandableSection>
        </CardContent>
      </Card>

      {/* Security Rules */}
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Security Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <span>API key is used <strong>only on server</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <span>Never use secret key in frontend JavaScript</span>
          </div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <span>Never expose in HTML source code</span>
          </div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <span>Never share with customers</span>
          </div>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <span>Never commit to public Git repositories</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function WebhookGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Webhook Verification
        </CardTitle>
        <CardDescription>
          Always confirm payments via webhooks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="ml-2 text-amber-800 dark:text-amber-300">
            <strong>Important:</strong> Do not trust frontend redirects alone. 
            Always confirm payment using webhooks.
          </AlertDescription>
        </Alert>

        <div>
          <p className="font-medium mb-2">Example Webhook Payload:</p>
          <CodeBlock
            language="json"
            code={`{
  "event": "payment.success",
  "order_id": "ORD_123",
  "session_id": "cs_xxxxxxxxxxxx",
  "amount": 1499,
  "currency": "INR",
  "status": "paid",
  "payment_method": "upi",
  "timestamp": "2024-12-26T10:30:00Z"
}`}
          />
        </div>

        <div className="space-y-2 pt-2">
          <p className="font-medium">Key Points:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              Webhooks verify payment authenticity
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              Redirect URLs are only for UX/user experience
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              Webhooks are the source of truth for order fulfillment
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export function TestLiveModeGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Mode vs Live Mode</CardTitle>
        <CardDescription>
          Understanding API key environments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 font-medium">Mode</th>
                <th className="text-left p-3 font-medium">Key Prefix</th>
                <th className="text-left p-3 font-medium">Usage</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3">
                  <Badge variant="outline">Test</Badge>
                </td>
                <td className="p-3">
                  <code className="px-2 py-1 bg-muted rounded">test_sk_</code>
                </td>
                <td className="p-3 text-muted-foreground">Development & testing</td>
              </tr>
              <tr>
                <td className="p-3">
                  <Badge>Live</Badge>
                </td>
                <td className="p-3">
                  <code className="px-2 py-1 bg-muted rounded">live_sk_</code>
                </td>
                <td className="p-3 text-muted-foreground">Real payments</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Alert className="mt-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <strong>Important:</strong> Test keys NEVER work in live mode. 
            Live keys NEVER work in test mode. Mismatch will result in authentication errors.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
