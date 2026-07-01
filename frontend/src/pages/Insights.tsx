import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Sparkles, User, Bot, Lightbulb } from "lucide-react";
import { AIChatResponse, Customer, DashboardData, Vehicle } from "@/types";
import { toast } from "sonner";
import { apiUrl } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
  source?: "openai" | "fallback";
}

const examplePrompts = [
  "Why are customers leaving?",
  "Which vehicle is in highest demand?",
  "Which salesperson needs coaching?",
  "How's this week compared to last week?",
  "What's our conversion rate trend?",
  "What should I focus on improving?",
];

export default function Insights() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { data: dashboard } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/dashboard"));
      return response.json();
    },
  });

  const { data: lostSales } = useQuery({
    queryKey: ["lost-sales"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/lost-sales"));
      return response.json();
    },
  });

  const { data: salespersonPerformance } = useQuery({
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

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch(apiUrl("/api/ai-chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: input,
          context: {
            dashboard,
            lostSales,
            salespersonPerformance,
            customers,
            vehicles,
          },
        }),
      });

      if (response.ok) {
        const data: AIChatResponse = await response.json();
        const assistantMessage: Message = {
          role: "assistant",
          content: data.answer,
          source: data.source,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error("Failed to get response");
      }
    } catch (error) {
      toast.error("Failed to get AI response. Please try again.");
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "I apologize, but I'm having trouble connecting right now. Please try again.",
        source: "fallback",
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExamplePrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex h-full flex-col p-6"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          AI Insights
        </h1>
        <p className="text-muted-foreground mt-2">Ask questions about your dealership performance</p>
      </div>

      <div className="flex flex-1 gap-6 overflow-hidden">
        {/* Example Prompts */}
        <Card className="hidden w-72 flex-col lg:flex">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-primary" />
              Suggested Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {examplePrompts.map((prompt) => (
                <Button
                  key={prompt}
                  variant="outline"
                  className="w-full justify-start text-left h-auto py-3 px-4"
                  onClick={() => handleExamplePrompt(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Chat Interface */}
        <Card className="flex-1 flex flex-col">
          <CardContent className="flex-1 flex flex-col p-6">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4">
              <AnimatePresence>
                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex h-full items-center justify-center text-center"
                  >
                    <div className="space-y-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mx-auto">
                        <Bot className="h-10 w-10 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Welcome to AI Insights</h3>
                        <p className="text-muted-foreground">
                          Ask me anything about your dealership performance, customer behavior, or sales trends.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                        <Bot className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.source && (
                        <p className="text-xs mt-2 opacity-70">
                          {message.source === "openai" ? "Powered by OpenAI" : "Based on dashboard data"}
                        </p>
                      )}
                    </div>
                    {message.role === "user" && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </motion.div>
                ))}

                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3 justify-start"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="bg-muted rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-100" />
                        <div className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce delay-200" />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask a question about your dealership..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={isLoading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
