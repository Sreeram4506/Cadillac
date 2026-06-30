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

  const generateSummary = (customer: Customer) => {
    const probability = customer.status === "Converted" ? 100 : 
                       customer.status === "Lost" ? 0 :
                       customer.journey.filter(j => j.status === "done").length * 15;
    
    const sentiment = customer.status === "Converted" ? "Positive" :
                     customer.status === "Lost" ? "Negative" :
                     probability > 50 ? "Positive" : "Neutral";
    
    const mainConcern = customer.financeRequired ? "Finance options" :
                        customer.tradeIn ? "Trade-in value" :
                        "Vehicle pricing";

    return {
      narrative: `${customer.name} is interested in ${customer.preferredVehicle} with a budget of ₹${customer.budget.toLocaleString("en-IN")}. They ${customer.financeRequired ? "require" : "do not require"} financing and ${customer.tradeIn ? "have" : "do not have"} a trade-in vehicle. Currently at "${customer.status}" stage.`,
      probability,
      sentiment,
      mainConcern,
      nextAction: customer.status === "Converted" ? "Complete documentation and delivery" :
                  customer.status === "Lost" ? "Analyze loss reason and follow up" :
                  "Schedule test drive and discuss finance options",
      dueWindow: customer.status === "Converted" ? "Within 3 days" :
                  customer.status === "Lost" ? "Within 1 week" :
                  "Within 48 hours"
    };
  };

  const filteredCustomers = customers?.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.includes(searchQuery)
  ) || [];

  if (selectedCustomer) {
    const summary = generateSummary(selectedCustomer);
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
            <h1 className="text-3xl font-bold">Conversation Summary</h1>
            <p className="text-muted-foreground">{selectedCustomer.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Narrative Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{summary.narrative}</p>
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
                  summary.probability > 70 ? "text-green-500" :
                  summary.probability > 40 ? "text-yellow-500" :
                  "text-red-500"
                }`}>
                  {summary.probability}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sentiment</span>
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                  summary.sentiment === "Positive" ? "bg-green-100 text-green-800" :
                  summary.sentiment === "Negative" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {summary.sentiment}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Main Concern</span>
                <span className="font-semibold">{summary.mainConcern}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Recommended Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4 rounded-xl border border-primary/50 bg-primary/5 p-4">
              <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold">{summary.nextAction}</h4>
                <p className="text-sm text-muted-foreground">Due: {summary.dueWindow}</p>
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
        <h1 className="text-3xl font-bold">Conversation Summaries</h1>
        <p className="text-muted-foreground">AI-generated summaries for each customer</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or phone..."
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
                        {customer.name.split(" ").map(n => n[0]).join("")}
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
