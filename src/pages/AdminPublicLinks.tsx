import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Globe,
  Eye,
  TrendingUp,
  ShoppingCart,
  CreditCard,
  AlertTriangle,
  Shield,
  MoreHorizontal,
  Ban,
  Store,
  Link2,
  Activity,
  BarChart3,
} from "lucide-react";
import { useAdminPublicTraffic } from "@/hooks/useAdminPaymentLinks";
import { format } from "date-fns";

export default function AdminPublicLinks() {
  const navigate = useNavigate();
  const { trafficData, suspiciousActivity, trafficByMerchant, isLoading } = useAdminPublicTraffic();

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">High</Badge>;
      case "medium":
        return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Medium</Badge>;
      case "low":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <AdminPageHeader
          title="Public Checkout Traffic"
          subtitle="Monitor traffic from public checkout URLs and detect suspicious activity"
        />

        {/* Traffic Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Eye className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Visits</p>
                  <p className="text-xl font-bold">
                    {isLoading ? <Skeleton className="h-6 w-12" /> : trafficData.total_visits.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <ShoppingCart className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sessions</p>
                  <p className="text-xl font-bold">
                    {isLoading ? <Skeleton className="h-6 w-12" /> : trafficData.sessions_created.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CreditCard className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Payments</p>
                  <p className="text-xl font-bold">
                    {isLoading ? <Skeleton className="h-6 w-12" /> : trafficData.payments_completed.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <TrendingUp className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Conversion</p>
                  <p className="text-xl font-bold">
                    {isLoading ? <Skeleton className="h-6 w-12" /> : `${trafficData.conversion_rate.toFixed(1)}%`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <Shield className="h-4 w-4 text-red-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Blocked</p>
                  <p className="text-xl font-bold">
                    {isLoading ? <Skeleton className="h-6 w-12" /> : trafficData.blocked_sessions.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Traffic by Merchant */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Store className="h-4 w-4" />
                Traffic by Merchant
              </CardTitle>
              <CardDescription>Top merchants by checkout session volume</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-6 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : trafficByMerchant.length === 0 ? (
                <div className="p-8 text-center">
                  <BarChart3 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">No traffic data available</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border">
                        <TableHead>Merchant</TableHead>
                        <TableHead className="text-right">Sessions</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trafficByMerchant.slice(0, 10).map((merchant) => (
                        <TableRow key={merchant.merchant_id} className="border-border">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{merchant.business_name}</span>
                              <span className="text-xs text-muted-foreground">/{merchant.slug}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold">{merchant.session_count.toLocaleString()}</span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/admin/merchants/${merchant.merchant_id}`)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Traffic Insights
              </CardTitle>
              <CardDescription>Key metrics and patterns</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Active Merchants</span>
                <span className="font-bold">{trafficByMerchant.length}</span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Avg Sessions/Merchant</span>
                <span className="font-bold">
                  {trafficByMerchant.length > 0
                    ? Math.round(trafficData.sessions_created / trafficByMerchant.length)
                    : 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-border">
                <span className="text-muted-foreground">Block Rate</span>
                <span className="font-bold text-red-400">
                  {trafficData.sessions_created > 0
                    ? `${((trafficData.blocked_sessions / trafficData.sessions_created) * 100).toFixed(1)}%`
                    : "0%"}
                </span>
              </div>
              <div className="flex justify-between items-center py-3">
                <span className="text-muted-foreground">Success Rate</span>
                <span className="font-bold text-emerald-400">
                  {trafficData.sessions_created > 0
                    ? `${((trafficData.payments_completed / trafficData.sessions_created) * 100).toFixed(1)}%`
                    : "0%"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Suspicious Activity */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Suspicious Activity
            </CardTitle>
            <CardDescription>Risk flags and potential threats detected</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : suspiciousActivity.length === 0 ? (
              <div className="p-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-emerald-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Suspicious Activity</h3>
                <p className="text-muted-foreground">No risk flags have been triggered recently</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Flag Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suspiciousActivity.slice(0, 20).map((flag) => (
                      <TableRow key={flag.id} className="border-border">
                        <TableCell>
                          <span className="font-medium capitalize">{flag.flag_type?.replace(/_/g, " ")}</span>
                        </TableCell>
                        <TableCell>{getSeverityBadge(flag.severity)}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{flag.session_id?.slice(0, 8)}...</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {flag.description || "No description"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(flag.created_at), "MMM d, h:mm a")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/checkout/sessions/${flag.session_id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Session
                              </DropdownMenuItem>
                              {flag.checkout_sessions?.payment_link_id && (
                                <DropdownMenuItem onClick={() => navigate(`/admin/checkout/payment-links/${flag.checkout_sessions.payment_link_id}`)}>
                                  <Link2 className="h-4 w-4 mr-2" />
                                  View Payment Link
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-400">
                                <Ban className="h-4 w-4 mr-2" />
                                Block Source
                              </DropdownMenuItem>
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
    </AdminLayout>
  );
}
