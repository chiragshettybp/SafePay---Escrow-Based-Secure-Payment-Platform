import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import type { ChartData } from "@/hooks/useAdminDashboard";
import { formatCurrency } from "@/lib/utils";

interface AdminChartsProps {
  chartData: ChartData;
  dateRange: "today" | "7days" | "30days" | "custom";
  onDateRangeChange: (range: "today" | "7days" | "30days" | "custom") => void;
  isLoading: boolean;
}

export function AdminCharts({
  chartData,
  dateRange,
  onDateRangeChange,
  isLoading,
}: AdminChartsProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  };

  const formatCompactCurrency = (value: number) => {
    return formatCurrency(value, { compact: true });
  };

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <div className="flex justify-end">
        <Select value={dateRange} onValueChange={(v) => onDateRangeChange(v as typeof dateRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="7days">Last 7 Days</SelectItem>
            <SelectItem value="30days">Last 30 Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Orders & Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Orders & Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.orders}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    yAxisId="left"
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={formatCompactCurrency}
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number, name: string) => [
                      name === "revenue" ? `₹${value.toLocaleString()}` : value,
                      name === "revenue" ? "Revenue" : "Orders",
                    ]}
                    labelFormatter={formatDate}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="Orders"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="revenue"
                    name="Revenue"
                    fill="hsl(var(--primary) / 0.5)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDate}
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    allowDuplicatedCategory={false}
                  />
                  <YAxis
                    className="text-xs"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelFormatter={formatDate}
                  />
                  <Legend />
                  <Line
                    data={chartData.customers}
                    type="monotone"
                    dataKey="count"
                    name="Customers"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    data={chartData.merchants}
                    type="monotone"
                    dataKey="count"
                    name="Merchants"
                    stroke="hsl(142 76% 36%)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AdminCharts;
