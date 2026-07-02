import { CheckCircle, Clock, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { JourneyEvent } from "@/types";

interface TimelineProps {
  events: JourneyEvent[];
  className?: string;
}

export function Timeline({ events, className }: TimelineProps) {
  const stages = [
    "Checked In",
    "Assigned to Salesperson",
    "Vehicle Viewed",
    "Test Drive",
    "Finance Discussion",
    "Quotation Given",
    "Converted",
    "Lost",
  ];

  return (
    <div className={cn("space-y-4", className)}>
      {stages.map((stage,) => {
        const event = events.find((e) => e.stage === stage);
        const status = event?.status || "pending";
        const isDone = status === "done";
        const isActive = status === "active";

        return (
          <div key={stage} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2",
                  isDone
                    ? "border-primary bg-primary text-primary-foreground"
                    : isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground"
                )}
              >
                {isDone ? (
                  <CheckCircle className="h-4 w-4" />
                ) : isActive ? (
                  <Clock className="h-4 w-4" />
                ) : (
                  <Circle className="h-4 w-4" />
                )}
              </div>
              {stage !== stages[stages.length - 1] && (
                <div
                  className={cn(
                    "w-0.5 flex-1",
                    isDone ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <h4 className={cn("font-medium", isActive && "text-primary")}>
                  {stage}
                </h4>
                {event?.timestamp && (
                  <span className="text-sm text-muted-foreground">
                    {new Date(event.timestamp).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
              {event?.note && (
                <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
