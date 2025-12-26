import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Link as LinkIcon, Copy, ExternalLink, CheckCircle } from "lucide-react";
import { usePaymentLinks, PaymentLink } from "@/hooks/usePaymentLinks";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { useToast } from "@/hooks/use-toast";
import { Seo } from "@/components/seo/Seo";

export default function MerchantPaymentLinkCreate() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { merchant } = useMerchantAuth();
  const { createLink, getPublicUrl } = usePaymentLinks();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdLink, setCreatedLink] = useState<PaymentLink | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    amount: "",
    expires_at: "",
    success_redirect_url: "",
    cancel_redirect_url: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = "Please enter a valid amount greater than 0";
    }

    if (formData.success_redirect_url && !isValidUrl(formData.success_redirect_url)) {
      newErrors.success_redirect_url = "Please enter a valid URL";
    }

    if (formData.cancel_redirect_url && !isValidUrl(formData.cancel_redirect_url)) {
      newErrors.cancel_redirect_url = "Please enter a valid URL";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const link = await createLink({
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        amount: parseFloat(formData.amount),
        expires_at: formData.expires_at || null,
        success_redirect_url: formData.success_redirect_url || undefined,
        cancel_redirect_url: formData.cancel_redirect_url || undefined,
      });

      if (link) {
        setCreatedLink(link);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdLink || !merchant?.slug) return;
    
    const url = getPublicUrl(createdLink, merchant.slug);
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Payment link copied to clipboard",
    });
  };

  const getPublicLinkUrl = () => {
    if (!createdLink || !merchant?.slug) return "";
    return getPublicUrl(createdLink, merchant.slug);
  };

  if (createdLink) {
    return (
      <MerchantLayout>
        <Seo 
          title="Payment Link Created - Merchant Dashboard"
          description="Your payment link has been created successfully"
        />
        
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-2">Payment Link Created!</h1>
                <p className="text-muted-foreground">Share this link with your customers to accept payments</p>
              </div>

              <div className="w-full space-y-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Link Title</Label>
                  <p className="font-medium">{createdLink.title}</p>
                </div>

                <div>
                  <Label className="text-sm text-muted-foreground">Amount</Label>
                  <p className="text-2xl font-bold">₹{createdLink.amount.toLocaleString()}</p>
                </div>

                <div className="bg-muted rounded-lg p-4">
                  <Label className="text-sm text-muted-foreground mb-2 block">Payment Link</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={getPublicLinkUrl()} 
                      readOnly 
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" asChild>
                      <a href={getPublicLinkUrl()} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate("/merchant/checkout/payment-links")}
                >
                  View All Links
                </Button>
                <Button 
                  className="flex-1"
                  onClick={() => {
                    setCreatedLink(null);
                    setFormData({
                      title: "",
                      description: "",
                      amount: "",
                      expires_at: "",
                      success_redirect_url: "",
                      cancel_redirect_url: "",
                    });
                  }}
                >
                  Create Another
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <Seo 
        title="Create Payment Link - Merchant Dashboard"
        description="Create a new shareable payment link"
      />
      
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/merchant/checkout/payment-links")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Create Payment Link</h1>
            <p className="text-muted-foreground">Generate a shareable link to accept payments</p>
          </div>
        </div>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Payment Details
            </CardTitle>
            <CardDescription>
              Fill in the details for your payment link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Premium Subscription, One-time Service"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Add a description for your payment link"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (INR) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className={`pl-7 ${errors.amount ? "border-destructive" : ""}`}
                  />
                </div>
                {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires_at">Expiry Date (Optional)</Label>
                <Input
                  id="expires_at"
                  type="datetime-local"
                  value={formData.expires_at}
                  onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                  min={new Date().toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground">Leave empty for no expiry</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="success_redirect_url">Success Redirect URL (Optional)</Label>
                <Input
                  id="success_redirect_url"
                  type="url"
                  placeholder="https://yoursite.com/success"
                  value={formData.success_redirect_url}
                  onChange={(e) => setFormData({ ...formData, success_redirect_url: e.target.value })}
                  className={errors.success_redirect_url ? "border-destructive" : ""}
                />
                {errors.success_redirect_url && <p className="text-sm text-destructive">{errors.success_redirect_url}</p>}
                <p className="text-xs text-muted-foreground">Where to redirect after successful payment</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cancel_redirect_url">Cancel Redirect URL (Optional)</Label>
                <Input
                  id="cancel_redirect_url"
                  type="url"
                  placeholder="https://yoursite.com/cancel"
                  value={formData.cancel_redirect_url}
                  onChange={(e) => setFormData({ ...formData, cancel_redirect_url: e.target.value })}
                  className={errors.cancel_redirect_url ? "border-destructive" : ""}
                />
                {errors.cancel_redirect_url && <p className="text-sm text-destructive">{errors.cancel_redirect_url}</p>}
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => navigate("/merchant/checkout/payment-links")}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Payment Link"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
