import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth";
import { Link, Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users, ShieldCheck, Activity, FileText, Cpu, ExternalLink,
  Globe, Server, Lock, Layout, Zap, Database, ArrowRight,
  Key, Coins, Bot, BarChart2, ShoppingBag, Shield, ArrowLeftRight,
  Code2, Vote, CreditCard, BookOpen, CheckSquare, Home,
} from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: string;
  accuracy_rate: number;
  total_predictions: number;
  vitcoin_balance: number;
  created_at: string;
}

interface AuditLog {
  id: number;
  action: string;
  actor: string;
  resource: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  status: string;
  timestamp: string;
}

interface AdminStats {
  users: number;
  matches: number;
  predictions: number;
  training_jobs: number;
  audit_entries: number;
  recent_activity: { action: string; actor: string; status: string; timestamp: string }[];
}

const FRONTEND_ROUTES = [
  { path: "/dashboard",   label: "Dashboard",     icon: Home,          desc: "Main KPIs, activity feed, VITCoin price" },
  { path: "/matches",     label: "Matches",        icon: Activity,      desc: "Upcoming fixtures & scheduled matches" },
  { path: "/predictions", label: "Predictions",    icon: CheckSquare,   desc: "Prediction history & model outputs" },
  { path: "/wallet",      label: "Wallet",         icon: Coins,         desc: "Multi-currency balances & transactions" },
  { path: "/validators",  label: "Validators",     icon: ShieldCheck,   desc: "Blockchain consensus validators & staking" },
  { path: "/training",    label: "Training",       icon: BookOpen,      desc: "ML model training jobs & uploads" },
  { path: "/analytics",   label: "Analytics",      icon: BarChart2,     desc: "System metrics, P&L, leaderboards" },
  { path: "/marketplace", label: "Marketplace",    icon: ShoppingBag,   desc: "AI model marketplace with VITCoin billing" },
  { path: "/trust",       label: "Trust & Safety", icon: Shield,        desc: "Fraud detection & composite trust scores" },
  { path: "/bridge",      label: "Bridge",         icon: ArrowLeftRight,desc: "Cross-chain VIT ↔ USDT/ETH bridge" },
  { path: "/developer",   label: "Developer",      icon: Code2,         desc: "API key management & SDK docs" },
  { path: "/governance",  label: "Governance",     icon: Vote,          desc: "Proposals, voting & timelock execution" },
  { path: "/subscription",label: "Subscription",   icon: CreditCard,    desc: "Plan tiers, upgrades & billing" },
  { path: "/admin",       label: "Admin Panel",    icon: Lock,          desc: "This page — system management" },
];

