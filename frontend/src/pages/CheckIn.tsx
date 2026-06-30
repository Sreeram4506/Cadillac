import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRight, ArrowLeft, CheckCircle, User, Car, DollarSign, Clock, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Salesperson, Vehicle } from "@/types";
import { apiUrl } from "@/lib/api";

interface FormData {
  name: string;
  phone: string;
  email: string;
  preferredVehicle: string;
  purchaseIntent: string;
  buyingPurpose: string;
  colorPreference: string;
  featurePriorities: string[];
  vehicleReaction: string;
  comfortReaction: string;
  priceReaction: string;
  followUpIntent: string;
  salesReview: string;
  inventoryPush: string[];
  inventoryNotes: string;
  budget: string;
  financeRequired: boolean;
  tradeIn: boolean;
  timeline: string;
  notes: string;
  assignedSalespersonId: string;
}

interface StageFeedbackForm {
  stage: "Assigned to Salesperson" | "Vehicle Viewed" | "Test Drive" | "Finance Discussion" | "Quotation Given" | "Converted";
  customerFeedback: string;
  salespersonResponse: string;
  nextStep: string;
  notes: string;
}

interface AppointmentDraft {
  title: string;
  date: string;
  time: string;
  notes: string;
}

const sections = [
  { id: "identity", title: "Customer Identity", icon: User },
  { id: "vehicle", title: "Vehicle Preference", icon: Car },
  { id: "feedback", title: "Customer Feedback", icon: FileText },
  { id: "inventory", title: "Inventory", icon: Car },
  { id: "appointments", title: "Appointments", icon: Clock },
  { id: "finance", title: "Finance & Trade-in", icon: DollarSign },
  { id: "timeline", title: "Timeline & Notes", icon: Clock },
  { id: "review", title: "Review", icon: FileText },
];

const stageTitles: StageFeedbackForm["stage"][] = [
  "Assigned to Salesperson",
  "Vehicle Viewed",
  "Test Drive",
  "Finance Discussion",
  "Quotation Given",
  "Converted",
];

const stageCustomerFeedbackOptions = [
  "Loved it",
  "Liked it",
  "Neutral",
  "Concerned",
  "Rejected",
  "Needs more time",
];

