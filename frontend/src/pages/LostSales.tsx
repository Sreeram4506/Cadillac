import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartCard } from "@/components/charts/ChartCard";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend
} from "recharts";
import { TrendingDown, AlertTriangle } from "lucide-react";
import { LostSaleAnalysis } from "@/types";
import { apiUrl } from "@/lib/api";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function LostSales() {
  const [filterReason, setFilterReason] = useState<string>("all");

  const { data: lostSales, isLoading } = useQuery<LostSaleAnalysis>({
    queryKey: ["lost-sales"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/lost-sales"));
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!lostSales) return null;

  const biggestDriver = lostSales.byReason[0];
  const filteredRecords = filterReason === "all" 
    ? lostSales.records 
    : lostSales.records.filter(r => r.reason === filterReason);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 p-6"
    >
      <div>
        <h1 className="text-3xl font-bold">Lost Sale Analysis</h1>
        <p className="text-muted-foreground">Understand why customers are leaving</p>
      </div>

      {/* Biggest Driver Callout */}
      <Card className="border-red-500/50 bg-red-500/5">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">Biggest Driver This Month</h3>
              <p className="text-muted-foreground">
                <strong>{biggestDriver?.reason}</strong> - {biggestDriver?.count} customers lost ({Math.round((biggestDriver?.count || 0) / lostSales.records.length * 100)}%)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Lost Sales by Reason">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={lostSales.byReason}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
                label
              >
                {lostSales.byReason.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Lost Sales Trend (30 Days)">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lostSales.trend}>
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="hsl(var(--destructive))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--destructive))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Lost Sales by Reason (Bar Chart)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={lostSales.byReason}>
            <XAxis dataKey="reason" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            />
            <Bar dataKey="count" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Filterable Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-primary" />
              Lost Sale Records
            </span>
            <select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
              className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Reasons</option>
              {lostSales.byReason.map((r) => (
                <option key={r.reason} value={r.reason}>{r.reason}</option>
              ))}
            </select>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left text-sm font-medium">Customer</th>
                  <th className="pb-3 text-left text-sm font-medium">Vehicle</th>
                  <th className="pb-3 text-left text-sm font-medium">Reason</th>
                  <th className="pb-3 text-left text-sm font-medium">Salesperson</th>
                  <th className="pb-3 text-left text-sm font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={record.id} className="border-b border-border">
                    <td className="py-3 text-sm">{record.customer}</td>
                    <td className="py-3 text-sm">{record.vehicle}</td>
                    <td className="py-3 text-sm">
                      <span className="inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-red-100 text-red-800">
                        {record.reason}
                      </span>
                    </td>
                    <td className="py-3 text-sm">{record.salesperson}</td>
                    <td className="py-3 text-sm text-muted-foreground">{new Date(record.date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
