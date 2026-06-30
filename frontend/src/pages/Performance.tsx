import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { Users, TrendingUp, Award, AlertCircle, X, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Salesperson } from "@/types";
import { apiUrl } from "@/lib/api";

type SortKey = "rank" | "name" | "customersHandled" | "conversionRate" | "testDrives" | "bookings" | "rating" | "aiScore";
type SortDirection = "asc" | "desc";

export default function Performance() {
  const [selectedSalesperson, setSelectedSalesperson] = useState<Salesperson | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("conversionRate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const { data: salespeople, isLoading } = useQuery<Salesperson[]>({
    queryKey: ["salesperson-performance"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/salesperson-performance"));
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-1 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  if (!salespeople) return null;

  const getNumericValue = (sp: Salesperson, key: SortKey, index: number) => {
    switch (key) {
      case "rank":
        return index + 1;
      case "name":
        return sp.name;
      case "customersHandled":
        return sp.customersHandled ?? 0;
      case "conversionRate":
        return sp.conversionRate ? parseFloat(sp.conversionRate) : 0;
      case "testDrives":
        return sp.testDrives ?? 0;
      case "bookings":
        return sp.bookings ?? 0;
      case "rating":
        return sp.rating ?? 0;
      case "aiScore":
        return sp.aiScore ?? 0;
      default:
        return 0;
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("desc");
  };

  const sortedSalespeople = [...salespeople].sort((a, b) => {
    const aIndex = salespeople.indexOf(a);
    const bIndex = salespeople.indexOf(b);
    const aValue = getNumericValue(a, sortKey, aIndex);
    const bValue = getNumericValue(b, sortKey, bIndex);

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortDirection === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    const numericA = typeof aValue === "string" ? 0 : aValue;
    const numericB = typeof bValue === "string" ? 0 : bValue;
    return sortDirection === "asc" ? numericA - numericB : numericB - numericA;
  });

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="ml-1 h-3.5 w-3.5" />;
    }

    return sortDirection === "asc"
      ? <ArrowUp className="ml-1 h-3.5 w-3.5" />
      : <ArrowDown className="ml-1 h-3.5 w-3.5" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 p-6"
    >
      <div>
        <h1 className="text-3xl font-bold">Salesperson Performance</h1>
        <p className="text-muted-foreground">Track and analyze team performance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Performance Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-3 text-left text-sm font-medium">
                    <button className="inline-flex items-center" onClick={() => handleSort("rank")}>
                      Rank {renderSortIcon("rank")}
                    </button>
                  </th>
                  <th className="pb-3 text-left text-sm font-medium">
                    <button className="inline-flex items-center" onClick={() => handleSort("name")}>
                      Salesperson {renderSortIcon("name")}
                    </button>
                  </th>
                  <th className="pb-3 text-left text-sm font-medium">
                    <button className="inline-flex items-center" onClick={() => handleSort("customersHandled")}>
                      Customers {renderSortIcon("customersHandled")}
                    </button>
                  </th>
                  <th className="pb-3 text-left text-sm font-medium">
                    <button className="inline-flex items-center" onClick={() => handleSort("conversionRate")}>
                      Conversion % {renderSortIcon("conversionRate")}
                    </button>
                  </th>
                  <th className="pb-3 text-left text-sm font-medium">
                    <button className="inline-flex items-center" onClick={() => handleSort("testDrives")}>
                      Test Drives {renderSortIcon("testDrives")}
                    </button>
                  </th>
                  <th className="pb-3 text-left text-sm font-medium">
                    <button className="inline-flex items-center" onClick={() => handleSort("bookings")}>
                      Bookings {renderSortIcon("bookings")}
                    </button>
                  </th>
                  <th className="pb-3 text-left text-sm font-medium">
                    <button className="inline-flex items-center" onClick={() => handleSort("rating")}>
                      Rating {renderSortIcon("rating")}
                    </button>
                  </th>
                  <th className="pb-3 text-left text-sm font-medium">
                    <button className="inline-flex items-center" onClick={() => handleSort("aiScore")}>
                      AI Score {renderSortIcon("aiScore")}
                    </button>
                  </th>
                  <th className="pb-3 text-left text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedSalespeople.map((sp, index) => (
                  <tr
                    key={sp.id}
                    className="cursor-pointer border-b border-border hover:bg-muted/50"
                    onClick={() => setSelectedSalesperson(sp)}
                  >
                    <td className="py-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full font-bold ${
                        index === 0 ? "bg-yellow-500 text-white" :
                        index === 1 ? "bg-gray-400 text-white" :
                        index === 2 ? "bg-orange-600 text-white" :
                        "bg-muted"
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {sp.avatar}
                        </div>
                        <span className="font-medium">{sp.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-sm">{sp.customersHandled}</td>
                    <td className="py-3 text-sm font-semibold">{sp.conversionRate}%</td>
                    <td className="py-3 text-sm">{sp.testDrives}</td>
                    <td className="py-3 text-sm">{sp.bookings}</td>
                    <td className="py-3 text-sm">{sp.rating} ⭐</td>
                    <td className="py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        sp.aiScore >= 90 ? "bg-green-100 text-green-800" :
                        sp.aiScore >= 80 ? "bg-yellow-100 text-yellow-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {sp.aiScore}
                      </span>
                    </td>
                    <td className="py-3">
                      <Button variant="outline" size="sm">View Profile</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence>
        {selectedSalesperson && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
            onClick={() => setSelectedSalesperson(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                        {selectedSalesperson.avatar}
                      </div>
                      <div>
                        <h2 className="text-2xl">{selectedSalesperson.name}</h2>
                        <p className="text-sm text-muted-foreground">Performance Profile</p>
                      </div>
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedSalesperson(null)}>
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 font-semibold">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Performance Trend (7 Days)
                    </h3>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={selectedSalesperson.performanceTrend?.map((val, i) => ({ day: `Day ${i + 1}`, value: val }))}>
                        <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" />
                        <YAxis stroke="hsl(var(--muted-foreground))" />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-green-500/50 bg-green-500/5 p-4">
                      <h4 className="mb-2 flex items-center gap-2 font-semibold text-green-700 dark:text-green-400">
                        <TrendingUp className="h-4 w-4" />
                        Strengths
                      </h4>
                      <p className="text-sm">{selectedSalesperson.strengths}</p>
                    </div>
                    <div className="rounded-xl border border-red-500/50 bg-red-500/5 p-4">
                      <h4 className="mb-2 flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
                        <AlertCircle className="h-4 w-4" />
                        Areas to Improve
                      </h4>
                      <p className="text-sm">{selectedSalesperson.weaknesses}</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-primary/50 bg-primary/5 p-4">
                    <h4 className="mb-2 flex items-center gap-2 font-semibold">
                      <Users className="h-4 w-4 text-primary" />
                      AI Coaching Tip
                    </h4>
                    <p className="text-sm">{selectedSalesperson.aiCoachingTip}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
                      <p className="text-2xl font-bold">{selectedSalesperson.conversionRate}%</p>
                      <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    </div>
                    <div className="rounded-xl border border-border bg-muted/50 p-4 text-center">
                      <p className="text-2xl font-bold">{selectedSalesperson.aiScore}</p>
                      <p className="text-sm text-muted-foreground">AI Score</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
