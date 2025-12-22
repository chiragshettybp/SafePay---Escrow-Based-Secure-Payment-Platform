import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DashboardMetrics {
  totalCustomers: number;
  totalMerchants: number;
  activeMerchants: number;
  totalOrders: number;
  ordersToday: number;
  totalRevenue: number;
  escrowBalance: number;
  pendingWithdrawals: number;
  pendingPayoutsAmount: number;
  openDisputes: number;
  activeShipments: number;
  openSupportTickets: number;
  pendingKyc: number;
}

export interface RecentActivity {
  id: string;
  type: "order" | "customer" | "merchant" | "dispute" | "withdrawal" | "shipment" | "support";
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface Alert {
  id: string;
  type: "warning" | "error" | "info";
  title: string;
  description: string;
  link?: string;
  createdAt: string;
}

export interface ChartData {
  orders: { date: string; count: number; revenue: number }[];
  customers: { date: string; count: number }[];
  merchants: { date: string; count: number }[];
}

export function useAdminDashboard() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalCustomers: 0,
    totalMerchants: 0,
    activeMerchants: 0,
    totalOrders: 0,
    ordersToday: 0,
    totalRevenue: 0,
    escrowBalance: 0,
    pendingWithdrawals: 0,
    pendingPayoutsAmount: 0,
    openDisputes: 0,
    activeShipments: 0,
    openSupportTickets: 0,
    pendingKyc: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [chartData, setChartData] = useState<ChartData>({
    orders: [],
    customers: [],
    merchants: [],
  });
  const [dateRange, setDateRange] = useState<"today" | "7days" | "30days" | "custom">("7days");

