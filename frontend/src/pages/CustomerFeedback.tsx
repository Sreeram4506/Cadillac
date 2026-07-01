import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Search, Sparkles, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Customer, StageFeedback } from "@/types";
import { apiUrl } from "@/lib/api";

const stageOrder: StageFeedback["stage"][] = [
  "Assigned to Salesperson",
  "Vehicle Viewed",
  "Test Drive",
  "Finance Discussion",
  "Quotation Given",
  "Converted",
];

const feedbackOptions = ["Loved it", "Liked it", "Neutral", "Concerned", "Rejected", "Needs more time"];
const responseOptions = [
  "Showed variants",
  "Explained EMI",
  "Shared comparison",
  "Offered test drive",
  "Follow-up scheduled",
  "Converted",
];
const nextStepOptions = [
  "Move to next phase",
  "Schedule follow-up",
  "Prepare EMI options",
  "Share variant comparison",
  "Set appointment",
];

const createDefaultStageFeedbacks = (): StageFeedback[] =>
  stageOrder.map((stage) => ({
    stage,
    customerFeedback: "",
    salespersonResponse: "",
    nextStep: "",
    notes: "",
  }));

export default function CustomerFeedback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [stageFeedbacks, setStageFeedbacks] = useState<StageFeedback[]>(createDefaultStageFeedbacks());

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/customers"));
      return response.json();
    },
  });

  const activeCustomers =
    customers?.filter((customer) => !["Converted", "Lost"].includes(customer.status)).sort((a, b) => {
      return new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime();
    }) || [];

  const selectedCustomer = customers?.find((customer) => String(customer.id) === selectedCustomerId) || null;
  const customerFromUrl = searchParams.get("customerId");

  useEffect(() => {
    if (customerFromUrl) {
      setSelectedCustomerId(customerFromUrl);
    }
  }, [customerFromUrl]);

  useEffect(() => {
    if (!selectedCustomer) {
      setStageFeedbacks(createDefaultStageFeedbacks());
      return;
    }

    setStageFeedbacks(
      stageOrder.map((stage) => {
        const existing = selectedCustomer.stageFeedbacks?.find((item) => item.stage === stage);
        return (
          existing || {
            stage,
            customerFeedback: "",
            salespersonResponse: "",
            nextStep: "",
            notes: "",
          }
        );
      })
    );
  }, [selectedCustomer]);

  const filteredCustomers = useMemo(
    () =>
      activeCustomers.filter(
        (customer) =>
          customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          customer.phone.includes(searchQuery) ||
          customer.preferredVehicle.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [activeCustomers, searchQuery]
  );

  const handleSave = async () => {
    if (!selectedCustomerId) {
      toast.error("Please select a customer first.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(apiUrl(`/api/customers/${selectedCustomerId}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stageFeedbacks,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update feedback");
      }

      const updatedCustomer = await response.json();
      queryClient.setQueryData(["customer", selectedCustomerId], updatedCustomer);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Phase feedback saved.");
    } catch (error) {
      toast.error("Could not save customer feedback.");
    } finally {
      setIsSaving(false);
    }
  };

  const aiAnalysis = selectedCustomer?.aiAnalysis;

  const completedCount = stageFeedbacks.filter((item) => item.customerFeedback || item.salespersonResponse || item.nextStep || item.notes).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 p-6"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Customer Feedback</h1>
          <p className="text-muted-foreground">
            Pick a customer name, then capture feedback phase by phase from test drive to conversion.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/check-in")}>
            Check-In
          </Button>
          <Button variant="outline" onClick={() => navigate("/journey")}>
            Journey
          </Button>
          {selectedCustomer && (
            <Button variant="outline" onClick={() => navigate(`/journey/${selectedCustomer.id}`)}>
              Open Journey
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Customer Names
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name"
              />
            </div>
            <div className="space-y-2">
              {filteredCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setSelectedCustomerId(String(customer.id))}
                  className={`w-full rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                    String(customer.id) === selectedCustomerId
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background hover:bg-accent"
                  }`}
                >
                  <p className="font-semibold">{customer.name}</p>
                </button>
              ))}
              {!filteredCustomers.length && (
                <p className="text-sm text-muted-foreground">No active customers match your search.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          {selectedCustomer ? (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    Phase Feedback for {selectedCustomer.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-border bg-muted/50 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Completed phases</p>
                      <p className="text-lg font-semibold">{completedCount} / {stageOrder.length}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Current status</p>
                      <p className="font-semibold">{selectedCustomer.status}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {stageOrder.map((stage, index) => {
                      const item = stageFeedbacks.find((entry) => entry.stage === stage) || createDefaultStageFeedbacks()[index];
                      return (
                        <details key={stage} className="rounded-xl border border-border bg-muted/50 p-4" open={index === 0}>
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">{stage}</p>
                              <p className="text-xs text-muted-foreground">Phase {index + 1}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">Tap to edit</span>
                          </summary>
                          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor={`customerFeedback-${stage}`}>Customer feedback</Label>
                              <select
                                id={`customerFeedback-${stage}`}
                                value={item.customerFeedback}
                                onChange={(e) =>
                                  setStageFeedbacks((prev) =>
                                    prev.map((entry) =>
                                      entry.stage === stage ? { ...entry, customerFeedback: e.target.value } : entry
                                    )
                                  )
                                }
                                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="">Select feedback</option>
                                {feedbackOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`salespersonResponse-${stage}`}>Salesperson response</Label>
                              <select
                                id={`salespersonResponse-${stage}`}
                                value={item.salespersonResponse}
                                onChange={(e) =>
                                  setStageFeedbacks((prev) =>
                                    prev.map((entry) =>
                                      entry.stage === stage ? { ...entry, salespersonResponse: e.target.value } : entry
                                    )
                                  )
                                }
                                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="">Select response</option>
                                {responseOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`nextStep-${stage}`}>Next step</Label>
                              <select
                                id={`nextStep-${stage}`}
                                value={item.nextStep}
                                onChange={(e) =>
                                  setStageFeedbacks((prev) =>
                                    prev.map((entry) => (entry.stage === stage ? { ...entry, nextStep: e.target.value } : entry))
                                  )
                                }
                                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <option value="">Select next step</option>
                                {nextStepOptions.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`notes-${stage}`}>Notes</Label>
                              <textarea
                                id={`notes-${stage}`}
                                value={item.notes || ""}
                                onChange={(e) =>
                                  setStageFeedbacks((prev) =>
                                    prev.map((entry) => (entry.stage === stage ? { ...entry, notes: e.target.value } : entry))
                                  )
                                }
                                rows={3}
                                className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                placeholder="Add the exact conversation or concern raised in this phase."
                              />
                            </div>
                          </div>
                        </details>
                      );
                    })}
                  </div>

                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Phase Feedback"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiAnalysis ? (
                    <>
                      <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
                        <p className="text-xs text-muted-foreground">Intent summary</p>
                        <p className="text-sm font-medium">{aiAnalysis.intentSummary}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
                        <p className="text-xs text-muted-foreground">What happened</p>
                        <p className="text-sm font-medium leading-relaxed">{aiAnalysis.ownerInsight}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
                        <p className="text-xs text-muted-foreground">Recommended next action</p>
                        <p className="text-sm font-medium">{aiAnalysis.recommendedNextAction}</p>
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                      Save phase feedback to generate the AI summary.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Click a customer name to begin phase-by-phase feedback.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
