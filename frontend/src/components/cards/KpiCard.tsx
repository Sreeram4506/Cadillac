import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface KpiCardProps {
  title: string;
  value: number | string;
  delta: number;
  trend: number[];
  format?: "number" | "currency" | "percentage";
  className?: string;
}

export function KpiCard({ title, value, delta, trend, format = "number", className }: KpiCardProps) {
  const formatValue = (val: number | string) => {
    if (typeof val === "string") return val;
    
    switch (format) {
      case "currency":
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(val);
      case "percentage":
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString();
    }
  };

  const DeltaIcon = delta > 0 ? ArrowUp : delta < 0 ? ArrowDown : Minus;
  const deltaColor = delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{formatValue(value)}</p>
            <div className={cn("flex items-center text-sm", deltaColor)}>
              <DeltaIcon className="mr-1 h-4 w-4" />
              <span>{Math.abs(delta).toFixed(1)}%</span>
              <span className="text-muted-foreground ml-1">vs yesterday</span>
            </div>
          </div>
          <div className="h-16 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend.map((val) => ({ value: val }))}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
