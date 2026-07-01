import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Crown,
  TrendingDown,
  Users,
  BadgeCheck,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  Bot,
  Send,
} from "lucide-react";
import { apiUrl } from "@/lib/api";
import {
  AIChatResponse,
  Customer,
  DashboardData,
  LostSaleAnalysis,
  OwnerAnalyticsResponse,
  Salesperson,
  Vehicle,
} from "@/types";
import { toast } from "sonner";

const metricCards = [
  { key: "totalCustomers", label: "Total Customers", icon: Users },
  { key: "convertedCustomers", label: "Converted", icon: BadgeCheck },
  { key: "lostCustomers", label: "Lost", icon: TrendingDown },
  { key: "stageFeedbackCompletion", label: "Phase Coverage %", icon: Sparkles },
] as const;

export default function OwnerAnalytics() {
  const [question, setQuestion] = useState("What should the owner focus on this week?");
  const [answer, setAnswer] = useState("");
  const [isAsking, setIsAsking] = useState(false);

  const { data, isLoading } = useQuery<OwnerAnalyticsResponse>({
    queryKey: ["owner-analytics"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/owner-analytics"));
      return response.json();
    },
  });

  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/dashboard"));
      return response.json();
    },
  });

  const { data: lostSales } = useQuery<LostSaleAnalysis>({
    queryKey: ["lost-sales"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/lost-sales"));
      return response.json();
    },
  });

  const { data: salespeople } = useQuery<Salesperson[]>({
    queryKey: ["salesperson-performance"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/salesperson-performance"));
      return response.json();
    },
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/customers"));
      return response.json();
    },
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/vehicles"));
      return response.json();
    },
  });

  const handleAskAi = async () => {
    if (!question.trim()) {
      return;
    }

    setIsAsking(true);
    try {
      const response = await fetch(apiUrl("/api/ai-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context: {
            dashboard,
            lostSales,
            salespersonPerformance: salespeople,
            customers,
            vehicles,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const data: AIChatResponse = await response.json();
      setAnswer(data.answer);
    } catch (error) {
      toast.error("Could not generate the owner AI answer.");
    } finally {
      setIsAsking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-24 rounded-3xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-28 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-3xl" />
      </div>
    );
  }

  if (!data) return null;

  const summary = data.ownerSummary?.executiveSummary || data.aiBrief.dashboardNote;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 p-6"
    >
      <div className="flex flex-col gap-4 rounded-[2rem] border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Crown className="h-4 w-4" />
            Owner analytics
          </div>
          <h1 className="text-3xl font-bold md:text-4xl">Executive overview of the dealership</h1>
          <p className="max-w-3xl text-muted-foreground">
            Deep performance insights, customer loss reasons, phase coverage, and AI-driven recommendations in one place.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Top loss reason</p>
          <p className="mt-1 text-lg font-semibold">{data.topReason}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          const value = data.metrics[metric.key];
          return (
            <Card key={metric.key} className="rounded-3xl">
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 text-3xl font-bold">{value}</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-sm font-medium leading-7">{summary}</p>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Performance</p>
                <p className="mt-2 text-sm font-medium leading-6">{data.ownerSummary?.performanceNote || data.aiBrief.performanceNote}</p>
              </div>
              <div className="rounded-2xl border border-border bg-muted/40 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Customer loss</p>
                <p className="mt-2 text-sm font-medium leading-6">{data.ownerSummary?.lossNote || data.aiBrief.lossNote}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Urgent customer</p>
              <p className="mt-2 text-sm font-medium leading-6">{data.ownerSummary?.customerNote || data.aiBrief.customerNote}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Ask owner AI
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about performance, lost sales, or priorities..."
              />
              <Button onClick={handleAskAi} disabled={isAsking}>
                <Send className="mr-2 h-4 w-4" />
                {isAsking ? "Thinking..." : "Ask AI"}
              </Button>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">AI answer</p>
              <p className="mt-2 text-sm font-medium leading-7">
                {answer || "Ask a question to get a focused owner recommendation."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Highest risk customer
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.highestRiskCustomer ? (
              <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold">{data.highestRiskCustomer.name}</p>
                    <p className="text-sm text-muted-foreground">{data.highestRiskCustomer.vehicle}</p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {data.highestRiskCustomer.salesperson}
                  </span>
                </div>
                <p className="text-sm">
                  <span className="font-medium">Reason:</span> {data.highestRiskCustomer.reason}
                </p>
                <p className="text-sm">
                  <span className="font-medium">Owner insight:</span> {data.highestRiskCustomer.ownerInsight}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No urgent customer is flagged yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Loss reasons</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.reasonBreakdown.map((item) => (
              <div key={item.reason} className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 p-4">
                <div>
                  <p className="font-semibold">{item.reason}</p>
                  <p className="text-sm text-muted-foreground">Customer loss driver</p>
                </div>
                <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700">
                  {item.count}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Top performers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.topPerformers.map((salesperson, index) => (
              <div key={salesperson.id} className="flex items-center justify-between rounded-2xl border border-border bg-muted/40 p-4">
                <div>
                  <p className="font-semibold">
                    {index + 1}. {salesperson.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Conversion {salesperson.conversionRate}% • AI score {salesperson.aiScore}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[1.75rem]">
          <CardHeader>
            <CardTitle>Customers needing attention</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Vehicle</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Reason</th>
                    <th className="pb-3 font-medium">Next action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customerRiskList.map((customer) => (
                    <tr key={customer.id} className="border-b border-border last:border-0">
                      <td className="py-4 font-medium">{customer.name}</td>
                      <td className="py-4 text-sm text-muted-foreground">{customer.vehicle}</td>
                      <td className="py-4 text-sm">{customer.status}</td>
                      <td className="py-4 text-sm">{customer.reason}</td>
                      <td className="py-4 text-sm">{customer.nextAction}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
