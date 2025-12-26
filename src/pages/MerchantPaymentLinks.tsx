import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MerchantLayout } from "@/components/merchant/MerchantLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  Link as LinkIcon, 
  MoreHorizontal, 
  Copy, 
  Eye, 
  Ban,
  CheckCircle,
  Search,
  IndianRupee,
  TrendingUp,
  Loader2
} from "lucide-react";
import { usePaymentLinks } from "@/hooks/usePaymentLinks";
import { useMerchantAuth } from "@/hooks/useMerchantAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Seo } from "@/components/seo/Seo";

export default function MerchantPaymentLinks() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { merchant } = useMerchantAuth();
  const { links, stats, isLoading, disableLink, enableLink, getPublicUrl } = usePaymentLinks();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLinks = links.filter(link => 
    link.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.link_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyLink = (link: typeof links[0]) => {
    if (!merchant?.slug) {
      toast({
        title: "Error",
        description: "Merchant slug not found",
        variant: "destructive",
      });
      return;
    }
    
    const url = getPublicUrl(link, merchant.slug);
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied!",
      description: "Payment link copied to clipboard",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Active</Badge>;
      case 'expired':
        return <Badge variant="secondary">Expired</Badge>;
      case 'disabled':
        return <Badge variant="destructive">Disabled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <MerchantLayout>
      <Seo 
        title="Payment Links - Merchant Dashboard"
        description="Create and manage your payment links"
      />
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Payment Links</h1>
            <p className="text-muted-foreground">Create and manage shareable payment links</p>
          </div>
          <Button onClick={() => navigate("/merchant/checkout/payment-links/create")}>
            <Plus className="h-4 w-4 mr-2" />
            Create Link
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <LinkIcon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Links</p>
                  <p className="text-2xl font-bold">{stats.total_links}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold">{stats.active_links}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Payments</p>
                  <p className="text-2xl font-bold">{stats.total_payments}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Collected</p>
                  <p className="text-2xl font-bold">₹{stats.total_collected.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search & Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 justify-between">
              <CardTitle>All Payment Links</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search links..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLinks.length === 0 ? (
              <div className="text-center py-12">
                <LinkIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No payment links yet</h3>
                <p className="text-muted-foreground mb-4">Create your first payment link to start accepting payments</p>
                <Button onClick={() => navigate("/merchant/checkout/payment-links/create")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Link
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden md:table-cell">Created</TableHead>
                      <TableHead className="hidden lg:table-cell">Payments</TableHead>
                      <TableHead className="hidden lg:table-cell">Collected</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLinks.map((link) => (
                      <TableRow key={link.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{link.title}</p>
                            <p className="text-xs text-muted-foreground">{link.link_code}</p>
                          </div>
                        </TableCell>
                        <TableCell>₹{link.amount.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(link.status)}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {format(new Date(link.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">{link.total_payments}</TableCell>
                        <TableCell className="hidden lg:table-cell">₹{link.total_collected.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleCopyLink(link)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/merchant/checkout/payment-links/${link.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {link.status === 'active' ? (
                                <DropdownMenuItem 
                                  onClick={() => disableLink(link.id)}
                                  className="text-destructive"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Disable
                                </DropdownMenuItem>
                              ) : link.status === 'disabled' ? (
                                <DropdownMenuItem onClick={() => enableLink(link.id)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Enable
                                </DropdownMenuItem>
                              ) : null}
                            </DropdownMenuContent>
                          </DropdownMenu>
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
