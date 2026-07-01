import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Search, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Customer } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

export default function Summary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/customers"));
      return response.json();
    },
  });

  const filteredCustomers =
    customers?.filter((customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.preferredVehicle.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  if (selectedCustomer) {
    const ai = selectedCustomer.aiAnalysis;
    const narrative =
      ai?.intentSummary ||
      `${selectedCustomer.name} is interested in ${selectedCustomer.preferredVehicle} with a budget of ₹${selectedCustomer.budget.toLocaleString("en-IN")}.`;
    const probability =
      ai?.buyingProbability ??
      (selectedCustomer.status === "Converted"
        ? 100
        : selectedCustomer.status === "Lost"
          ? 0
          : selectedCustomer.journey.filter((j) => j.status === "done").length * 15);
    const sentiment =
      ai?.customerSentiment
        ? ai.customerSentiment.charAt(0).toUpperCase() + ai.customerSentiment.slice(1)
        : selectedCustomer.status === "Converted"
          ? "Positive"
          : selectedCustomer.status === "Lost"
            ? "Negative"
            : probability > 50
              ? "Positive"
              : "Neutral";
    const mainConcern =
      ai?.likelyObjections?.[0] ||
      (selectedCustomer.financeRequired
        ? "Finance options"
        : selectedCustomer.tradeIn
          ? "Trade-in value"
          : "Vehicle pricing");
    const nextAction =
      ai?.recommendedNextAction ||
      (selectedCustomer.status === "Converted"
        ? "Complete documentation and delivery"
        : selectedCustomer.status === "Lost"
          ? "Analyze loss reason and follow up"
          : "Schedule test drive and discuss finance options");

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-6 p-6"
      >
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setSelectedCustomer(null)}>
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Customer Summary</h1>
            <p className="text-muted-foreground">{selectedCustomer.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                AI Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm leading-relaxed">{narrative}</p>
              <div className="rounded-xl border border-border bg-muted/50 p-4">
                <p className="text-xs text-muted-foreground">Owner insight</p>
                <p className="text-sm font-medium">{ai?.ownerInsight || "No AI analysis available yet."}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Buying Probability</span>
                <span className={`text-2xl font-bold ${
                  probability > 70 ? "text-green-500" :
                  probability > 40 ? "text-yellow-500" :
                  "text-red-500"
                }`}>
                  {probability}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sentiment</span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  sentiment === "Positive" ? "bg-green-100 text-green-800" :
                  sentiment === "Negative" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {sentiment}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Main Concern</span>
                <span className="font-semibold">{mainConcern}</span>
              </div>
              {ai?.topPriorities?.length ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Top Priorities</span>
                  <span className="font-semibold">{ai.topPriorities.join(", ")}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Recommended Next Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4 rounded-xl border border-primary/50 bg-primary/5 p-4">
              <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold">{nextAction}</h4>
                <p className="text-sm text-muted-foreground">
                  Due: {ai?.urgency === "high" ? "Today" : ai?.urgency === "medium" ? "Within 48 hours" : "Within a week"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 p-6"
    >
      <div>
        <h1 className="text-3xl font-bold">Customer Summary</h1>
        <p className="text-muted-foreground">Choose a customer to see the AI summary and next step.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or vehicle..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCustomers.map((customer) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => setSelectedCustomer(customer)}
              className="cursor-pointer"
            >
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                        {customer.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <h3 className="font-semibold">{customer.name}</h3>
                        <p className="text-sm text-muted-foreground">{customer.preferredVehicle}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        customer.status === "Converted" ? "bg-green-100 text-green-800" :
                        customer.status === "Lost" ? "bg-red-100 text-red-800" :
                        "bg-blue-100 text-blue-800"
                      }`}>
                        {customer.status}
                      </span>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(customer.checkInDate)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