const stageResponseOptions = [
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

const stageNextStepOptions = [
  "Schedule follow-up",
  "Share variant comparison",
  "Prepare EMI options",
  "Set appointment",
  "Move to next phase",
];

export default function CheckIn() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentSection, setCurrentSection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [appointmentDraft, setAppointmentDraft] = useState<AppointmentDraft>({
    title: "",
    date: "",
    time: "",
    notes: "",
  });

  const [stageFeedbacks, setStageFeedbacks] = useState<StageFeedbackForm[]>(
    stageTitles.map((stage) => ({
      stage,
      customerFeedback: "",
      salespersonResponse: "",
      nextStep: "",
      notes: "",
    }))
  );

  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    preferredVehicle: "",
    purchaseIntent: "",
    buyingPurpose: "",
    colorPreference: "",
    featurePriorities: [],
    vehicleReaction: "",
    comfortReaction: "",
    priceReaction: "",
    followUpIntent: "",
    salesReview: "",
    inventoryPush: [],
    inventoryNotes: "",
    budget: "",
    financeRequired: false,
    tradeIn: false,
    timeline: "",
    notes: "",
    assignedSalespersonId: "",
  });

  useEffect(() => {
    const hashToSection: Record<string, number> = {
      "#identity": 0,
      "#vehicle": 1,
      "#feedback": 2,
      "#inventory": 3,
      "#appointments": 4,
      "#finance": 5,
      "#timeline": 6,
      "#review": 7,
    };

    const sectionIndex = hashToSection[location.hash];
    if (sectionIndex !== undefined) {
      setCurrentSection(sectionIndex);
    }
  }, [location.hash]);

  const { data: salespeople } = useQuery<Salesperson[]>({
    queryKey: ["salespeople"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/salespeople"));
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

  const selectedSalesperson =
    salespeople?.find((sp) => sp.id === Number(formData.assignedSalespersonId)) ||
    salespeople?.[0] ||
    null;

  const inventoryOptions = vehicles || [];

  const featureOptions = ["Mileage", "Boot Space", "Safety", "Comfort", "Technology", "Low Maintenance"];
  const reactionOptions = ["Very positive", "Positive", "Neutral", "Concerned", "Negative"];
  const comfortOptions = ["Loved the comfort", "Comfortable enough", "Wanted more space", "Wanted a softer ride", "Not a fit"];
  const priceOptions = ["Comfortable with price", "Needs EMI support", "Comparing other options", "Feels expensive", "Waiting for a better offer"];
  const followUpOptions = ["Wants follow-up", "Will revisit later", "Needs family discussion", "Ready for test drive", "Not interested right now"];

  const validateSection = (sectionIndex: number) => {
    if (sectionIndex === 0 && (!formData.name.trim() || !formData.phone.trim())) {
      toast.error("Name and phone are required before continuing.");
      return false;
    }

    if (sectionIndex === 1 && (!formData.preferredVehicle || !formData.budget.trim())) {
      toast.error("Please choose a vehicle and enter a budget.");
      return false;
    }

    if (sectionIndex === 2 && stageFeedbacks.some((item) => !item.customerFeedback || !item.salespersonResponse || !item.nextStep)) {
      toast.error("Please capture customer feedback, salesperson response, and next step for each phase.");
      return false;
    }

    if (
      sectionIndex === 4 &&
      (appointmentDraft.title || appointmentDraft.date || appointmentDraft.time || appointmentDraft.notes) &&
      (!appointmentDraft.title || !appointmentDraft.date || !appointmentDraft.time)
    ) {
      toast.error("Please complete the appointment title, date, and time.");
      return false;
    }

    if (sectionIndex === 6 && !formData.timeline) {
      toast.error("Please select a purchase timeline.");
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (!validateSection(currentSection)) return;
    if (currentSection < sections.length - 1) setCurrentSection(currentSection + 1);
  };

  const handleBack = () => {
    if (currentSection > 0) setCurrentSection(currentSection - 1);
  };

  const handleSubmit = async () => {
    if (!validateSection(0) || !validateSection(1) || !validateSection(2) || !validateSection(6)) return;

    setIsSubmitting(true);
    try {
      const appointments = appointmentDraft.title && appointmentDraft.date && appointmentDraft.time
        ? [appointmentDraft]
        : [];

      const response = await fetch(apiUrl("/api/customers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          budget: parseInt(formData.budget, 10),
          inventoryPush: formData.inventoryPush,
          inventoryNotes: formData.inventoryNotes,
          stageFeedbacks,
          appointments,
          assignedSalespersonId: formData.assignedSalespersonId || selectedSalesperson?.id?.toString() || "",
          assignedSalesperson: selectedSalesperson,
        }),
      });

      if (response.ok) {
        const customer = await response.json();
        setShowSuccess(true);
        toast.success("Customer checked in successfully!");
        setTimeout(() => navigate(`/journey/${customer.id}`), 2000);
      } else {
        toast.error("Failed to check in customer");
      }
    } catch {
      toast.error("Failed to check in customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex h-full items-center justify-center p-6"
      >
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-green-100 dark:bg-green-900"
            >
              <CheckCircle className="h-12 w-12 text-green-600 dark:text-green-400" />
            </motion.div>
            <h2 className="mb-2 text-2xl font-bold">Check-in Successful!</h2>
            <p className="text-muted-foreground">Redirecting to customer journey...</p>
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
        <h1 className="text-3xl font-bold">Customer Check-In</h1>
        <p className="text-muted-foreground">Register a new customer visit</p>
      </div>

      <div className="flex items-center justify-center gap-2">
        {sections.map((section, index) => {
          const Icon = section.icon;
          const isActive = index === currentSection;
          const isCompleted = index < currentSection;
          return (
            <div key={section.id} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 transition-colors ${
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCompleted
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              {index < sections.length - 1 && <div className={`h-0.5 w-16 ${isCompleted ? "bg-primary" : "bg-border"}`} />}
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {(() => {
              const SectionIcon = sections[currentSection].icon;
              return <SectionIcon className="h-5 w-5 text-primary" />;
            })()}
            {sections[currentSection].title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSection}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {currentSection === 0 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Enter customer name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="customer@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesperson">Assigned Salesperson</Label>
                    <select
                      id="salesperson"
                      value={formData.assignedSalespersonId}
                      onChange={(e) => setFormData({ ...formData, assignedSalespersonId: e.target.value })}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Auto-assign best match</option>
                      {salespeople?.map((salesperson) => (
                        <option key={salesperson.id} value={salesperson.id}>{salesperson.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {currentSection === 1 && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle">Preferred Vehicle *</Label>
                    <select
                      id="vehicle"
                      value={formData.preferredVehicle}
                      onChange={(e) => setFormData({ ...formData, preferredVehicle: e.target.value })}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select a vehicle</option>
                      {vehicles?.map((v) => (
                        <option key={v.id} value={v.name}>
                          {v.name} - {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v.priceRange[0])} - {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v.priceRange[1])}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchaseIntent">What the customer wants to buy</Label>
                    <textarea
                      id="purchaseIntent"
                      value={formData.purchaseIntent}
                      onChange={(e) => setFormData({ ...formData, purchaseIntent: e.target.value })}
                      placeholder="Example: family SUV, budget-friendly, strong mileage, finance needed"
                      rows={3}
                      className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="buyingPurpose">Why the customer wants to buy</Label>
                    <select
                      id="buyingPurpose"
                      value={formData.buyingPurpose}
                      onChange={(e) => setFormData({ ...formData, buyingPurpose: e.target.value })}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select reason</option>
                      <option value="Family use">Family use</option>
                      <option value="Daily commute">Daily commute</option>
                      <option value="Upgrade">Upgrade</option>
                      <option value="First car">First car</option>
                      <option value="Business use">Business use</option>
                      <option value="Gift">Gift</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="colorPreference">Color preference</Label>
                    <select
                      id="colorPreference"
                      value={formData.colorPreference}
                      onChange={(e) => setFormData({ ...formData, colorPreference: e.target.value })}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select color</option>
                      <option value="White">White</option>
                      <option value="Black">Black</option>
                      <option value="Silver">Silver</option>
                      <option value="Red">Red</option>
                      <option value="Blue">Blue</option>
                      <option value="Grey">Grey</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>What matters most</Label>
                    <div className="grid grid-cols-2 gap-2">
                      {featureOptions.map((feature) => {
                        const checked = formData.featurePriorities.includes(feature);
                        return (
                          <button
                            key={feature}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                featurePriorities: checked
                                  ? formData.featurePriorities.filter((item) => item !== feature)
                                  : [...formData.featurePriorities, feature],
                              })
                            }
                            className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                              checked ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-accent"
                            }`}
                          >
                            {feature}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="budget">Budget (₹) *</Label>
                    <Input id="budget" type="number" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} placeholder="Enter budget amount" />
                  </div>
                </>
              )}

              {currentSection === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicleReaction">How did the customer react to the vehicle?</Label>
                    <select id="vehicleReaction" value={formData.vehicleReaction} onChange={(e) => setFormData({ ...formData, vehicleReaction: e.target.value })} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Select reaction</option>
                      {reactionOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comfortReaction">How did the customer react to comfort and interior?</Label>
                    <select id="comfortReaction" value={formData.comfortReaction} onChange={(e) => setFormData({ ...formData, comfortReaction: e.target.value })} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Select comfort reaction</option>
                      {comfortOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceReaction">How did the customer react to price or finance?</Label>
                    <select id="priceReaction" value={formData.priceReaction} onChange={(e) => setFormData({ ...formData, priceReaction: e.target.value })} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Select price reaction</option>
                      {priceOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="followUpIntent">What should happen next?</Label>
                    <select id="followUpIntent" value={formData.followUpIntent} onChange={(e) => setFormData({ ...formData, followUpIntent: e.target.value })} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <option value="">Select next step</option>
                      {followUpOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salesReview">Sales review notes</Label>
                    <textarea
                      id="salesReview"
                      value={formData.salesReview}
                      onChange={(e) => setFormData({ ...formData, salesReview: e.target.value })}
                      placeholder="Summarize what the customer liked, disliked, asked about, and what the sales team should remember."
                      rows={3}
                      className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label>Customer feedback</Label>
                    {stageFeedbacks.map((item, index) => (
                      <details key={item.stage} className="rounded-xl border border-border bg-muted/50 p-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold">{item.stage}</p>
                            <p className="text-xs text-muted-foreground">Phase {index + 1}</p>
                          </div>
                          <span className="text-xs text-muted-foreground">Tap to expand</span>
                        </summary>
                        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`customerFeedback-${item.stage}`}>Customer feedback</Label>
                            <select
                              id={`customerFeedback-${item.stage}`}
                              value={item.customerFeedback}
                              onChange={(e) =>
                                setStageFeedbacks((prev) =>
                                  prev.map((entry) => (entry.stage === item.stage ? { ...entry, customerFeedback: e.target.value } : entry))
                                )
                              }
                              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="">Select feedback</option>
                              {stageCustomerFeedbackOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`salespersonResponse-${item.stage}`}>Salesman answer</Label>
                            <select
                              id={`salespersonResponse-${item.stage}`}
                              value={item.salespersonResponse}
                              onChange={(e) =>
                                setStageFeedbacks((prev) =>
                                  prev.map((entry) => (entry.stage === item.stage ? { ...entry, salespersonResponse: e.target.value } : entry))
                                )
                              }
                              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="">Select response</option>
                              {stageResponseOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`nextStep-${item.stage}`}>Next step</Label>
                            <select
                              id={`nextStep-${item.stage}`}
                              value={item.nextStep}
                              onChange={(e) =>
                                setStageFeedbacks((prev) =>
                                  prev.map((entry) => (entry.stage === item.stage ? { ...entry, nextStep: e.target.value } : entry))
                                )
                              }
                              className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="">Select next step</option>
                              {stageNextStepOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`stageNotes-${item.stage}`}>Notes</Label>
                            <textarea
                              id={`stageNotes-${item.stage}`}
                              value={item.notes}
                              onChange={(e) =>
                                setStageFeedbacks((prev) =>
                                  prev.map((entry) => (entry.stage === item.stage ? { ...entry, notes: e.target.value } : entry))
                                )
                              }
                              placeholder="Add the exact conversation or concern raised at this stage."
                              rows={3}
                              className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </div>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {currentSection === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Select vehicles to push from inventory</Label>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      {inventoryOptions.map((vehicle) => {
                        const checked = formData.inventoryPush.includes(vehicle.name);
                        return (
                          <button
                            key={vehicle.id}
                            type="button"
                            onClick={() =>
                              setFormData({
                                ...formData,
                                inventoryPush: checked
                                  ? formData.inventoryPush.filter((item) => item !== vehicle.name)
                                  : [...formData.inventoryPush, vehicle.name],
                              })
                            }
                            className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                              checked ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-accent"
                            }`}
                          >
                            <div className="font-medium">{vehicle.name}</div>
                            <div className="text-xs text-muted-foreground">{vehicle.type}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="inventoryNotes">Inventory notes</Label>
                    <textarea
                      id="inventoryNotes"
                      value={formData.inventoryNotes}
                      onChange={(e) => setFormData({ ...formData, inventoryNotes: e.target.value })}
                      placeholder="Why these vehicles should be pushed to the customer."
                      rows={4}
                      className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              )}

              {currentSection === 4 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="apptTitle">Appointment title</Label>
                      <Input id="apptTitle" value={appointmentDraft.title} onChange={(e) => setAppointmentDraft({ ...appointmentDraft, title: e.target.value })} placeholder="Follow-up call" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apptDate">Date</Label>
                      <Input id="apptDate" type="date" value={appointmentDraft.date} onChange={(e) => setAppointmentDraft({ ...appointmentDraft, date: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="apptTime">Time</Label>
                      <Input id="apptTime" type="time" value={appointmentDraft.time} onChange={(e) => setAppointmentDraft({ ...appointmentDraft, time: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="apptNotes">Notes</Label>
                      <textarea
                        id="apptNotes"
                        value={appointmentDraft.notes}
                        onChange={(e) => setAppointmentDraft({ ...appointmentDraft, notes: e.target.value })}
                        rows={4}
                        placeholder="Add the appointment reason or follow-up context."
                        className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      />
                    </div>
                  </div>
                </div>
              )}

              {currentSection === 5 && (
                <>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="finance" checked={formData.financeRequired} onChange={(e) => setFormData({ ...formData, financeRequired: e.target.checked })} className="h-4 w-4 rounded border-border" />
                    <Label htmlFor="finance" className="cursor-pointer">Finance Required</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="tradein" checked={formData.tradeIn} onChange={(e) => setFormData({ ...formData, tradeIn: e.target.checked })} className="h-4 w-4 rounded border-border" />
                    <Label htmlFor="tradein" className="cursor-pointer">Has Trade-in Vehicle</Label>
                  </div>
                </>
              )}

              {currentSection === 6 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Timeline & Notes</h3>
                  <div className="space-y-2">
                    <Label htmlFor="timeline">Purchase Timeline *</Label>
                    <select
                      id="timeline"
                      value={formData.timeline}
                      onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select timeline</option>
                      <option value="Immediate">Immediate</option>
                      <option value="Within 1 week">Within 1 week</option>
                      <option value="Within 1 month">Within 1 month</option>
                      <option value="Just browsing">Just browsing</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes about the customer..."
                      rows={4}
                      className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>
              )}

              {currentSection === 7 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Review Customer Details</h3>
                  <div className="space-y-2 rounded-xl border border-border bg-muted/50 p-4">
                    <p><strong>Name:</strong> {formData.name}</p>
                    <p><strong>Phone:</strong> {formData.phone}</p>
                    <p><strong>Email:</strong> {formData.email || "N/A"}</p>
                    <p><strong>Vehicle:</strong> {formData.preferredVehicle}</p>
                    <p><strong>Buy Brief:</strong> {formData.purchaseIntent || "None"}</p>
                    <p><strong>Buy Reason:</strong> {formData.buyingPurpose || "None"}</p>
                    <p><strong>Color:</strong> {formData.colorPreference || "None"}</p>
                    <p><strong>Top Priorities:</strong> {formData.featurePriorities.length ? formData.featurePriorities.join(", ") : "None"}</p>
                    <p><strong>Vehicle Reaction:</strong> {formData.vehicleReaction || "None"}</p>
                    <p><strong>Comfort Reaction:</strong> {formData.comfortReaction || "None"}</p>
                    <p><strong>Price Reaction:</strong> {formData.priceReaction || "None"}</p>
                    <p><strong>Follow-up Intent:</strong> {formData.followUpIntent || "None"}</p>
                    <p><strong>Sales Review:</strong> {formData.salesReview || "None"}</p>
                    <p><strong>Inventory Push:</strong> {formData.inventoryPush.length ? formData.inventoryPush.join(", ") : "None"}</p>
                    <p><strong>Inventory Notes:</strong> {formData.inventoryNotes || "None"}</p>
                    <p><strong>Appointment:</strong> {appointmentDraft.title ? `${appointmentDraft.title} on ${appointmentDraft.date} at ${appointmentDraft.time}` : "None"}</p>
                    <p><strong>Budget:</strong> ₹{parseInt(formData.budget, 10).toLocaleString("en-IN")}</p>
                    <p><strong>Salesperson:</strong> {selectedSalesperson?.name || "Auto-assigned"}</p>
                    <p><strong>Finance:</strong> {formData.financeRequired ? "Yes" : "No"}</p>
                    <p><strong>Trade-in:</strong> {formData.tradeIn ? "Yes" : "No"}</p>
                    <p><strong>Timeline:</strong> {formData.timeline}</p>
                    <p><strong>Notes:</strong> {formData.notes || "None"}</p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={handleBack} disabled={currentSection === 0}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {currentSection < sections.length - 1 ? (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Complete Check-in"}
                <CheckCircle className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
