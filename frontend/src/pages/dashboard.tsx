import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, TrendingUp, Activity, Coins, ArrowUpRight, ArrowDownRight, Clock, Globe, Users, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

function StatCardSkeleton() {
  return (
    <Card className="bg-card/50 backdrop-blur border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-4 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

function MiniStatSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-card/30 p-3 flex items-center justify-between">
      <div className="space-y-1">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-5 w-12" />
      </div>
      <Skeleton className="h-4 w-4 rounded" />
    </div>
  );
}

function MetricBoxSkeleton() {
  return (
    <div className="bg-background/50 rounded-lg p-4 border border-border">
      <Skeleton className="h-2.5 w-24 mb-2" />
      <Skeleton className="h-7 w-20" />
    </div>
  );
}

function ActivityItemSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="h-7 w-7 rounded flex-shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: summary, isLoading: isLoadingSummary } = useQuery<any>({
    queryKey: ["dashboard-summary"],
    queryFn: () => apiGet<any>("/api/dashboard/summary"),
    refetchInterval: 30_000,
  });

  const { data: price, isLoading: isLoadingPrice } = useQuery<any>({
    queryKey: ["dashboard-price"],
    queryFn: () => apiGet<any>("/api/dashboard/vitcoin-price"),
    refetchInterval: 60_000,
  });

  const { data: activity, isLoading: isLoadingActivity } = useQuery<any[]>({
    queryKey: ["dashboard-activity"],
    queryFn: () => apiGet<any[]>("/api/dashboard/recent-activity"),
    refetchInterval: 30_000,
  });

  const { data: system, isLoading: isLoadingSystem } = useQuery<any>({
    queryKey: ["dashboard-system"],
    queryFn: () => apiGet<any>("/system/status"),
    refetchInterval: 60_000,
  });

  const activityList = Array.isArray(activity) ? activity : [];
  const change24h = price?.change_24h ?? 0;

  const isLoadingCards = isLoadingSummary || isLoadingPrice;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-mono font-bold uppercase tracking-tight">Command Center</h1>
        <p className="text-muted-foreground font-mono text-sm flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          System operational. Live feeds active — refreshing every 30s.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingCards ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <Card className="bg-card/50 backdrop-blur border-primary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-mono uppercase font-medium text-muted-foreground">Accuracy Rate</CardTitle>
                <Trophy className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">
                  {((summary?.accuracy_rate ?? 0) * 100).toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Over {summary?.total_predictions ?? 0} predictions
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-secondary/20">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-mono uppercase font-medium text-muted-foreground">VITCoin Balance</CardTitle>
                <Coins className="h-4 w-4 text-secondary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono text-secondary">
                  {Number(summary?.wallet_balance ?? 0).toLocaleString()} VIT
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">Multi-currency wallet active</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-mono uppercase font-medium text-muted-foreground">Active Matches</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{summary?.active_matches ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1 font-mono">Awaiting settlement</p>
              </CardContent>
            </Card>

            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-mono uppercase font-medium text-muted-foreground">VIT Price</CardTitle>
                <TrendingUp className={`h-4 w-4 ${change24h >= 0 ? "text-primary" : "text-destructive"}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">${Number(price?.price ?? 0.001).toFixed(6)}</div>
                <p className={`text-xs mt-1 font-mono flex items-center ${change24h >= 0 ? "text-primary" : "text-destructive"}`}>
                  {change24h >= 0
                    ? <ArrowUpRight className="w-3 h-3 mr-1" />
                    : <ArrowDownRight className="w-3 h-3 mr-1" />}
                  {Math.abs(change24h).toFixed(4)}% (24h)
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Mini stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {isLoadingSystem ? (
          <>
            <MiniStatSkeleton />
            <MiniStatSkeleton />
            <MiniStatSkeleton />
            <MiniStatSkeleton />
          </>
        ) : system ? (
          [
            { label: "Total Users",      value: system.users?.total ?? 0,                              icon: Users,      color: "text-foreground" },
            { label: "Active (30d)",     value: system.users?.active_30d ?? 0,                         icon: Activity,   color: "text-primary" },
            { label: "Validators",       value: system.users?.validators ?? 0,                         icon: ShieldCheck,color: "text-secondary" },
            { label: "Platform Volume",  value: `$${Number(system.economy?.platform_volume ?? 0).toFixed(0)}`, icon: Globe, color: "text-foreground" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-lg border border-border/50 bg-card/30 p-3 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-muted-foreground uppercase mb-0.5">{label}</div>
                <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
              </div>
              <Icon className={`w-4 h-4 ${color} opacity-60`} />
            </div>
          ))
        ) : null}
      </div>

      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-card/50 backdrop-blur border-border">
          <CardHeader>
            <CardTitle className="font-mono uppercase">Performance Metrics</CardTitle>
            <CardDescription className="font-mono">Prediction intelligence summary</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSummary || isLoadingSystem ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => <MetricBoxSkeleton key={i} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Total Predictions</div>
                  <div className="text-2xl font-bold font-mono">{summary?.total_predictions ?? 0}</div>
                </div>
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Accuracy</div>
                  <div className="text-2xl font-bold font-mono text-primary">
                    {((summary?.accuracy_rate ?? 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <div className="text-xs font-mono text-muted-foreground uppercase mb-2">ROI</div>
                  <div className={`text-2xl font-bold font-mono ${(summary?.roi ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
                    {(summary?.roi ?? 0) >= 0 ? "+" : ""}{Number(summary?.roi ?? 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Total Staked VIT</div>
                  <div className="text-lg font-bold font-mono text-secondary">
                    {Number(system?.economy?.total_staked_vit ?? 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <div className="text-xs font-mono text-muted-foreground uppercase mb-2">Net Profit</div>
                  <div className={`text-lg font-bold font-mono ${(system?.economy?.total_profit ?? 0) >= 0 ? "text-primary" : "text-destructive"}`}>
                    {(system?.economy?.total_profit ?? 0) >= 0 ? "+" : ""}
                    ${Number(system?.economy?.total_profit ?? 0).toFixed(2)}
                  </div>
                </div>
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <div className="text-xs font-mono text-muted-foreground uppercase mb-2">VITCoin Price</div>
                  <div className="text-lg font-bold font-mono">
                    ${Number(price?.price ?? 0).toFixed(8)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border flex flex-col">
          <CardHeader>
            <CardTitle className="font-mono uppercase">System Event Log</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {isLoadingActivity ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <ActivityItemSkeleton key={i} />)}
              </div>
            ) : activityList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <div className="rounded-full border border-border/50 bg-muted/30 p-3">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-mono text-muted-foreground">No events yet</p>
                  <p className="text-xs font-mono text-muted-foreground/60 mt-1">
                    Events appear here as predictions are made
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {activityList.map((act) => (
                  <div key={act.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 p-1.5 rounded bg-muted/50 flex-shrink-0">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="leading-none font-mono text-xs truncate">
                        <span className="text-muted-foreground">{act.description}</span>
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono flex-wrap">
                        <span>{format(new Date(act.created_at), "HH:mm:ss")}</span>
                        {act.bet_side && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-[9px] uppercase px-1">{act.bet_side}</Badge>
                          </>
                        )}
                        {act.outcome && (
                          <>
                            <span>•</span>
                            <Badge
                              variant={act.outcome === act.bet_side ? "default" : "destructive"}
                              className="text-[9px] uppercase px-1"
                            >
                              {act.outcome === act.bet_side ? "WIN" : "LOSS"}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
