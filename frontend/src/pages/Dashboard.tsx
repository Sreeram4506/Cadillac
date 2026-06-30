import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { KpiCard } from "@/components/cards/KpiCard";
import { ChartCard } from "@/components/charts/ChartCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, Legend 
} from "recharts";
import { TrendingUp, Users, Car, AlertCircle, Clock, Star, Activity } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { DashboardData } from "@/types";
import { apiUrl } from "@/lib/api";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export default function Dashboard() {
  const { data: dashboard, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/dashboard"));
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 p-6"
    >
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your dealership performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          title="Today's Visitors"
          value={dashboard.kpis.todayVisitors.value}
          delta={dashboard.kpis.todayVisitors.delta}
          trend={dashboard.kpis.todayVisitors.trend}
        />
        <KpiCard
          title="Today's Sales"
          value={dashboard.kpis.todaySales.value}
          delta={dashboard.kpis.todaySales.delta}
          trend={dashboard.kpis.todaySales.trend}
        />
        <KpiCard
          title="Conversion Rate"
          value={dashboard.kpis.conversionRate.value}
          delta={dashboard.kpis.conversionRate.delta}
          trend={dashboard.kpis.conversionRate.trend}
          format="percentage"
        />
        <KpiCard
          title="Lost Customers"
          value={dashboard.kpis.lostCustomers.value}
          delta={dashboard.kpis.lostCustomers.delta}
          trend={dashboard.kpis.lostCustomers.trend}
        />
        <KpiCard
          title="Pending Follow-ups"
          value={dashboard.kpis.pendingFollowups.value}
          delta={dashboard.kpis.pendingFollowups.delta}
          trend={dashboard.kpis.pendingFollowups.trend}
        />
        <KpiCard
          title="Avg Customer Rating"
          value={dashboard.kpis.avgRating.value}
          delta={dashboard.kpis.avgRating.delta}
          trend={dashboard.kpis.avgRating.trend}
          format="number"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Conversion Trend">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dashboard.kpis.conversionRate.trend.map((val, i) => ({ day: `Day ${i + 1}`, rate: val }))}>
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Customer Flow">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dashboard.kpis.todayVisitors.trend.map((val, i) => ({ day: `Day ${i + 1}`, visitors: val }))}>
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Area 
                type="monotone" 
                dataKey="visitors" 
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Sales Funnel & Top Salesperson */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Sales Funnel" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dashboard.salesFunnel} layout="vertical">
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
              <YAxis dataKey="stage" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
              <Tooltip 
                contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground">
                {dashboard.topSalesperson.avatar}
              </div>
              <div>
                <h3 className="font-semibold">{dashboard.topSalesperson.name}</h3>
                <p className="text-sm text-muted-foreground">AI Score: {dashboard.topSalesperson.aiScore}</p>
                <p className="text-sm text-muted-foreground">Rating: {dashboard.topSalesperson.rating} ⭐</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Demand & Activity Feed */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Vehicle Demand Ranking">
          <div className="space-y-3">
            {dashboard.vehicleDemand.slice(0, 5).map((item, index) => (
              <div key={item.vehicle} className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{item.vehicle}</span>
                    <span className="text-sm text-muted-foreground">{item.count} interested</span>
                  </div>
                  <div className="mt-1 h-2 w-full rounded-full bg-muted">
                    <div 
                      className="h-2 rounded-full bg-primary" 
                      style={{ width: `${(item.count / dashboard.vehicleDemand[0].count) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {dashboard.activityFeed.slice(0, 8).map((activity) => (
                <div key={activity.id} className="flex gap-3 text-sm">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    {activity.type === 'check-in' && <Users className="h-4 w-4" />}
                    {activity.type === 'conversion' && <TrendingUp className="h-4 w-4" />}
                    {activity.type === 'test-drive' && <Car className="h-4 w-4" />}
                    {activity.type === 'follow-up' && <Clock className="h-4 w-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.customer} • {activity.vehicle}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(activity.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {dashboard.aiInsights.slice(0, 4).map((insight) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex items-start gap-2">
                  <div className={`mt-0.5 h-2 w-2 rounded-full ${
                    insight.type === 'opportunity' ? 'bg-green-500' :
                    insight.type === 'risk' ? 'bg-red-500' :
                    insight.type === 'trend' ? 'bg-blue-500' :
                    'bg-primary'
                  }`} />
                  <p className="text-sm">{insight.text}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
