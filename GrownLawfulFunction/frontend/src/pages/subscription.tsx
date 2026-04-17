import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, Zap, Star, Check, Minus } from "lucide-react";

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Star,
  pro: Zap,
  elite: Crown,
};

const PLAN_COLORS: Record<string, { border: string; glow: string; badge: string }> = {
  free:  { border: "border-muted", glow: "", badge: "bg-muted text-muted-foreground" },
  pro:   { border: "border-blue-500/50", glow: "shadow-blue-500/10 shadow-lg", badge: "bg-blue-500/20 text-blue-400" },
  elite: { border: "border-secondary/60", glow: "shadow-secondary/10 shadow-lg", badge: "bg-secondary/20 text-secondary" },
};

const FEATURE_LABELS: Record<string, string> = {
  predictions:          "Match Predictions",
  basic_history:        "Prediction History",
  advanced_analytics:   "Advanced Analytics",
  ai_insights:          "Multi-Agent AI Insights",
  accumulator_builder:  "Accumulator Builder",
  model_breakdown:      "Model Breakdown",
  telegram_alerts:      "Telegram Alerts",
  bankroll_tools:       "Bankroll Tools",
  csv_upload:           "CSV Data Upload",
  priority_support:     "Priority Support",
};

interface Plan {
  name: string;
  display_name: string;
  price_monthly: number;
  price_yearly: number;
  features: Record<string, boolean>;
  description: string;
  limits: { predictions_per_day: number | null; history_rows: number | null };
}

export default function SubscriptionPage() {
  const qc = useQueryClient();
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { data: plansData, isLoading: loadingPlans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: () => apiGet<{ plans: Plan[] }>("/subscription/plans"),
  });

  const { data: myPlanData, isLoading: loadingMyPlan } = useQuery({
    queryKey: ["my-plan"],
    queryFn: () => apiGet<{ plan: Plan; subscription: unknown; usage: { predictions_today: number; limit_today: number | null } }>("/subscription/my-plan"),
  });

  const upgradeMutation = useMutation({
    mutationFn: (plan: string) => apiPost("/subscription/upgrade", { plan }),
    onSuccess: (_, plan) => {
      setMessage(`Successfully upgraded to ${plan} plan!`);
      setError("");
      qc.invalidateQueries({ queryKey: ["my-plan"] });
    },
    onError: (err: Error) => {
      setError(err.message);
      setMessage("");
    },
    onSettled: () => setUpgrading(null),
  });

  const handleUpgrade = (plan: string) => {
    setUpgrading(plan);
    setMessage("");
    setError("");
    upgradeMutation.mutate(plan);
  };

  const plans = plansData?.plans || [];
  const currentPlan = myPlanData?.plan?.name || "free";
  const usage = myPlanData?.usage;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-mono font-bold uppercase tracking-tight">Subscription Plans</h1>
        <p className="text-muted-foreground font-mono text-sm">Unlock the full power of VIT Sports Intelligence.</p>
      </div>

      {usage && (
        <div className="flex flex-wrap gap-4 p-4 bg-card/50 border border-border rounded-lg font-mono text-sm">
          <span className="text-muted-foreground">Current plan: <span className="text-primary font-bold uppercase">{currentPlan}</span></span>
          <span className="text-muted-foreground">Today: <span className="text-foreground font-bold">{usage.predictions_today}/{usage.limit_today ?? "∞"} predictions</span></span>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-destructive font-mono text-sm">
          ⚠ {error}
        </div>
      )}
      {message && (
        <div className="p-3 rounded-lg border border-primary/40 bg-primary/10 text-primary font-mono text-sm">
          ✓ {message}
        </div>
      )}

      {loadingPlans ? (
        <div className="text-muted-foreground font-mono text-center py-12">Loading plans...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const colors = PLAN_COLORS[plan.name] || PLAN_COLORS.free;
            const Icon = PLAN_ICONS[plan.name] || Star;
            const isCurrent = currentPlan === plan.name;
            const isUpgrade = ["free", "pro", "elite"].indexOf(plan.name) > ["free", "pro", "elite"].indexOf(currentPlan);

            return (
              <Card
                key={plan.name}
                className={`bg-card/50 backdrop-blur flex flex-col relative ${colors.border} ${colors.glow} ${isCurrent ? "ring-1 ring-primary/40" : ""}`}
              >
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-primary text-primary-foreground font-mono text-xs">ACTIVE PLAN</Badge>
                  </div>
                )}
                {plan.name === "pro" && !isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <Badge className="bg-blue-500 text-white font-mono text-xs">MOST POPULAR</Badge>
                  </div>
                )}

                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${plan.name === "elite" ? "text-secondary" : plan.name === "pro" ? "text-blue-400" : "text-muted-foreground"}`} />
                    <CardTitle className="font-mono font-bold uppercase tracking-wider">{plan.display_name}</CardTitle>
                  </div>
                  <p className="text-muted-foreground font-mono text-xs">{plan.description}</p>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold font-mono">
                        {plan.price_monthly === 0 ? "Free" : `$${plan.price_monthly}`}
                      </span>
                      {plan.price_monthly > 0 && (
                        <span className="text-muted-foreground text-sm font-mono">/mo</span>
                      )}
                    </div>
                    {plan.price_monthly > 0 && (
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        or ${plan.price_yearly}/yr (save {Math.round((1 - plan.price_yearly / (plan.price_monthly * 12)) * 100)}%)
                      </p>
                    )}
                  </div>

                  <div className="rounded-md bg-background/50 p-2 text-xs font-mono">
                    {plan.limits.predictions_per_day != null
                      ? <span className="text-muted-foreground">{plan.limits.predictions_per_day} predictions/day</span>
                      : <span className="text-primary">∞ Unlimited predictions</span>
                    }
                  </div>

                  <div className="space-y-1.5">
                    {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                      const included = plan.features?.[key];
                      return (
                        <div key={key} className="flex items-center gap-2 text-xs font-mono">
                          {included
                            ? <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                            : <Minus className="w-3.5 h-3.5 text-muted-foreground/30 flex-shrink-0" />
                          }
                          <span className={included ? "text-foreground" : "text-muted-foreground/50"}>{label}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2">
                    {isCurrent ? (
                      <div className="text-center py-2 text-xs font-mono text-primary border border-primary/30 rounded-md">
                        ✓ Your current plan
                      </div>
                    ) : isUpgrade ? (
                      <Button
                        className="w-full font-mono text-xs"
                        variant={plan.name === "elite" ? "secondary" : "default"}
                        onClick={() => handleUpgrade(plan.name)}
                        disabled={upgrading === plan.name}
                      >
                        {upgrading === plan.name ? "Upgrading..." : `Upgrade to ${plan.display_name}`}
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="p-4 rounded-lg bg-card/30 border border-secondary/20 font-mono text-xs text-muted-foreground">
        <span className="text-secondary font-bold">PAYMENT:</span> Stripe integration ready. Once connected, you'll be charged monthly and can cancel anytime.
      </div>
    </div>
  );
}