const API_ROUTE_GROUPS = [
  {
    group: "Auth",
    icon: Lock,
    color: "text-cyan-400",
    routes: [
      { method: "POST", path: "/auth/register",  desc: "Create account" },
      { method: "POST", path: "/auth/login",     desc: "Get JWT token" },
      { method: "POST", path: "/auth/refresh",   desc: "Refresh access token" },
      { method: "GET",  path: "/auth/me",        desc: "Current user info" },
    ],
  },
  {
    group: "Dashboard",
    icon: Home,
    color: "text-green-400",
    routes: [
      { method: "GET", path: "/api/dashboard/summary",         desc: "KPI summary cards" },
      { method: "GET", path: "/api/dashboard/vitcoin-price",   desc: "Live VITCoin price" },
      { method: "GET", path: "/api/dashboard/recent-activity", desc: "Recent event feed" },
    ],
  },
  {
    group: "Predictions",
    icon: Zap,
    color: "text-yellow-400",
    routes: [
      { method: "POST", path: "/predict",            desc: "Run 12-model prediction" },
      { method: "GET",  path: "/result/{match_id}",  desc: "Get result for match" },
      { method: "GET",  path: "/history",            desc: "Prediction history (paginated)" },
      { method: "GET",  path: "/history/{id}",       desc: "Single prediction detail" },
    ],
  },
  {
    group: "Analytics",
    icon: BarChart2,
    color: "text-purple-400",
    routes: [
      { method: "GET", path: "/analytics/summary",       desc: "Performance summary & metrics" },
      { method: "GET", path: "/analytics/leaderboard",   desc: "Top model leaderboard" },
      { method: "GET", path: "/analytics/model/{key}",   desc: "Per-model analytics" },
    ],
  },
  {
    group: "Wallet",
    icon: Coins,
    color: "text-amber-400",
    routes: [
      { method: "GET",  path: "/api/wallet/me",                desc: "Get balances (NGN/USD/USDT/PI/VIT)" },
      { method: "POST", path: "/api/wallet/deposit/initiate",  desc: "Start deposit flow" },
      { method: "POST", path: "/api/wallet/deposit/verify",    desc: "Verify deposit reference" },
      { method: "POST", path: "/api/wallet/convert",           desc: "Convert between currencies" },
      { method: "POST", path: "/api/wallet/withdraw",          desc: "Request withdrawal" },
      { method: "GET",  path: "/api/wallet/transactions",      desc: "Transaction history" },
      { method: "GET",  path: "/api/wallet/plans",             desc: "Subscription plan list" },
      { method: "POST", path: "/api/wallet/subscribe",         desc: "Upgrade subscription tier" },
      { method: "GET",  path: "/api/wallet/vitcoin-price",     desc: "Current VITCoin price" },
    ],
  },
  {
    group: "Blockchain",
    icon: Database,
    color: "text-blue-400",
    routes: [
      { method: "GET",  path: "/api/blockchain/validators",           desc: "All validators" },
      { method: "GET",  path: "/api/blockchain/validators/my",        desc: "Current user's validator" },
      { method: "POST", path: "/api/blockchain/validators/apply",     desc: "Apply as validator" },
      { method: "POST", path: "/api/blockchain/validators/predict",   desc: "Submit validator prediction" },
      { method: "GET",  path: "/api/blockchain/economy",              desc: "VITCoin economy stats" },
      { method: "GET",  path: "/api/blockchain/predictions/{id}",     desc: "Consensus prediction" },
      { method: "POST", path: "/api/blockchain/predictions/{id}/stake", desc: "Stake on outcome" },
      { method: "GET",  path: "/api/blockchain/stakes/my",            desc: "My active stakes" },
    ],
  },
  {
    group: "AI / Training",
    icon: Bot,
    color: "text-pink-400",
    routes: [
      { method: "GET",  path: "/api/ai/models",             desc: "AI model registry" },
      { method: "GET",  path: "/api/ai/insights/{id}",      desc: "AI match insights" },
      { method: "POST", path: "/api/ai/dispatch",           desc: "Dispatch multi-AI analysis" },
      { method: "GET",  path: "/api/training/jobs",         desc: "Training job list" },
      { method: "POST", path: "/api/training/upload",       desc: "Upload training dataset" },
      { method: "GET",  path: "/api/training/score",        desc: "Dataset quality score" },
      { method: "GET",  path: "/api/training/prompt/{id}",  desc: "Generated training prompt" },
    ],
  },
  {
    group: "Marketplace",
    icon: ShoppingBag,
    color: "text-orange-400",
    routes: [
      { method: "GET",  path: "/api/marketplace/models",       desc: "Listed AI models" },
      { method: "POST", path: "/api/marketplace/models",       desc: "Publish a model" },
      { method: "POST", path: "/api/marketplace/models/{id}/purchase", desc: "Purchase access" },
      { method: "POST", path: "/api/marketplace/models/{id}/rate",     desc: "Rate a model" },
    ],
  },
  {
    group: "Trust & Safety",
    icon: Shield,
    color: "text-emerald-400",
    routes: [
      { method: "GET",  path: "/api/trust/score/{user_id}", desc: "User trust score" },
      { method: "GET",  path: "/api/trust/flags",           desc: "Pending fraud flags" },
      { method: "POST", path: "/api/trust/flags/{id}/review", desc: "Review a flag" },
    ],
  },
  {
    group: "Bridge",
    icon: ArrowLeftRight,
    color: "text-indigo-400",
    routes: [
      { method: "POST", path: "/api/bridge/lock",        desc: "Lock VIT → bridge" },
      { method: "POST", path: "/api/bridge/confirm",     desc: "Relayer confirmation" },
      { method: "GET",  path: "/api/bridge/history",     desc: "Bridge transaction log" },
      { method: "GET",  path: "/api/bridge/pools",       desc: "Liquidity pool stats" },
    ],
  },
  {
    group: "Developer",
    icon: Code2,
    color: "text-teal-400",
    routes: [
      { method: "GET",  path: "/api/developer/keys",          desc: "My API keys" },
      { method: "POST", path: "/api/developer/keys",          desc: "Create API key" },
      { method: "DELETE", path: "/api/developer/keys/{id}",   desc: "Revoke API key" },
      { method: "GET",  path: "/api/developer/usage",         desc: "API usage stats" },
      { method: "GET",  path: "/api/developer/docs",          desc: "SDK documentation" },
    ],
  },
  {
    group: "Governance",
    icon: Vote,
    color: "text-violet-400",
    routes: [
      { method: "GET",  path: "/api/governance/proposals",           desc: "All proposals" },
      { method: "POST", path: "/api/governance/proposals",           desc: "Create proposal" },
      { method: "POST", path: "/api/governance/proposals/{id}/vote", desc: "Cast vote" },
      { method: "POST", path: "/api/governance/proposals/{id}/execute", desc: "Execute proposal" },
    ],
  },
  {
    group: "Notifications",
    icon: Activity,
    color: "text-sky-400",
    routes: [
      { method: "GET",  path: "/api/notifications",           desc: "My notifications" },
      { method: "POST", path: "/api/notifications/{id}/read", desc: "Mark as read" },
      { method: "GET",  path: "/api/notifications/preferences", desc: "Notification prefs" },
      { method: "PATCH", path: "/api/notifications/preferences", desc: "Update prefs" },
      { method: "WS",   path: "/ws/notifications",            desc: "Real-time push (WebSocket)" },
    ],
  },
  {
    group: "Webhooks",
    icon: Key,
    color: "text-rose-400",
    routes: [
      { method: "POST", path: "/api/webhooks/paystack", desc: "Paystack (HMAC-SHA512)" },
      { method: "POST", path: "/api/webhooks/stripe",   desc: "Stripe (Stripe-Signature)" },
      { method: "POST", path: "/api/webhooks/usdt",     desc: "USDT on-chain notification" },
      { method: "POST", path: "/api/webhooks/pi",       desc: "Pi Network payment" },
      { method: "GET",  path: "/api/webhooks/health",   desc: "Webhook receiver status" },
    ],
  },
  {
    group: "Admin",
    icon: Lock,
    color: "text-red-400",
    routes: [
      { method: "GET",  path: "/admin/stats",                    desc: "System stats overview" },
      { method: "GET",  path: "/admin/users",                    desc: "All users list" },
      { method: "POST", path: "/admin/users/{id}/role",          desc: "Change user role" },
      { method: "GET",  path: "/admin/matches",                  desc: "All matches" },
      { method: "POST", path: "/admin/matches/{id}/settle",      desc: "Settle a match result" },
      { method: "POST", path: "/admin/matches/manual",           desc: "Add manual fixture" },
      { method: "POST", path: "/admin/upload/csv",               desc: "Bulk upload fixtures (CSV)" },
      { method: "GET",  path: "/admin/models/status",            desc: "ML model status" },
      { method: "POST", path: "/admin/models/reload",            desc: "Reload ML models" },
      { method: "GET",  path: "/admin/data-sources/status",      desc: "API connectivity check" },
      { method: "GET",  path: "/admin/api-keys",                 desc: "Configured API keys (masked)" },
      { method: "POST", path: "/admin/api-keys/update",          desc: "Update API key values" },
      { method: "GET",  path: "/admin/accumulator/candidates",   desc: "Accumulator pick candidates" },
      { method: "POST", path: "/admin/accumulator/generate",     desc: "Build top accumulators" },
      { method: "POST", path: "/admin/accumulator/send",         desc: "Push accumulator to Telegram" },
    ],
  },
  {
    group: "System",
    icon: Server,
    color: "text-gray-400",
    routes: [
      { method: "GET", path: "/health",       desc: "Health check" },
      { method: "GET", path: "/docs",         desc: "Swagger UI" },
      { method: "GET", path: "/redoc",        desc: "ReDoc API docs" },
      { method: "GET", path: "/openapi.json", desc: "OpenAPI spec (JSON)" },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET:    "bg-blue-500/15 text-blue-400 border-blue-500/30",
  POST:   "bg-green-500/15 text-green-400 border-green-500/30",
  PATCH:  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  PUT:    "bg-orange-500/15 text-orange-400 border-orange-500/30",
  DELETE: "bg-red-500/15 text-red-400 border-red-500/30",
  WS:     "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

export default function AdminPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [tab, setTab] = useState("overview");
  const [settleScores, setSettleScores] = useState<Record<number, { home: string; away: string }>>({});

  if (user && user.role !== "admin") {
    return <Redirect to="/dashboard" />;
  }

  const { data: stats } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: () => apiGet("/admin/stats"),
  });

  const { data: usersData, isLoading: loadingUsers } = useQuery<{ users: AdminUser[]; total: number }>({
    queryKey: ["admin-users"],
    queryFn: () => apiGet("/admin/users"),
    enabled: tab === "users",
  });

  const { data: auditData, isLoading: loadingAudit } = useQuery<{ total: number; logs: AuditLog[] }>({
    queryKey: ["admin-audit"],
    queryFn: () => apiGet("/audit/logs?limit=50"),
    enabled: tab === "audit",
  });

  const { data: matchesData, isLoading: loadingMatches } = useQuery<{ matches: any[]; total: number }>({
    queryKey: ["admin-matches"],
    queryFn: () => apiGet("/admin/matches"),
    enabled: tab === "matches",
  });

  const { data: accCandidates, isLoading: loadingCand } = useQuery({
    queryKey: ["acc-candidates"],
    queryFn: () => apiGet<any>("/admin/accumulator/candidates"),
    enabled: tab === "accumulator",
  });

  const roleChangeMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) =>
      apiPost(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const settleMutation = useMutation({
    mutationFn: ({ matchId, home_score, away_score }: { matchId: number; home_score: number; away_score: number }) =>
      apiPost(`/admin/matches/${matchId}/settle`, { home_score, away_score }),
    onSuccess: (data: any) => {
      toast.success(`Match settled: ${data.outcome.replace("_", " ")}`);
      qc.invalidateQueries({ queryKey: ["admin-matches"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const ROLES = ["user", "validator", "admin"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-mono font-bold uppercase tracking-tight">Admin Control Panel</h1>
        <p className="text-muted-foreground font-mono text-sm">System management, oversight & API reference.</p>
      </div>

      {/* KPI Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Users",         value: stats.users,          icon: Users },
            { label: "Matches",       value: stats.matches,        icon: Activity },
            { label: "Predictions",   value: stats.predictions,    icon: ShieldCheck },
            { label: "Training Jobs", value: stats.training_jobs,  icon: Cpu },
            { label: "Audit Entries", value: stats.audit_entries,  icon: FileText },
          ].map((s) => (
            <Card key={s.label} className="bg-card/50 border-primary/10">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold font-mono">{s.value ?? "—"}</p>
                  <p className="text-xs text-muted-foreground font-mono uppercase">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="font-mono text-xs flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="matches">Matches</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="accumulator">Accumulator</TabsTrigger>
          <TabsTrigger value="routes">
            <Globe className="w-3 h-3 mr-1" />Routes
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="mt-4">
          <Card className="bg-card/50 border-muted/50">
            <CardHeader><CardTitle className="font-mono text-sm uppercase">Recent Activity</CardTitle></CardHeader>
            <CardContent>
              {stats?.recent_activity?.length ? (
                <div className="space-y-2">
                  {stats.recent_activity.map((a, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-mono py-1.5 border-b border-muted/20 last:border-0">
                      <div className="flex items-center gap-3">
                        <Badge variant={a.status === "success" ? "default" : "destructive"} className="text-xs font-mono">{a.status}</Badge>
                        <span className="text-muted-foreground">{a.action}</span>
                        <span className="text-foreground">by {a.actor}</span>
                      </div>
                      <span className="text-muted-foreground">{new Date(a.timestamp).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground font-mono text-sm text-center py-4">No recent activity.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── USERS ───────────────────────────────────────────────────── */}
        <TabsContent value="users" className="mt-4">
          {loadingUsers ? (
            <div className="text-muted-foreground font-mono text-center py-12">Loading users...</div>
          ) : (
            <Card className="bg-card/50 border-muted/50">
              <CardHeader>
                <CardTitle className="font-mono text-sm uppercase">All Users ({usersData?.total ?? 0})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-muted/50">
                        {["ID", "Username", "Email", "Role", "Predictions", "Accuracy", "VIT", "Actions"].map((h) => (
                          <th key={h} className="text-left py-2 pr-3 text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {usersData?.users?.map((u) => (
                        <tr key={u.id} className="border-b border-muted/20 hover:bg-muted/10">
                          <td className="py-2 pr-3 text-muted-foreground">#{u.id}</td>
                          <td className="py-2 pr-3 text-primary font-bold">{u.username}</td>
                          <td className="py-2 pr-3 text-muted-foreground max-w-[140px] truncate">{u.email}</td>
                          <td className="py-2 pr-3">
                            <Badge variant={u.role === "admin" ? "destructive" : u.role === "validator" ? "secondary" : "outline"} className="text-xs font-mono">
                              {u.role}
                            </Badge>
                          </td>
                          <td className="py-2 pr-3">{u.total_predictions}</td>
                          <td className="py-2 pr-3">{(u.accuracy_rate * 100).toFixed(1)}%</td>
                          <td className="py-2 pr-3 text-secondary">{u.vitcoin_balance?.toFixed(0)}</td>
                          <td className="py-2 pr-3">
                            <div className="flex gap-1 flex-wrap">
                              {ROLES.filter((r) => r !== u.role).map((r) => (
                                <Button key={r} size="sm" variant="ghost" className="h-6 px-2 text-xs font-mono"
                                  onClick={() => roleChangeMutation.mutate({ userId: u.id, role: r })}>
                                  → {r}
                                </Button>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── MATCHES ─────────────────────────────────────────────────── */}
        <TabsContent value="matches" className="mt-4">
          {loadingMatches ? (
            <div className="text-muted-foreground font-mono text-center py-12">Loading matches...</div>
          ) : (
            <Card className="bg-card/50 border-muted/50">
              <CardHeader><CardTitle className="font-mono text-sm uppercase">Match Settlement</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-muted/50">
                        {["ID", "Match", "League", "Status", "Score", "Settle"].map((h) => (
                          <th key={h} className="text-left py-2 pr-3 text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matchesData?.matches?.map((m: any) => (
                        <tr key={m.id} className="border-b border-muted/20 hover:bg-muted/10">
                          <td className="py-2 pr-3 text-muted-foreground">#{m.id}</td>
                          <td className="py-2 pr-3">{m.home_team} <span className="text-muted-foreground">vs</span> {m.away_team}</td>
                          <td className="py-2 pr-3 text-muted-foreground">{m.league}</td>
                          <td className="py-2 pr-3">
                            <Badge variant={m.status === "completed" ? "secondary" : "outline"} className="text-xs font-mono">{m.status}</Badge>
                          </td>
                          <td className="py-2 pr-3">{m.home_score != null ? `${m.home_score}-${m.away_score}` : "—"}</td>
                          <td className="py-2 pr-3">
                            {m.status !== "completed" ? (
                              <div className="flex items-center gap-1">
                                <input type="number" min="0" max="20" placeholder="H"
                                  value={settleScores[m.id]?.home || ""}
                                  onChange={(e) => setSettleScores((s) => ({ ...s, [m.id]: { ...s[m.id], home: e.target.value } }))}
                                  className="w-10 bg-background border border-muted rounded px-1 py-0.5 text-center font-mono text-xs" />
                                <span className="text-muted-foreground">-</span>
                                <input type="number" min="0" max="20" placeholder="A"
                                  value={settleScores[m.id]?.away || ""}
                                  onChange={(e) => setSettleScores((s) => ({ ...s, [m.id]: { ...s[m.id], away: e.target.value } }))}
                                  className="w-10 bg-background border border-muted rounded px-1 py-0.5 text-center font-mono text-xs" />
                                <Button size="sm" className="h-6 px-2 text-xs font-mono"
                                  onClick={() => {
                                    const hs = parseInt(settleScores[m.id]?.home || "");
                                    const as_ = parseInt(settleScores[m.id]?.away || "");
                                    if (isNaN(hs) || isNaN(as_)) return toast.error("Enter valid scores");
                                    settleMutation.mutate({ matchId: m.id, home_score: hs, away_score: as_ });
                                  }}>
                                  Settle
                                </Button>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Settled</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── AUDIT ───────────────────────────────────────────────────── */}
        <TabsContent value="audit" className="mt-4">
          {loadingAudit ? (
            <div className="text-muted-foreground font-mono text-center py-12">Loading audit logs...</div>
          ) : (
            <Card className="bg-card/50 border-muted/50">
              <CardHeader>
                <CardTitle className="font-mono text-sm uppercase">Audit Log ({auditData?.total ?? 0} entries)</CardTitle>
              </CardHeader>
              <CardContent>
                {!auditData?.logs?.length ? (
                  <p className="text-muted-foreground font-mono text-sm text-center py-4">No audit entries yet.</p>
                ) : (
                  <div className="space-y-1">
                    {auditData.logs.map((log) => (
                      <div key={log.id} className="flex items-start justify-between gap-3 py-2 border-b border-muted/20 last:border-0 text-xs font-mono">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-xs">{log.status}</Badge>
                          <span className="text-primary">{log.action}</span>
                          <span className="text-muted-foreground">by <span className="text-foreground">{log.actor}</span></span>
                          {log.resource && <span className="text-muted-foreground">on {log.resource}</span>}
                        </div>
                        <span className="text-muted-foreground flex-shrink-0">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── ACCUMULATOR ─────────────────────────────────────────────── */}
        <TabsContent value="accumulator" className="mt-4 space-y-4">
          {loadingCand ? (
            <div className="text-muted-foreground font-mono text-center py-12">Loading candidates...</div>
          ) : (
            <>
              <Card className="bg-card/50 border-muted/50">
                <CardHeader>
                  <CardTitle className="font-mono text-sm uppercase">
                    Accumulator Candidates ({accCandidates?.total_found ?? 0} found)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!accCandidates?.candidates?.length ? (
                    <p className="text-muted-foreground font-mono text-sm text-center py-4">No candidates meet filters.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs font-mono">
                        <thead>
                          <tr className="border-b border-muted/50">
                            {["Match", "League", "Pick", "Odds", "Edge", "Conf"].map((h) => (
                              <th key={h} className="text-left py-2 pr-3 text-muted-foreground uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {accCandidates.candidates.map((c: any, i: number) => (
                            <tr key={i} className="border-b border-muted/20 hover:bg-muted/10">
                              <td className="py-2 pr-3">{c.home_team} vs {c.away_team}</td>
                              <td className="py-2 pr-3 text-muted-foreground">{c.league}</td>
                              <td className="py-2 pr-3"><Badge variant="outline" className="text-xs font-mono uppercase">{c.best_side}</Badge></td>
                              <td className="py-2 pr-3 text-secondary font-bold">{c.best_odds}</td>
                              <td className="py-2 pr-3 text-primary">+{(c.edge * 100).toFixed(2)}%</td>
                              <td className="py-2 pr-3">{(c.confidence * 100).toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
              <AccumulatorGenerator candidates={accCandidates?.candidates || []} />
            </>
          )}
        </TabsContent>

        {/* ── ROUTES ──────────────────────────────────────────────────── */}
        <TabsContent value="routes" className="mt-4 space-y-6">

          {/* External links */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Swagger UI",      href: "/docs",         icon: FileText,   color: "border-green-500/30 hover:border-green-500/60" },
              { label: "ReDoc",           href: "/redoc",        icon: BookOpen,   color: "border-blue-500/30 hover:border-blue-500/60" },
              { label: "OpenAPI JSON",    href: "/openapi.json", icon: Code2,      color: "border-yellow-500/30 hover:border-yellow-500/60" },
              { label: "Health Check",    href: "/health",       icon: Activity,   color: "border-primary/30 hover:border-primary/60" },
            ].map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                <Card className={`bg-card/50 border ${link.color} transition-colors cursor-pointer`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <link.icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-mono text-xs font-medium">{link.label}</span>
                    <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>

          {/* Frontend app routes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Layout className="w-4 h-4 text-primary" />
              <h2 className="font-mono text-sm font-bold uppercase text-primary">Frontend Pages</h2>
              <Badge variant="outline" className="font-mono text-xs">{FRONTEND_ROUTES.length} routes</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {FRONTEND_ROUTES.map((route) => (
                <Link key={route.path} href={route.path}>
                  <Card className="bg-card/40 border-muted/30 hover:border-primary/30 transition-colors cursor-pointer">
                    <CardContent className="p-3 flex items-start gap-3">
                      <route.icon className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-foreground">{route.label}</span>
                          <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{route.desc}</p>
                        <code className="text-xs text-primary/60 font-mono">{route.path}</code>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Backend API routes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Server className="w-4 h-4 text-secondary" />
              <h2 className="font-mono text-sm font-bold uppercase text-secondary">Backend API Endpoints</h2>
              <Badge variant="outline" className="font-mono text-xs">
                {API_ROUTE_GROUPS.reduce((acc, g) => acc + g.routes.length, 0)} endpoints
              </Badge>
            </div>
            <div className="space-y-4">
              {API_ROUTE_GROUPS.map((group) => (
                <Card key={group.group} className="bg-card/40 border-muted/30">
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="font-mono text-xs uppercase flex items-center gap-2">
                      <group.icon className={`w-4 h-4 ${group.color}`} />
                      <span className={group.color}>{group.group}</span>
                      <Badge variant="outline" className="font-mono text-xs ml-auto">{group.routes.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="space-y-1.5">
                      {group.routes.map((route, i) => (
                        <div key={i} className="flex items-center gap-3 py-1 text-xs font-mono">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded border text-[10px] font-bold font-mono min-w-[46px] justify-center flex-shrink-0 ${METHOD_COLORS[route.method] || METHOD_COLORS.GET}`}>
                            {route.method}
                          </span>
                          <code className="text-foreground/80 flex-shrink-0 truncate max-w-[220px]">{route.path}</code>
                          <span className="text-muted-foreground hidden sm:block truncate">{route.desc}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AccumulatorGenerator({ candidates }: { candidates: any[] }) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (candidates.length < 2) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiPost<any>("/admin/accumulator/generate", {
        candidates, min_legs: 2, max_legs: 4, top_n: 5,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card/50 border-secondary/20">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-mono text-sm uppercase">Generate Accumulators</CardTitle>
        <Button size="sm" className="font-mono text-xs" onClick={generate} disabled={loading || candidates.length < 2}>
          {loading ? "Generating..." : "Run Engine"}
        </Button>
      </CardHeader>
      <CardContent>
        {error && <p className="text-destructive font-mono text-xs mb-3">{error}</p>}
        {result && (
          <div className="space-y-3">
            <p className="text-xs font-mono text-muted-foreground">
              Generated {result.total_generated} combinations. Top {result.top_n}:
            </p>
            {result.accumulators?.map((acc: any, i: number) => (
              <div key={i} className="rounded-md border border-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold">{acc.n_legs}-Leg Accumulator</span>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">Odds: {acc.combined_odds}x</Badge>
                    <Badge variant={acc.adjusted_edge > 0 ? "default" : "outline"} className="font-mono text-xs">
                      Edge: {(acc.adjusted_edge * 100).toFixed(2)}%
                    </Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  {acc.legs?.map((leg: any, j: number) => (
                    <div key={j} className="text-xs font-mono text-muted-foreground">
                      {j + 1}. {leg.home_team} vs {leg.away_team} →{" "}
                      <span className="text-foreground uppercase">{leg.best_side}</span> @ {leg.best_odds}
                    </div>
                  ))}
                </div>
                <p className="text-xs font-mono text-muted-foreground">
                  Kelly stake: {(acc.kelly_stake * 100).toFixed(1)}% | Avg conf: {(acc.avg_confidence * 100).toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        )}
        {!result && !loading && (
          <p className="text-muted-foreground font-mono text-xs">
            {candidates.length < 2
              ? "Need at least 2 candidates to generate accumulators."
              : `${candidates.length} candidates loaded. Click Run Engine to generate combinations.`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
