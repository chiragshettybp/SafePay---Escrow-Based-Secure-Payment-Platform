import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  Copy, 
  ExternalLink, 
  Ban, 
  CheckCircle,
  Loader2,
  IndianRupee,
  Calendar,
  Link as LinkIcon,
  Clock
} from "lucide-react";
import { usePaymentLinks, PaymentLink } from "@/hooks/usePaymentLinks";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Seo } from "@/components/seo/Seo";

interface CheckoutSession {
  id: string;
  status: string;
  final_amount: number;
  created_at: string;
  completed_at: string | null;
  phone_number: string | null;
  email: string | null;
}

export default function MerchantPaymentLinkDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { merchant } = useMerchantAuth();
  const { getLink, disableLink, enableLink, getPublicUrl } = usePaymentLinks();
  
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [sessions, setSessions] = useState<CheckoutSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLinkDetails();
    }
  }, [id]);

  const fetchLinkDetails = async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      
      // Fetch payment link
      const linkData = await getLink(id);
      if (!linkData) {
        toast({
          title: "Error",
          description: "Payment link not found",
          variant: "destructive",
        });
        navigate("/merchant/checkout/payment-links");
        return;
      }
      setLink(linkData);

      // Fetch associated checkout sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from("checkout_sessions")
        .select("id, status, final_amount, created_at, completed_at, phone_number, email")
        .eq("payment_link_id", id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (sessionError) throw sessionError;
      
      setSessions((sessionData || []) as CheckoutSession[]);
    } catch (error) {
      console.error("Error fetching link details:", error);
      toast({
        title: "Error",
        description: "Failed to load payment link details",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!link || !merchant?.slug) return;
    
    const url = getPublicUrl(link, merchant.slug);
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Payment link copied to clipboard",
    });
  };

  const handleToggleStatus = async () => {
    if (!link) return;

    setIsUpdating(true);
    try {
      const success = link.status === 'active' 
        ? await disableLink(link.id)
        : await enableLink(link.id);
      
      if (success) {
        await fetchLinkDetails();
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      case 'disabled':
        return <Badge variant="destructive">Disabled</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MerchantLayout>
    );
  }

  if (!link) {
    return null;
  }

  const publicUrl = merchant?.slug ? getPublicUrl(link, merchant.slug) : "";

  return (
    <MerchantLayout>
      <Seo 
        title={`${link.title} - Payment Link Details`}
        description="View payment link details and payment history"
      />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/merchant/checkout/payment-links")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{link.title}</h1>
              {getStatusBadge(link.status)}
            </div>
            <p className="text-muted-foreground">{link.link_code}</p>
          </div>
        </div>

        {/* Main Info */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Link Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Link Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Public URL */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Payment Link URL</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    value={publicUrl} 
                    readOnly 
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Amount</Label>
                  <div className="flex items-center gap-1">
                    <IndianRupee className="h-4 w-4" />
                    <span className="text-xl font-bold">{link.amount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Currency</Label>
                  <p className="font-medium">{link.currency}</p>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Created</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{format(new Date(link.created_at), "MMM d, yyyy h:mm a")}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Expires</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {link.expires_at 
                        ? format(new Date(link.expires_at), "MMM d, yyyy h:mm a")
                        : "Never"
                      }
                    </span>
                  </div>
                </div>
              </div>

              {link.description && (
                <div className="space-y-1">
                  <Label className="text-sm text-muted-foreground">Description</Label>
                  <p className="text-sm">{link.description}</p>
                </div>
              )}

              {/* Redirect URLs */}
              {(link.success_redirect_url || link.cancel_redirect_url) && (
                <div className="space-y-3 pt-4 border-t">
                  <Label className="text-sm font-medium">Redirect URLs</Label>
                  {link.success_redirect_url && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Success</Label>
                      <p className="text-sm font-mono truncate">{link.success_redirect_url}</p>
                    </div>
                  )}
                  {link.cancel_redirect_url && (
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Cancel</Label>
                      <p className="text-sm font-mono truncate">{link.cancel_redirect_url}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats & Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Payments</span>
                  <span className="text-xl font-bold">{link.total_payments}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Collected</span>
                  <span className="text-xl font-bold">₹{link.total_collected.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant={link.status === 'active' ? "destructive" : "default"}
                      className="w-full justify-start"
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : link.status === 'active' ? (
                        <Ban className="h-4 w-4 mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      {link.status === 'active' ? "Disable Link" : "Enable Link"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {link.status === 'active' ? "Disable Payment Link?" : "Enable Payment Link?"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {link.status === 'active' 
                          ? "Customers will no longer be able to make payments using this link."
                          : "Customers will be able to make payments using this link again."
                        }
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleToggleStatus}>
                        {link.status === 'active' ? "Disable" : "Enable"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>
              All checkout sessions created from this payment link
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No payments yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Completed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((session) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-mono text-xs">
                          {session.id.slice(0, 8)}...
                        </TableCell>
                        <TableCell>
                          {session.phone_number || session.email || "-"}
                        </TableCell>
                        <TableCell>₹{session.final_amount.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(session.status)}</TableCell>
                        <TableCell>
                          {format(new Date(session.created_at), "MMM d, h:mm a")}
                        </TableCell>
                        <TableCell>
                          {session.completed_at 
                            ? format(new Date(session.completed_at), "MMM d, h:mm a")
                            : "-"
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  );
}