  // Fetch all metrics
  const fetchMetrics = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      // Fetch counts in parallel
      const [
        customersResult,
        merchantsResult,
        activeMerchantsResult,
        ordersResult,
        ordersTodayResult,
        disputesResult,
        supportTicketsResult,
        pendingKycResult,
        withdrawalsResult,
        shipmentsResult,
        revenueResult,
        escrowResult,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("merchants").select("id", { count: "exact", head: true }),
        supabase.from("merchants").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", todayISO),
        supabase.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"]),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
        supabase.from("merchant_kyc").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("merchant_payouts").select("id", { count: "exact", head: true }).in("status", ["processing", "requested", "under_review"]),
        supabase.from("tracking").select("id", { count: "exact", head: true }).in("status", ["in_transit", "out_for_delivery"]),
        supabase.from("orders").select("amount").in("status", ["completed", "delivered"]),
        supabase.from("orders").select("amount").eq("status", "escrow_locked"),
        supabase.from("merchant_payouts").select("amount").in("status", ["processing", "requested", "under_review"]),
      ]);

      // Calculate revenue and payout amounts
      const totalRevenue = revenueResult.data?.reduce((sum, order) => sum + (Number(order.amount) || 0), 0) || 0;
      const escrowBalance = escrowResult.data?.reduce((sum, order) => sum + (Number(order.amount) || 0), 0) || 0;
      // pendingPayoutsAmountResult is the 13th item (index 12)
      const pendingPayoutsAmountResult = await supabase.from("merchant_payouts").select("amount").in("status", ["processing", "requested", "under_review"]);
      const pendingPayoutsAmount = pendingPayoutsAmountResult.data?.reduce((sum, payout) => sum + (Number(payout.amount) || 0), 0) || 0;

      setMetrics({
        totalCustomers: customersResult.count || 0,
        totalMerchants: merchantsResult.count || 0,
        activeMerchants: activeMerchantsResult.count || 0,
        totalOrders: ordersResult.count || 0,
        ordersToday: ordersTodayResult.count || 0,
        totalRevenue,
        escrowBalance,
        pendingWithdrawals: withdrawalsResult.count || 0,
        pendingPayoutsAmount,
        openDisputes: disputesResult.count || 0,
        activeShipments: shipmentsResult.count || 0,
        openSupportTickets: supportTicketsResult.count || 0,
        pendingKyc: pendingKycResult.count || 0,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard metrics",
        variant: "destructive",
      });
    }
  };

  // Fetch chart data
  const fetchChartData = async () => {
    try {
      const days = dateRange === "today" ? 1 : dateRange === "7days" ? 7 : 30;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const [ordersData, customersData, merchantsData] = await Promise.all([
        supabase
          .from("orders")
          .select("created_at, amount")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true }),
        supabase
          .from("profiles")
          .select("created_at")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true }),
        supabase
          .from("merchants")
          .select("created_at")
          .gte("created_at", startDate.toISOString())
          .order("created_at", { ascending: true }),
      ]);

      // Aggregate by date
      const ordersByDate: Record<string, { count: number; revenue: number }> = {};
      const customersByDate: Record<string, number> = {};
      const merchantsByDate: Record<string, number> = {};

      ordersData.data?.forEach((order) => {
        const date = new Date(order.created_at).toISOString().split("T")[0];
        if (!ordersByDate[date]) ordersByDate[date] = { count: 0, revenue: 0 };
        ordersByDate[date].count++;
        ordersByDate[date].revenue += Number(order.amount) || 0;
      });

      customersData.data?.forEach((customer) => {
        const date = new Date(customer.created_at).toISOString().split("T")[0];
        customersByDate[date] = (customersByDate[date] || 0) + 1;
      });

      merchantsData.data?.forEach((merchant) => {
        const date = new Date(merchant.created_at).toISOString().split("T")[0];
        merchantsByDate[date] = (merchantsByDate[date] || 0) + 1;
      });

      // Fill in missing dates
      const allDates: string[] = [];
      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        allDates.push(date.toISOString().split("T")[0]);
      }

      setChartData({
        orders: allDates.map((date) => ({
          date,
          count: ordersByDate[date]?.count || 0,
          revenue: ordersByDate[date]?.revenue || 0,
        })),
        customers: allDates.map((date) => ({
          date,
          count: customersByDate[date] || 0,
        })),
        merchants: allDates.map((date) => ({
          date,
          count: merchantsByDate[date] || 0,
        })),
      });
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  };

  // Fetch recent activity
  const fetchRecentActivity = async () => {
    try {
      const [orders, disputes, merchants, tickets] = await Promise.all([
        supabase
          .from("orders")
          .select("id, product_name, amount, status, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("disputes")
          .select("id, reason, status, created_at")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("merchants")
          .select("id, business_name, status, created_at")
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("support_tickets")
          .select("id, subject, status, created_at")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      const activities: RecentActivity[] = [];

      orders.data?.forEach((order) => {
        activities.push({
          id: order.id,
          type: "order",
          title: `New order: ${order.product_name}`,
          description: `₹${Number(order.amount).toLocaleString()} - ${order.status}`,
          timestamp: order.created_at,
        });
      });

      disputes.data?.forEach((dispute) => {
        activities.push({
          id: dispute.id,
          type: "dispute",
          title: `Dispute: ${dispute.reason}`,
          description: `Status: ${dispute.status}`,
          timestamp: dispute.created_at,
        });
      });

      merchants.data?.forEach((merchant) => {
        activities.push({
          id: merchant.id,
          type: "merchant",
          title: `Merchant: ${merchant.business_name}`,
          description: `Status: ${merchant.status}`,
          timestamp: merchant.created_at,
        });
      });

      tickets.data?.forEach((ticket) => {
        activities.push({
          id: ticket.id,
          type: "support",
          title: `Ticket: ${ticket.subject}`,
          description: `Status: ${ticket.status}`,
          timestamp: ticket.created_at,
        });
      });

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setRecentActivity(activities.slice(0, 10));
    } catch (error) {
      console.error("Error fetching recent activity:", error);
    }
  };

  // Generate alerts based on data
  const generateAlerts = () => {
    const newAlerts: Alert[] = [];

    if (metrics.pendingKyc > 0) {
      newAlerts.push({
        id: "pending-kyc",
        type: "warning",
        title: `${metrics.pendingKyc} Pending KYC Approvals`,
        description: "Merchants awaiting verification",
        link: "/admin/merchants?filter=pending_kyc",
        createdAt: new Date().toISOString(),
      });
    }

    if (metrics.openDisputes > 0) {
      newAlerts.push({
        id: "open-disputes",
        type: "error",
        title: `${metrics.openDisputes} Open Disputes`,
        description: "Require immediate attention",
        link: "/admin/disputes?filter=open",
        createdAt: new Date().toISOString(),
      });
    }

    if (metrics.pendingWithdrawals > 0) {
      newAlerts.push({
        id: "pending-payouts",
        type: "warning",
        title: `${metrics.pendingWithdrawals} Pending Payouts`,
        description: `₹${metrics.pendingPayoutsAmount?.toLocaleString("en-IN") || 0} awaiting approval`,
        link: "/admin/payouts?status=processing",
        createdAt: new Date().toISOString(),
      });
    }

    if (metrics.openSupportTickets > 5) {
      newAlerts.push({
        id: "high-tickets",
        type: "info",
        title: "High Support Volume",
        description: `${metrics.openSupportTickets} open tickets`,
        link: "/admin/support",
        createdAt: new Date().toISOString(),
      });
    }

    setAlerts(newAlerts);
  };

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchMetrics(), fetchChartData(), fetchRecentActivity()]);
      setIsLoading(false);
    };
    loadData();
  }, [dateRange]);

  // Generate alerts when metrics change
  useEffect(() => {
    generateAlerts();
  }, [metrics]);

  // Set up realtime subscriptions
  useEffect(() => {
    const ordersChannel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchMetrics();
          fetchRecentActivity();
        }
      )
      .subscribe();

    const disputesChannel = supabase
      .channel("admin-disputes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "disputes" },
        () => {
          fetchMetrics();
          fetchRecentActivity();
        }
      )
      .subscribe();

    const merchantsChannel = supabase
      .channel("admin-merchants")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merchants" },
        () => {
          fetchMetrics();
          fetchRecentActivity();
        }
      )
      .subscribe();

    const payoutsChannel = supabase
      .channel("admin-payouts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merchant_payouts" },
        () => {
          fetchMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(disputesChannel);
      supabase.removeChannel(merchantsChannel);
      supabase.removeChannel(payoutsChannel);
    };
  }, []);

  const refetch = async () => {
    await Promise.all([fetchMetrics(), fetchChartData(), fetchRecentActivity()]);
  };

  return {
    isLoading,
    metrics,
    recentActivity,
    alerts,
    chartData,
    dateRange,
    setDateRange,
    refetch,
  };
}

export default useAdminDashboard;
