import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useAuth } from "@/context/AuthContext";

interface FormData {
  name: string;
  phone: string;
  email: string;
  preferredVehicle: string;
  purchaseIntent: string;
  buyingPurpose: string;
  colorPreference: string;
  featurePriorities: string[];
  budget: string;
  financeRequired: boolean;
  tradeIn: boolean;
  timeline: string;
  notes: string;
  assignedSalespersonId: string;
}

const sections = [
  { id: "identity", title: "Customer Identity", icon: User },
  { id: "vehicle", title: "Vehicle Requirement", icon: Car },
  { id: "requirements", title: "Requirements", icon: DollarSign },
  { id: "timeline", title: "Timeline & Notes", icon: Clock },
  { id: "review", title: "Review", icon: FileText },
];

export default function CheckIn() {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const [currentSection, setCurrentSection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    phone: "",
    email: "",
    preferredVehicle: "",
    purchaseIntent: "",
    buyingPurpose: "",
    colorPreference: "",
    featurePriorities: [],
    budget: "",
    financeRequired: false,
    tradeIn: false,
    timeline: "",
    notes: "",
    assignedSalespersonId: "",
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentSection]);

  const { data: salespeopleRaw } = useQuery<Salesperson[]>({
    queryKey: ["salespeople"],
    enabled: Boolean(user) && !isLoading,
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/salespeople"));
      if (!response.ok) throw new Error(`Failed to load salespeople (${response.status})`);
      return response.json();
    },
  });

  const salespeople: Salesperson[] = Array.isArray(salespeopleRaw) ? salespeopleRaw : [];

  const { data: vehiclesRaw } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    enabled: Boolean(user) && !isLoading,
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/vehicles"));
      if (!response.ok) throw new Error(`Failed to load vehicles (${response.status})`);
      return response.json();
    },
  });

  const vehicles: Vehicle[] = Array.isArray(vehiclesRaw) ? vehiclesRaw : [];

  const selectedSalesperson =
    salespeople.find((sp) => sp.id === Number(formData.assignedSalespersonId)) ||
    salespeople[0] ||
    null;

  const featureOptions = ["Mileage", "Boot Space", "Safety", "Comfort", "Technology", "Low Maintenance"];

  const validateSection = (sectionIndex: number) => {
    if (sectionIndex === 0 && (!formData.name.trim() || !formData.phone.trim())) {
      toast.error("Name and phone are required before continuing.");
      return false;
    }

    if (sectionIndex === 1 && (!formData.preferredVehicle || !formData.budget.trim())) {
      toast.error("Please choose a vehicle and enter a budget.");
      return false;
    }

    if (sectionIndex === 3 && !formData.timeline) {
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
    if (!validateSection(0) || !validateSection(1) || !validateSection(3)) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(apiUrl("/api/customers"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          budget: parseInt(formData.budget, 10),
          assignedSalespersonId: formData.assignedSalespersonId || selectedSalesperson?.id?.toString() || "",
          assignedSalesperson: selectedSalesperson,
        }),
      });

      if (response.ok) {
        const customer = await response.json();
        setShowSuccess(true);
        toast.success("Customer checked in successfully!");
        setTimeout(() => navigate(`/customer-feedback?customerId=${customer.id}`), 2000);
      } else {
        toast.error("Failed to check in customer");
      }
    } catch {
      toast.error("Failed to check in customer");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        Please sign in to continue.
      </div>
    );
  }

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
            <p className="text-muted-foreground">Redirecting to customer feedback...</p>
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
        <p className="text-muted-foreground">Capture the customer and their requirements before feedback starts.</p>
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
                    <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1 (XXX) XXX-XXXX" />
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
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purchaseIntent">What the customer wants</Label>
                    <textarea
                      id="purchaseIntent"
                      value={formData.purchaseIntent}
                      onChange={(e) => setFormData({ ...formData, purchaseIntent: e.target.value })}
                      placeholder="Example: family SUV, budget-friendly, strong mileage"
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
                </>
              )}

              {currentSection === 2 && (
                <>
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
                  <div className="flex flex-wrap gap-4 pt-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.financeRequired}
                        onChange={(e) => setFormData({ ...formData, financeRequired: e.target.checked })}
                      />
                      Finance Required
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={formData.tradeIn}
                        onChange={(e) => setFormData({ ...formData, tradeIn: e.target.checked })}
                      />
                      Trade-in
                    </label>
                  </div>
                </>
              )}

              {currentSection === 3 && (
                <>
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
                </>
              )}

              {currentSection === 4 && (
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
                    <p><strong>Budget:</strong> ${parseInt(formData.budget || "0", 10).toLocaleString("en-US")}</p>
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
