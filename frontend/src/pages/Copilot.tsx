import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bot, CheckCircle, Car, DollarSign, TrendingUp, AlertCircle, Sparkles, Send, User } from "lucide-react";
import { AIChatResponse, Customer, DashboardData, LostSaleAnalysis, Salesperson, Vehicle } from "@/types";
import { toast } from "sonner";
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

interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
  source?: "openai" | "fallback";
}

const examplePrompts = [
  "What is the best next action for a customer with a finance objection?",
  "Which vehicle should I recommend for a family buyer?",
  "What is the biggest issue in our dealership right now?",
  "Which salesperson needs coaching and why?",
  "Give me a solution to improve conversions this week.",
];

export default function Copilot() {
  const [input, setInput] = useState<CopilotInput>({
    budget: "",
    vehicleType: "",
    financeRequired: false,
  });
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/vehicles"));
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

  const { data: salespersonPerformance } = useQuery<Salesperson[]>({
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

  const generateRecommendations = () => {
    const budget = parseInt(input.budget) || 0;
    const vehicleType = input.vehicleType;
    const finance = input.financeRequired;

    const newRecommendations: Recommendation[] = [];

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
            description: `Best fit for budget $${budget.toLocaleString("en-US")}. Price range: $${v.priceRange[0].toLocaleString("en-US")} - $${v.priceRange[1].toLocaleString("en-US")}.`,
            icon: Car,
          });
        });
      } else {
        newRecommendations.push({
          id: "no-vehicle",
          type: "vehicle",
          title: "No exact match",
          description: "Try a broader vehicle type or slightly adjust the budget range.",
          icon: AlertCircle,
        });
      }
    }

    if (finance) {
      newRecommendations.push({
        id: "finance-1",
        type: "talking-point",
        title: "Lead with EMI clarity",
        description: "Finance buyers need a simple EMI story first, then the variant comparison.",
        icon: DollarSign,
      });
      newRecommendations.push({
        id: "finance-2",
        type: "talking-point",
        title: "Show approval speed",
        description: "Make the approval timeline and required documents clear early in the conversation.",
        icon: TrendingUp,
      });
    } else {
      newRecommendations.push({
        id: "cash-1",
        type: "talking-point",
        title: "Highlight value",
        description: "Focus on features, delivery speed, and ownership benefits instead of payments.",
        icon: DollarSign,
      });
    }

    if (budget > 2000000) {
      newRecommendations.push({
        id: "premium-1",
        type: "talking-point",
        title: "Premium pitch",
        description: "Emphasize safety, premium finishes, and comfort features for the higher segment.",
        icon: Car,
      });
    } else if (budget < 1000000 && budget > 0) {
      newRecommendations.push({
        id: "budget-1",
        type: "talking-point",
        title: "Value pitch",
        description: "Lead with mileage, maintenance savings, and the strongest value proposition.",
        icon: TrendingUp,
      });
    }

    newRecommendations.push({
      id: "action-1",
      type: "action",
      title: "Schedule test drive",
      description: "Move the customer to a drive quickly because test drives convert far better.",
      icon: CheckCircle,
    });

    if (finance) {
      newRecommendations.push({
        id: "action-2",
        type: "action",
        title: "Loop in finance support",
        description: "Get a quick EMI estimate so the customer sees a clear path to purchase.",
        icon: CheckCircle,
      });
    }

    setRecommendations(newRecommendations);
  };

  const askCopilot = async (prompt: string) => {
    if (!prompt.trim()) return;

    const userMessage: CopilotMessage = { role: "user", content: prompt };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    setIsThinking(true);

    try {
      const response = await fetch(apiUrl("/api/ai-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: prompt,
          context: {
            dashboard,
            lostSales,
            salespersonPerformance,
            customers,
            vehicles,
            customerProfile: input,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get copilot response");
      }

      const data: AIChatResponse = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer, source: data.source }]);
    } catch (error) {
      toast.error("Failed to get copilot response. Please try again.");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I could not reach the AI service. Please try again after a moment.",
          source: "fallback",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleQuestionSubmit = async () => {
    if (!question.trim()) {
      toast.error("Please enter a question first.");
      return;
    }

    await askCopilot(question);
  };

  const topDemandVehicle = dashboard?.vehicleDemand?.[0]?.vehicle || vehicles?.[0]?.name || "the top vehicle";
  const topLostReason = lostSales?.byReason?.[0]?.reason || "the leading objection";
  const topSalesperson = salespersonPerformance?.[0]?.name || "the leading salesperson";

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
          <p className="text-muted-foreground">
            Ask a question and get a solution based on the project data, not a generic reply.
          </p>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">Top demand</p>
              <p className="font-semibold">{topDemandVehicle}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">Main objection</p>
              <p className="font-semibold">{topLostReason}</p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground">Best performer</p>
              <p className="font-semibold">{topSalesperson}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
                Finance required
              </Label>
            </div>

            <Button onClick={generateRecommendations} className="w-full">
              <Bot className="mr-2 h-4 w-4" />
              Generate Recommendations
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>AI Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            {vehiclesLoading ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : recommendations.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-center">
                <div className="space-y-2">
                  <Bot className="mx-auto h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">Enter customer details to get personalized recommendations</p>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Ask the Copilot
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {examplePrompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  className="h-auto justify-start text-left whitespace-normal"
                  onClick={() => setQuestion(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="question">Your question</Label>
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Ask for a recommendation, a root cause, or a step-by-step solution..."
              />
            </div>

            <Button onClick={handleQuestionSubmit} disabled={isThinking || !question.trim()}>
              <Send className="mr-2 h-4 w-4" />
              {isThinking ? "Thinking..." : "Ask Copilot"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Copilot Answer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AnimatePresence mode="wait">
              {messages.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground"
                >
                  Ask a question and I&apos;ll answer using the dealership data, then give a practical solution.
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <motion.div
                      key={`${message.role}-${index}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === "user" ? "ml-6 bg-primary text-primary-foreground" : "mr-6 bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.source && (
                        <p className="mt-2 text-xs opacity-70">
                          {message.source === "openai" ? "Powered by OpenAI" : "Based on project data"}
                        </p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
