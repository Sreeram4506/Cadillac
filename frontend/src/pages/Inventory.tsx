import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Car, PlusCircle, ArrowRight, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Vehicle } from "@/types";
import { apiUrl } from "@/lib/api";

export default function Inventory() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    minPrice: "",
    maxPrice: "",
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/vehicles"));
      return response.json();
    },
  });

  const vehicleTypes = useMemo(() => {
    return Array.from(new Set((vehicles || []).map((vehicle) => vehicle.type))).sort();
  }, [vehicles]);

  const filteredVehicles =
    vehicles?.filter((vehicle) =>
      [vehicle.name, vehicle.type].some((value) => value.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.type.trim() || !formData.minPrice.trim() || !formData.maxPrice.trim()) {
      toast.error("Please fill in the vehicle name, type, and price range.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(apiUrl("/api/vehicles"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type.trim(),
          minPrice: Number(formData.minPrice),
          maxPrice: Number(formData.maxPrice),
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || "Failed to add vehicle");
      }

      const vehicle = await response.json();
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setFormData({ name: "", type: "", minPrice: "", maxPrice: "" });
      toast.success(`${vehicle.name} added to inventory.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add vehicle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 p-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Car className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Inventory</h1>
              <p className="text-muted-foreground">Add vehicles here and they will appear in check-in, feedback, copilot, and journey screens.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate("/check-in#inventory")}>
            Check-In Inventory
          </Button>
          <Button variant="outline" onClick={() => navigate("/customer-feedback")}>
            Customer Feedback
          </Button>
          <Button variant="outline" onClick={() => navigate("/journey")}>
            Journey
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-primary" />
              Add Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleName">Vehicle name</Label>
              <Input
                id="vehicleName"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="New model name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicleType">Type</Label>
              <Input
                id="vehicleType"
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                placeholder="SUV, Sedan, Hatchback"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="minPrice">Min price</Label>
                <Input
                  id="minPrice"
                  type="number"
                  value={formData.minPrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, minPrice: e.target.value }))}
                  placeholder="1200000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxPrice">Max price</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  value={formData.maxPrice}
                  onChange={(e) => setFormData((prev) => ({ ...prev, maxPrice: e.target.value }))}
                  placeholder="1500000"
                />
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
              {isSubmitting ? "Adding..." : "Add to Inventory"}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Inventory Vehicles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inventorySearch">Search inventory</Label>
              <Input
                id="inventorySearch"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by vehicle name or type"
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {vehicleTypes.map((type) => (
                <span key={type} className="rounded-full bg-muted px-3 py-1">
                  {type}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filteredVehicles.map((vehicle) => (
                <div key={vehicle.id} className="rounded-xl border border-border bg-muted/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{vehicle.name}</p>
                      <p className="text-sm text-muted-foreground">{vehicle.type}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                      #{vehicle.id}
                    </span>
                  </div>
                  <p className="mt-3 text-sm">
                    {formatCurrency(vehicle.priceRange[0])} - {formatCurrency(vehicle.priceRange[1])}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Available in check-in vehicle selection, customer feedback routing, copilot recommendations, and journey screens.
                  </p>
                </div>
              ))}
              {!filteredVehicles.length && (
                <p className="text-sm text-muted-foreground">No vehicles match your search.</p>
              )}
            </div>
            <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["vehicles"] })}>
              Refresh Vehicle List
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}
