import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, CheckCircle, Car, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Vehicle } from "@/types";
import { apiUrl } from "@/lib/api";

interface CopilotInput {
  budget: string;
  vehicleType: string;
  financeRequired: boolean;
}

interface Recommendation {
  id: string;
  type: "vehicle" | "talking-point" | "action";
  title: string;
  description: string;
  icon: any;
}

export default function Copilot() {
  const [input, setInput] = useState<CopilotInput>({
    budget: "",
    vehicleType: "",
    financeRequired: false,
  });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/vehicles"));
      return response.json();
    },
  });

  const generateRecommendations = () => {
    const budget = parseInt(input.budget) || 0;
    const vehicleType = input.vehicleType;
    const finance = input.financeRequired;

    const newRecommendations: Recommendation[] = [];

    // Vehicle recommendations based on budget and type
    if (budget > 0 && vehicleType) {
      const matchingVehicles = vehicles?.filter(
        (v) =>
          v.type.toLowerCase() === vehicleType.toLowerCase() &&
          budget >= v.priceRange[0] * 0.8 &&
          budget <= v.priceRange[1] * 1.2
      );

      if (matchingVehicles && matchingVehicles.length > 0) {
        matchingVehicles.slice(0, 2).forEach((v) => {
          newRecommendations.push({
            id: `vehicle-${v.id}`,
            type: "vehicle",
            title: v.name,
            description: `Perfect match for budget ₹${budget.toLocaleString("en-IN")}. Price range: ₹${v.priceRange[0].toLocaleString("en-IN")} - ₹${v.priceRange[1].toLocaleString("en-IN")}`,
            icon: Car,
          });
        });
      } else {
        newRecommendations.push({
          id: "no-vehicle",
          type: "vehicle",
          title: "No exact match",
          description: "Consider adjusting budget or exploring other vehicle types",
          icon: AlertCircle,
        });
      }
    }

    // Talking points based on finance flag
    if (finance) {
      newRecommendations.push({
        id: "finance-1",
        type: "talking-point",
        title: "Highlight EMI Options",
        description: "Customers with finance requests convert 42% more. Present EMI calculator early in conversation.",
        icon: DollarSign,
      });
      newRecommendations.push({
        id: "finance-2",
        type: "talking-point",
        title: "Finance Approval Process",
        description: "Explain quick approval timeline (24-48 hours) to reduce purchase anxiety.",
        icon: TrendingUp,
      });
    } else {
      newRecommendations.push({
        id: "cash-1",
        type: "talking-point",
        title: "Cash Discount Opportunity",
        description: "Offer cash payment discount for immediate decision makers.",
        icon: DollarSign,
      });
    }

    // Budget-based talking points
    if (budget > 2000000) {
      newRecommendations.push({
        id: "premium-1",
        type: "talking-point",
        title: "Premium Features Focus",
        description: "Emphasize advanced safety features, premium interiors, and exclusive accessories.",
        icon: Car,
      });
    } else if (budget < 1000000) {
      newRecommendations.push({
        id: "budget-1",
        type: "talking-point",
        title: "Value Proposition",
        description: "Focus on fuel efficiency, low maintenance costs, and warranty benefits.",
        icon: TrendingUp,
      });
    }

    // Action items
    newRecommendations.push({
      id: "action-1",
      type: "action",
      title: "Schedule Test Drive",
      description: "Customers who test drive convert 3x more. Schedule within 48 hours.",
      icon: CheckCircle,
    });

    if (finance) {
      newRecommendations.push({
        id: "action-2",
        type: "action",
        title: "Connect with Finance Team",
        description: "Get pre-approval estimate to strengthen negotiation position.",
        icon: CheckCircle,
      });
    }

    setRecommendations(newRecommendations);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 p-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <Bot className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">AI Sales Copilot</h1>
          <p className="text-muted-foreground">Get instant recommendations based on customer profile</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Input Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="budget">Budget (₹)</Label>
              <Input
                id="budget"
                type="number"
                value={input.budget}
                onChange={(e) => setInput({ ...input, budget: e.target.value })}
                placeholder="Enter budget amount"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleType">Vehicle Type</Label>
              <select
                id="vehicleType"
                value={input.vehicleType}
                onChange={(e) => setInput({ ...input, vehicleType: e.target.value })}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select type</option>
                <option value="SUV">SUV</option>
                <option value="Sedan">Sedan</option>
                <option value="Hatchback">Hatchback</option>
                <option value="MPV">MPV</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="finance"
                checked={input.financeRequired}
                onChange={(e) => setInput({ ...input, financeRequired: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="finance" className="cursor-pointer">
                Finance Required
              </Label>
            </div>

            <Button onClick={generateRecommendations} className="w-full">
              <Bot className="mr-2 h-4 w-4" />
              Generate Recommendations
            </Button>
          </CardContent>
        </Card>

        {/* Recommendations Panel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {recommendations.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-center">
                <div className="space-y-2">
                  <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Enter customer details to get personalized recommendations
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, index) => {
                  const Icon = rec.icon;
                  return (
                    <motion.div
                      key={rec.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex gap-3 rounded-xl border p-4 ${
                        rec.type === "vehicle"
                          ? "border-primary/50 bg-primary/5"
                          : rec.type === "action"
                          ? "border-green-500/50 bg-green-500/5"
                          : "border-border bg-card"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                          rec.type === "vehicle"
                            ? "bg-primary text-primary-foreground"
                            : rec.type === "action"
                            ? "bg-green-500 text-white"
                            : "bg-muted"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{rec.title}</h4>
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex gap-3 rounded-xl border border-border bg-muted/50 p-4">
              <TrendingUp className="h-5 w-5 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold">Test Drive Impact</h4>
                <p className="text-sm text-muted-foreground">
                  Customers who test drive convert 3x more than those who don't
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border bg-muted/50 p-4">
              <DollarSign className="h-5 w-5 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold">Finance Advantage</h4>
                <p className="text-sm text-muted-foreground">
                  Finance requests convert 42% more than cash buyers
                </p>
              </div>
            </div>
            <div className="flex gap-3 rounded-xl border border-border bg-muted/50 p-4">
              <Car className="h-5 w-5 text-primary shrink-0" />
              <div>
                <h4 className="font-semibold">Weekend Peak</h4>
                <p className="text-sm text-muted-foreground">
                  Weekend visitors are 2.3x more likely to purchase within 7 days
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
