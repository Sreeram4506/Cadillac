import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Timeline } from "@/components/layout/Timeline";
import { ArrowLeft, Search, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Appointment, Customer, Salesperson } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { apiUrl } from "@/lib/api";

interface EditFormState {
  status: string;
  lostReason: string;
  purchaseIntent: string;
  buyingPurpose: string;
  colorPreference: string;
  featurePriorities: string;
  budget: string;
  financeRequired: boolean;
  tradeIn: boolean;
  timeline: string;
  notes: string;
  assignedSalespersonId: string;
}

const defaultEditForm: EditFormState = {
  status: "",
  lostReason: "",
  purchaseIntent: "",
  buyingPurpose: "",
  colorPreference: "",
  featurePriorities: "",
  budget: "",
  financeRequired: false,
  tradeIn: false,
  timeline: "",
  notes: "",
  assignedSalespersonId: "",
};

const salesRoleOptions = [
  { label: "Converted", value: "Converted" },
  { label: "Not Converted", value: "Lost" },
];

export default function Journey() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [editForm, setEditForm] = useState<EditFormState>(defaultEditForm);
  const [appointmentDraft, setAppointmentDraft] = useState({
    title: "",
    date: "",
    time: "",
    notes: "",
  });

  const { data: salespeople } = useQuery<Salesperson[]>({
    queryKey: ["salespeople"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/salespeople"));
      return response.json();
    },
  });

  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/customers"));
      return response.json();
    },
  });

  const { data: customer } = useQuery<Customer>({
    queryKey: ["customer", id],
    queryFn: async () => {
      if (!id) return null;
      const response = await fetch(apiUrl(`/api/customers/${id}`));
      return response.json();
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (!customer) return;

    setEditForm({
      status: customer.status || "",
      lostReason: customer.lostReason || "",
      purchaseIntent: customer.purchaseIntent || "",
      buyingPurpose: customer.buyingPurpose || "",
      colorPreference: customer.colorPreference || "",
      featurePriorities: customer.featurePriorities?.join(", ") || "",
      budget: customer.budget ? String(customer.budget) : "",
      financeRequired: Boolean(customer.financeRequired),
      tradeIn: Boolean(customer.tradeIn),
      timeline: customer.timeline || "",
      notes: customer.notes || "",
      assignedSalespersonId: customer.assignedSalesperson?.id ? String(customer.assignedSalesperson.id) : "",
    });
  }, [customer]);

  const role = user?.role || "salesperson";
  const canEditAll = role === "manager" || role === "owner";
  const isSalesperson = role === "salesperson";

  const handleSaveCustomer = async () => {
    if (!id) return;

    if (editForm.status !== "Converted" && !editForm.lostReason.trim()) {
      toast.error("Please add the reason when the customer is not converted.");
      return;
    }

    const payload: Record<string, unknown> = {};

    if (canEditAll) {
      payload.status = editForm.status;
      payload.lostReason = editForm.status === "Converted" ? null : editForm.lostReason || null;
      payload.purchaseIntent = editForm.purchaseIntent;
      payload.buyingPurpose = editForm.buyingPurpose;
      payload.colorPreference = editForm.colorPreference;
      payload.featurePriorities = editForm.featurePriorities
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      payload.budget = Number(editForm.budget);
      payload.financeRequired = editForm.financeRequired;
      payload.tradeIn = editForm.tradeIn;
      payload.timeline = editForm.timeline;
      payload.notes = editForm.notes;
      payload.assignedSalespersonId = editForm.assignedSalespersonId;
      payload.assignedSalesperson = salespeople?.find((sp) => sp.id === Number(editForm.assignedSalespersonId)) || customer?.assignedSalesperson || null;
    } else {
      payload.status = editForm.status;
      payload.lostReason = editForm.status === "Converted" ? null : editForm.lostReason || null;
    }

    try {
      const response = await fetch(apiUrl(`/api/customers/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to update customer");
      }

      const updatedCustomer = await response.json();
      queryClient.setQueryData(["customer", id], updatedCustomer);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer details updated.");
    } catch (error) {
      toast.error("Could not save customer details.");
    }
  };

  const handleAddAppointment = async () => {
    if (!id) return;
    if (!appointmentDraft.title.trim() || !appointmentDraft.date || !appointmentDraft.time) {
      toast.error("Please enter appointment title, date, and time.");
      return;
    }

    try {
      const response = await fetch(apiUrl(`/api/customers/${id}/appointments`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...appointmentDraft,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create appointment");
      }

      setAppointmentDraft({ title: "", date: "", time: "", notes: "" });
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      toast.success("Appointment added.");
    } catch (error) {
      toast.error("Could not add appointment.");
    }
  };

  if (id && customer) {
    const appointments = (customer.appointments || []) as Appointment[];

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="space-y-6 p-6"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/journey")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Customer Journey</h1>
              <p className="text-muted-foreground">Track customer progress through the sales funnel</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate("/check-in")}>
              Check-In
            </Button>
            <Button variant="outline" onClick={() => navigate(id ? `/customer-feedback?customerId=${id}` : "/customer-feedback")}>
              Customer Feedback
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Signed in as</p>
                <p className="text-lg font-semibold">{user?.name || "User"}</p>
              </div>
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                {user?.roleLabel || role}
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {isSalesperson
                ? "Salesperson access is limited to conversion status and reason capture."
                : "Manager and owner can update the full customer record."}
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{customer.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-semibold">{customer.phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{customer.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Preferred Vehicle</p>
                <p className="font-semibold">{customer.preferredVehicle}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Buy Brief</p>
                <p className="font-semibold">{customer.purchaseIntent || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Buy Reason</p>
                <p className="font-semibold">{customer.buyingPurpose || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Color Preference</p>
                <p className="font-semibold">{customer.colorPreference || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Priorities</p>
                <p className="font-semibold">{customer.featurePriorities?.length ? customer.featurePriorities.join(", ") : "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Budget</p>
                <p className="font-semibold">${customer.budget.toLocaleString("en-US")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Assigned Salesperson</p>
                <p className="font-semibold">{customer.assignedSalesperson?.name || "Unassigned"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                  customer.status === "Converted" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                  customer.status === "Lost" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                  "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                }`}>
                  {customer.status}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Journey Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <Timeline events={customer.journey} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border bg-muted/50 p-4">
              <p className="text-sm">{customer.notes || "No additional notes recorded."}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Phase Feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.stageFeedbacks?.length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {customer.stageFeedbacks.map((feedback) => (
                  <div key={feedback.stage} className="rounded-xl border border-border bg-muted/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold">{feedback.stage}</p>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        Phase captured
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm">
                      <p><span className="font-medium">Customer feedback:</span> {feedback.customerFeedback || "Not added yet"}</p>
                      <p><span className="font-medium">Sales response:</span> {feedback.salespersonResponse || "Not added yet"}</p>
                      <p><span className="font-medium">Next step:</span> {feedback.nextStep || "Not added yet"}</p>
                      <p><span className="font-medium">Notes:</span> {feedback.notes || "No notes"}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  No phase feedback recorded yet. Open Customer Feedback to capture test drive, finance, and follow-up details.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {appointments.length ? (
              <div className="space-y-3">
                {appointments.map((appointment) => (
                  <div key={appointment.id} className="rounded-xl border border-border bg-muted/50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{appointment.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDateTime(appointment.date)} at {appointment.time}
                        </p>
                      </div>
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                        {appointment.status}
                      </span>
                    </div>
                    <p className="mt-2 text-sm">{appointment.notes || "No notes"}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">No appointments scheduled yet.</p>
              </div>
            )}

            {canEditAll && (
              <div className="space-y-3 rounded-xl border border-border bg-muted/50 p-4">
                <p className="font-semibold">Add Appointment</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="apptTitle">Title</Label>
                    <Input
                      id="apptTitle"
                      value={appointmentDraft.title}
                      onChange={(e) => setAppointmentDraft({ ...appointmentDraft, title: e.target.value })}
                      placeholder="Follow-up call"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apptDate">Date</Label>
                    <Input
                      id="apptDate"
                      type="date"
                      value={appointmentDraft.date}
                      onChange={(e) => setAppointmentDraft({ ...appointmentDraft, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apptTime">Time</Label>
                    <Input
                      id="apptTime"
                      type="time"
                      value={appointmentDraft.time}
                      onChange={(e) => setAppointmentDraft({ ...appointmentDraft, time: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="apptNotes">Notes</Label>
                    <textarea
                      id="apptNotes"
                      value={appointmentDraft.notes}
                      onChange={(e) => setAppointmentDraft({ ...appointmentDraft, notes: e.target.value })}
                      rows={3}
                      className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Why the appointment is needed"
                    />
                  </div>
                </div>
                <Button onClick={handleAddAppointment}>Add Appointment</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {customer.aiAnalysis && (
          <Card>
            <CardHeader>
              <CardTitle>AI Visit Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Intent Summary</p>
                  <p className="text-sm font-medium">{customer.aiAnalysis.intentSummary}</p>
                  <p className="text-sm text-muted-foreground">Buying Reason</p>
                  <p className="text-sm font-medium">{customer.aiAnalysis.buyingReason}</p>
                  <p className="text-sm text-muted-foreground">Buying Probability</p>
                  <p className="text-sm font-semibold">{customer.aiAnalysis.buyingProbability}%</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2">
                  <p className="text-sm text-muted-foreground">Top Priorities</p>
                  <p className="text-sm font-medium">
                    {customer.aiAnalysis.topPriorities.length ? customer.aiAnalysis.topPriorities.join(", ") : "None"}
                  </p>
                  <p className="text-sm text-muted-foreground">Likely Objections</p>
                  <p className="text-sm font-medium">
                    {customer.aiAnalysis.likelyObjections.length ? customer.aiAnalysis.likelyObjections.join(", ") : "None"}
                  </p>
                  <p className="text-sm text-muted-foreground">Recommended Next Action</p>
                  <p className="text-sm font-medium">{customer.aiAnalysis.recommendedNextAction}</p>
                </div>
                <div className="rounded-xl border border-border bg-muted/50 p-4 space-y-2 md:col-span-2">
                  <p className="text-sm text-muted-foreground">Owner Insight</p>
                  <p className="text-sm font-medium">{customer.aiAnalysis.ownerInsight}</p>
                  <p className="text-sm text-muted-foreground">Customer Sentiment</p>
                  <p className="text-sm font-medium">{customer.aiAnalysis.customerSentiment || "Neutral"}</p>
                  <p className="text-sm text-muted-foreground">Sales Coaching Tip</p>
                  <p className="text-sm font-medium">{customer.aiAnalysis.coachingTip}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Editable Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSalesperson ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dealOutcome">Deal Outcome</Label>
                  <select
                    id="dealOutcome"
                    value={editForm.status === "Converted" ? "Converted" : "Lost"}
                    onChange={(e) =>
                      setEditForm((prev) => ({
                        ...prev,
                        status: e.target.value === "Converted" ? "Converted" : "Lost",
                      }))
                    }
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {salesRoleOptions.map((option) => (
                      <option key={option.label} value={option.label}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                {editForm.status !== "Converted" && (
                  <div className="space-y-2">
                    <Label htmlFor="lostReason">Reason not converted</Label>
                    <textarea
                      id="lostReason"
                      value={editForm.lostReason}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, lostReason: e.target.value }))}
                      rows={4}
                      placeholder="Why did the customer not convert?"
                      className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={editForm.status}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="Checked In">Checked In</option>
                    <option value="Assigned to Salesperson">Assigned to Salesperson</option>
                    <option value="Vehicle Viewed">Vehicle Viewed</option>
                    <option value="Test Drive">Test Drive</option>
                    <option value="Finance Discussion">Finance Discussion</option>
                    <option value="Quotation Given">Quotation Given</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assignedSalespersonId">Assigned Salesperson</Label>
                  <select
                    id="assignedSalespersonId"
                    value={editForm.assignedSalespersonId}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, assignedSalespersonId: e.target.value }))}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Keep current</option>
                    {salespeople?.map((salesperson) => (
                      <option key={salesperson.id} value={salesperson.id}>
                        {salesperson.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchaseIntent">Buy Brief</Label>
                  <textarea
                    id="purchaseIntent"
                    value={editForm.purchaseIntent}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, purchaseIntent: e.target.value }))}
                    rows={3}
                    className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={editForm.notes}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                    className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            )}

            {!isSalesperson && (
              <>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="buyReason">Buy Reason</Label>
                    <Input
                      id="buyReason"
                      value={editForm.buyingPurpose}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, buyingPurpose: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="colorPreferenceEdit">Color Preference</Label>
                    <Input
                      id="colorPreferenceEdit"
                      value={editForm.colorPreference}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, colorPreference: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="featurePriorities">Top Priorities</Label>
                    <Input
                      id="featurePriorities"
                      value={editForm.featurePriorities}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, featurePriorities: e.target.value }))}
                      placeholder="Mileage, Safety, Comfort"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timelineEdit">Timeline</Label>
                    <Input
                      id="timelineEdit"
                      value={editForm.timeline}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, timeline: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budgetEdit">Budget</Label>
                    <Input
                      id="budgetEdit"
                      type="number"
                      value={editForm.budget}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, budget: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editForm.financeRequired}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, financeRequired: e.target.checked }))}
                    />
                    Finance Required
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={editForm.tradeIn}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, tradeIn: e.target.checked }))}
                    />
                    Trade-in
                  </label>
                </div>
                {editForm.status !== "Converted" && (
                  <div className="space-y-2">
                    <Label htmlFor="lostReasonEdit">Reason not converted</Label>
                    <textarea
                      id="lostReasonEdit"
                      value={editForm.lostReason}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, lostReason: e.target.value }))}
                      rows={3}
                      className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Why did the deal not close?"
                    />
                  </div>
                )}
              </>
            )}

            <Button onClick={handleSaveCustomer}>Save Changes</Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const filteredCustomers =
    customers?.filter(
      (c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        c.preferredVehicle.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 p-6"
    >
      <div>
        <h1 className="text-3xl font-bold">Customer Journeys</h1>
        <p className="text-muted-foreground">View and manage all customer journeys</p>
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
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCustomers.map((customer) => (
            <motion.div
              key={customer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01 }}
              onClick={() => navigate(`/journey/${customer.id}`)}
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
                        customer.status === "Converted" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                        customer.status === "Lost" ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
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
