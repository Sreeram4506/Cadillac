import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, Search, FileText, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Customer, StageFeedback } from "@/types";
import { Timeline } from "@/components/layout/Timeline";
import { apiUrl } from "@/lib/api";

interface FeedbackFormState {
  vehicleReaction: string;
  comfortReaction: string;
  priceReaction: string;
  followUpIntent: string;
  salesReview: string;
  stageFeedbacks: StageFeedback[];
}

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
  "Documentation started",
  "Follow-up scheduled",
  "Discussed features",
  "Showed variants",
  "Explained EMI",
  "Shared comparison",
  "Offered test drive",
  "Escalated to manager",
  "Converted",
];
const nextStepOptions = [
  "Schedule follow-up",
  "Share variant comparison",
  "Prepare EMI options",
  "Set appointment",
  "Move to next phase",
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
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FeedbackFormState>({
    vehicleReaction: "",
    comfortReaction: "",
    priceReaction: "",
    followUpIntent: "",
    salesReview: "",
    stageFeedbacks: createDefaultStageFeedbacks(),
  });

  const { data: customers } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/customers"));
      return response.json();
    },
  });

  const selectedCustomer = customers?.find((customer) => String(customer.id) === selectedCustomerId) || null;

  const activeCustomers =
    customers?.filter((customer) => !["Converted", "Lost"].includes(customer.status)).sort((a, b) => {
      return new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime();
    }) || [];

  useEffect(() => {
    if (!selectedCustomerId && activeCustomers.length) {
      setSelectedCustomerId(String(activeCustomers[0].id));
    }
  }, [activeCustomers, selectedCustomerId]);

  useEffect(() => {
    if (!selectedCustomer) {
      setForm({
        vehicleReaction: "",
        comfortReaction: "",
        priceReaction: "",
        followUpIntent: "",
        salesReview: "",
        stageFeedbacks: createDefaultStageFeedbacks(),
      });
      return;
    }

    setForm({
      vehicleReaction: selectedCustomer.vehicleReaction || "",
      comfortReaction: selectedCustomer.comfortReaction || "",
      priceReaction: selectedCustomer.priceReaction || "",
      followUpIntent: selectedCustomer.followUpIntent || "",
      salesReview: selectedCustomer.salesReview || "",
      stageFeedbacks: stageOrder.map((stage) => {
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
      }),
    });
  }, [selectedCustomer]);

  const filteredCustomers = activeCustomers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      customer.preferredVehicle.toLowerCase().includes(searchQuery.toLowerCase())
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
          role: "manager",
          vehicleReaction: form.vehicleReaction,
          comfortReaction: form.comfortReaction,
          priceReaction: form.priceReaction,
          followUpIntent: form.followUpIntent,
          salesReview: form.salesReview,
          stageFeedbacks: form.stageFeedbacks,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update feedback");
      }

      const updatedCustomer = await response.json();
      queryClient.setQueryData(["customer", selectedCustomerId], updatedCustomer);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer feedback updated.");
    } catch (error) {
      toast.error("Could not save customer feedback.");
    } finally {
      setIsSaving(false);
    }
  };

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
          <p className="text-muted-foreground">Select an active customer and update the visit feedback that flows into Journey.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/check-in#feedback")}>
            Check-In
          </Button>
          <Button variant="outline" onClick={() => navigate("/inventory")}>
            Inventory
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
              Active Customers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, phone, or vehicle"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerSelect">Select customer</Label>
              <select
                id="customerSelect"
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Choose a customer</option>
                {filteredCustomers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name} - {customer.preferredVehicle}
                  </option>
                ))}
              </select>
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
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.preferredVehicle}</p>
                    </div>
                    <span className="rounded-full bg-muted px-2 py-1 text-xs">{customer.status}</span>
                  </div>
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
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    {selectedCustomer.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Vehicle</p>
                    <p className="font-semibold">{selectedCustomer.preferredVehicle}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/50 p-4">
                    <p className="text-sm text-muted-foreground">Current status</p>
                    <p className="font-semibold">{selectedCustomer.status}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/50 p-4 md:col-span-2">
                    <p className="text-sm text-muted-foreground">Journey</p>
                    <Timeline events={selectedCustomer.journey} className="mt-3" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Feedback Capture
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="vehicleReaction">Vehicle reaction</Label>
                      <select
                        id="vehicleReaction"
                        value={form.vehicleReaction}
                        onChange={(e) => setForm((prev) => ({ ...prev, vehicleReaction: e.target.value }))}
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Select reaction</option>
                        {feedbackOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comfortReaction">Comfort reaction</Label>
                      <select
                        id="comfortReaction"
                        value={form.comfortReaction}
                        onChange={(e) => setForm((prev) => ({ ...prev, comfortReaction: e.target.value }))}
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Select reaction</option>
                        {feedbackOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priceReaction">Price reaction</Label>
                      <select
                        id="priceReaction"
                        value={form.priceReaction}
                        onChange={(e) => setForm((prev) => ({ ...prev, priceReaction: e.target.value }))}
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Select reaction</option>
                        {feedbackOptions.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="followUpIntent">Follow-up intent</Label>
                      <Input
                        id="followUpIntent"
                        value={form.followUpIntent}
                        onChange={(e) => setForm((prev) => ({ ...prev, followUpIntent: e.target.value }))}
                        placeholder="What should happen next?"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="salesReview">Sales review</Label>
                      <textarea
                        id="salesReview"
                        value={form.salesReview}
                        onChange={(e) => setForm((prev) => ({ ...prev, salesReview: e.target.value }))}
                        rows={3}
                        className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        placeholder="Summarize what the customer said and what the salesperson observed."
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Stage feedback</Label>
                    {form.stageFeedbacks.map((item, index) => (
                      <details key={item.stage} className="rounded-xl border border-border bg-muted/50 p-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">{item.stage}</p>
                            <p className="text-xs text-muted-foreground">Phase {index + 1}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">Tap to edit</span>
                        </summary>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`customerFeedback-${item.stage}`}>Customer feedback</Label>
                            <select
                              id={`customerFeedback-${item.stage}`}
                              value={item.customerFeedback}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  stageFeedbacks: prev.stageFeedbacks.map((entry) =>
                                    entry.stage === item.stage ? { ...entry, customerFeedback: e.target.value } : entry
                                  ),
                                }))
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
                            <Label htmlFor={`salespersonResponse-${item.stage}`}>Salesperson response</Label>
                            <select
                              id={`salespersonResponse-${item.stage}`}
                              value={item.salespersonResponse}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  stageFeedbacks: prev.stageFeedbacks.map((entry) =>
                                    entry.stage === item.stage ? { ...entry, salespersonResponse: e.target.value } : entry
                                  ),
                                }))
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
                            <Label htmlFor={`nextStep-${item.stage}`}>Next step</Label>
                            <select
                              id={`nextStep-${item.stage}`}
                              value={item.nextStep}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  stageFeedbacks: prev.stageFeedbacks.map((entry) =>
                                    entry.stage === item.stage ? { ...entry, nextStep: e.target.value } : entry
                                  ),
                                }))
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
                            <Label htmlFor={`notes-${item.stage}`}>Notes</Label>
                            <textarea
                              id={`notes-${item.stage}`}
                              value={item.notes || ""}
                              onChange={(e) =>
                                setForm((prev) => ({
                                  ...prev,
                                  stageFeedbacks: prev.stageFeedbacks.map((entry) =>
                                    entry.stage === item.stage ? { ...entry, notes: e.target.value } : entry
                                  ),
                                }))
                              }
                              rows={3}
                              className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              placeholder="Capture the exact customer reaction."
                            />
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>

                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Update Feedback"}
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-10 text-center">
                <p className="text-muted-foreground">Choose an active customer to begin capturing feedback.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
