import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { Redirect } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, Activity, Database, Settings, ShieldCheck, BarChart2,
  Globe, Coins, CreditCard, BookOpen, Cpu, Key, RefreshCw,
  Trash2, Ban, Edit, Plus, CheckCircle, XCircle, AlertCircle,
  TrendingUp, Server, Zap, Save, Search, Eye, EyeOff,
  ChevronRight, Shield, Lock, Unlock,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────

interface AdminStats {
  users: number; matches: number; training_jobs: number;
  active_plans: number; audit_entries: number;
  recent_activity: { action: string; actor: string; status: string; timestamp: string }[];
  top_users: { id: number; username: string; email: string; role: string; tier: string }[];
}

interface SystemHealth {
  api: boolean; database: boolean; redis: boolean;
  models_loaded: number; cpu_pct: number; mem_pct: number; disk_pct: number;
}

interface AdminUser {
  id: number; email: string; username: string; role: string;
  admin_role?: string; subscription_tier: string;
  is_active: boolean; is_verified: boolean; is_banned: boolean;
  vitcoin_balance: number; created_at: string; last_login?: string;
}

interface League {
  id: string; name: string; country: string; status: string;
  weight: number; data_quality: number; matches: number;
}

interface Market {
  id: string; name: string; status: string;
  min_stake: number; max_stake: number; edge_threshold: number;
  commission_rate: number; available_tiers: string[];
}

interface Currency {
  code: string; symbol: string; name: string;
  rate_to_usd: number; status: string; min_deposit: number; max_deposit: number;
}

interface Plan {
  id: number; name: string; display_name: string;
  price_monthly: number; price_yearly: number;
  prediction_limit?: number; features: Record<string, unknown>; is_active: boolean;
}

interface AuditEntry {
  id: number; action: string; actor: string; resource?: string;
  resource_id?: string; details?: Record<string, unknown>;
  ip_address?: string; status: string; timestamp: string;
}

// ─── Status Badge ─────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    paused: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    disabled: "bg-red-500/20 text-red-400 border-red-500/30",
    success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    failure: "bg-red-500/20 text-red-400 border-red-500/30",
    warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border font-medium ${map[status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}>
      {status}
    </span>
  );
}

function HealthDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />;
}

// ─── Module 1: Dashboard ──────────────────────────────────────────────

function DashboardTab() {
  const { data: stats, isLoading: sLoading } = useQuery<AdminStats>({
    queryKey: ["admin-stats"],
    queryFn: () => apiGet("/admin/stats"),
    refetchInterval: 30000,
  });
  const { data: health } = useQuery<SystemHealth>({
    queryKey: ["admin-health"],
    queryFn: () => apiGet("/admin/system/health"),
    refetchInterval: 15000,
  });
  const qc = useQueryClient();

  const clearCache = useMutation({
    mutationFn: () => apiPost("/admin/system/cache/clear", {}),
    onSuccess: () => toast.success("Cache cleared"),
    onError: () => toast.error("Failed to clear cache"),
  });
  const backup = useMutation({
    mutationFn: () => apiPost("/admin/system/backup", {}),
    onSuccess: (d: any) => toast.success(`Backup: ${d.backup}`),
    onError: () => toast.error("Backup failed"),
  });

  const kpis = [
    { label: "Total Users",    value: stats?.users ?? 0,         icon: Users,      color: "text-cyan-400" },
    { label: "Total Matches",  value: stats?.matches ?? 0,        icon: BarChart2,  color: "text-purple-400" },
    { label: "Training Jobs",  value: stats?.training_jobs ?? 0,  icon: Cpu,        color: "text-emerald-400" },
    { label: "Active Plans",   value: stats?.active_plans ?? 0,   icon: CreditCard, color: "text-amber-400" },
  ];

  if (sLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="bg-gray-900 border-gray-700">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{k.label}</span>
                <k.icon className={`w-5 h-5 ${k.color}`} />
              </div>
              <div className="text-3xl font-bold text-white">{k.value.toLocaleString()}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* System Health */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" /> System Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {health ? (
              <>
                {[
                  { label: "API Server",  ok: health.api },
                  { label: "Database",    ok: health.database },
                  { label: "Redis",       ok: health.redis },
                  { label: "ML Models",   ok: health.models_loaded === 12 },
                ].map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-gray-300 flex items-center gap-2">
                      <HealthDot ok={row.ok} /> {row.label}
                    </span>
                    <span className={row.ok ? "text-emerald-400 text-sm" : "text-red-400 text-sm"}>
                      {row.ok ? "Online" : "Offline"}
                    </span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-700 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-gray-500">CPU</div>
                    <div className={`font-bold ${health.cpu_pct > 80 ? "text-red-400" : "text-white"}`}>{health.cpu_pct}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">RAM</div>
                    <div className={`font-bold ${health.mem_pct > 85 ? "text-red-400" : "text-white"}`}>{health.mem_pct}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Disk</div>
                    <div className={`font-bold ${health.disk_pct > 90 ? "text-red-400" : "text-white"}`}>{health.disk_pct}%</div>
                  </div>
                </div>
              </>
            ) : <div className="text-gray-500 text-sm">Loading...</div>}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" /> Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {[
              { label: "Refresh Stats",   icon: RefreshCw, action: () => qc.invalidateQueries({ queryKey: ["admin-stats"] }), color: "border-cyan-500/30 hover:border-cyan-400 text-cyan-400" },
              { label: "Clear Cache",     icon: Zap,        action: () => clearCache.mutate(), color: "border-purple-500/30 hover:border-purple-400 text-purple-400" },
              { label: "Create Backup",   icon: Database,   action: () => backup.mutate(), color: "border-emerald-500/30 hover:border-emerald-400 text-emerald-400" },
              { label: "Reload Health",   icon: Activity,   action: () => qc.invalidateQueries({ queryKey: ["admin-health"] }), color: "border-amber-500/30 hover:border-amber-400 text-amber-400" },
            ].map(a => (
              <Button key={a.label} variant="outline"
                className={`flex flex-col h-16 gap-1 bg-transparent border ${a.color}`}
                onClick={a.action}>
                <a.icon className="w-4 h-4" />
                <span className="text-xs">{a.label}</span>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-400" /> Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.recent_activity?.length ? (
            <div className="space-y-2">
              {stats.recent_activity.slice(0, 8).map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={a.status} />
                    <span className="text-sm text-gray-300 font-mono">{a.action}</span>
                    <span className="text-xs text-gray-500">by {a.actor}</span>
                  </div>
                  <span className="text-xs text-gray-600">{a.timestamp ? new Date(a.timestamp).toLocaleString() : ""}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center py-4">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Module 2: User Management ────────────────────────────────────────

function UsersTab() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", username: "", password: "", role: "user", subscription_tier: "viewer" });
  const qc = useQueryClient();
  const { isSuperAdmin } = useAuth();

  const { data, isLoading } = useQuery<{ total: number; users: AdminUser[] }>({
    queryKey: ["admin-users", search, roleFilter, tierFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (search) p.set("search", search);
      if (roleFilter) p.set("role", roleFilter);
      if (tierFilter) p.set("tier", tierFilter);
      return apiGet(`/admin/users?${p}`);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<AdminUser> }) => apiPut(`/admin/users/${id}`, body),
    onSuccess: () => { toast.success("User updated"); setEditUser(null); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => toast.error("Update failed"),
  });

  const createMutation = useMutation({
    mutationFn: (body: typeof newUser) => apiPost("/admin/users", body),
    onSuccess: () => { toast.success("User created"); setCreateOpen(false); setNewUser({ email: "", username: "", password: "", role: "user", subscription_tier: "viewer" }); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Create failed"),
  });

  const banMutation = useMutation({
    mutationFn: ({ id, banned }: { id: number; banned: boolean }) => apiPost(`/admin/users/${id}/ban`, { banned }),
    onSuccess: () => { toast.success("User status updated"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => toast.error("Action failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`/admin/users/${id}`),
    onSuccess: () => { toast.success("User deleted"); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => toast.error("Delete failed"),
  });

  const overrideMutation = useMutation({
    mutationFn: ({ id, plan }: { id: number; plan: string }) =>
      apiPost(`/admin/users/${id}/subscription-override`, { plan_name: plan }),
    onSuccess: () => { toast.success("Subscription updated"); setEditUser(null); qc.invalidateQueries({ queryKey: ["admin-users"] }); },
  });

  const tierColor: Record<string, string> = {
    viewer: "text-gray-400", analyst: "text-blue-400",
    pro: "text-purple-400", elite: "text-amber-400",
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Search email or username…" className="pl-9 bg-gray-800 border-gray-600 text-white"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-32 bg-gray-800 border-gray-600 text-white">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="">All roles</SelectItem>
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="validator">Validator</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-36 bg-gray-800 border-gray-600 text-white">
            <SelectValue placeholder="All tiers" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="">All tiers</SelectItem>
            <SelectItem value="viewer">Viewer</SelectItem>
            <SelectItem value="analyst">Analyst</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="elite">Elite</SelectItem>
          </SelectContent>
        </Select>
        <Button className="bg-cyan-500 hover:bg-cyan-400 text-black" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> New User
        </Button>
      </div>

      {/* Users Table */}
      <Card className="bg-gray-900 border-gray-700">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Role</th>
                    <th className="text-left p-3">Tier</th>
                    <th className="text-left p-3">Balance</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Joined</th>
                    <th className="text-right p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users?.map(u => (
                    <tr key={u.id} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                      <td className="p-3">
                        <div className="font-medium text-white">{u.username}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="border-gray-600 text-gray-300">
                          {u.admin_role ?? u.role}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <span className={`font-medium capitalize ${tierColor[u.subscription_tier] ?? "text-gray-400"}`}>
                          {u.subscription_tier}
                        </span>
                      </td>
                      <td className="p-3 text-gray-300">{u.vitcoin_balance.toFixed(2)} VIT</td>
                      <td className="p-3">
                        {u.is_banned ? <StatusBadge status="banned" /> :
                         u.is_active ? <StatusBadge status="active" /> :
                         <StatusBadge status="inactive" />}
                      </td>
                      <td className="p-3 text-gray-500 text-xs">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-cyan-400" onClick={() => setEditUser(u)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost"
                            className={`h-7 w-7 p-0 ${u.is_banned ? "hover:text-emerald-400" : "hover:text-yellow-400"}`}
                            onClick={() => banMutation.mutate({ id: u.id, banned: !u.is_banned })}>
                            {u.is_banned ? <Unlock className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                          </Button>
                          {isSuperAdmin && (
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:text-red-400"
                              onClick={() => { if (confirm(`Delete ${u.username}?`)) deleteMutation.mutate(u.id); }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!data?.users?.length && (
                    <tr><td colSpan={7} className="text-center text-gray-500 py-8">No users found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editUser && (
        <Dialog open onOpenChange={() => setEditUser(null)}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User — {editUser.username}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm border border-gray-700 rounded p-3 bg-gray-800">
                <div><span className="text-gray-400">Email:</span> <span className="text-gray-200">{editUser.email}</span></div>
                <div><span className="text-gray-400">Balance:</span> <span className="text-gray-200">{editUser.vitcoin_balance.toFixed(2)} VIT</span></div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-400">Role</Label>
                <Select defaultValue={editUser.role} onValueChange={v => setEditUser(u => u ? { ...u, role: v } : null)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="validator">Validator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editUser.role === "admin" && (
                <div className="space-y-2">
                  <Label className="text-gray-400">Admin Role</Label>
                  <Select defaultValue={editUser.admin_role ?? "admin"} onValueChange={v => setEditUser(u => u ? { ...u, admin_role: v } : null)}>
                    <SelectTrigger className="bg-gray-800 border-gray-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700">
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="auditor">Auditor</SelectItem>
                      <SelectItem value="support">Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-gray-400">Subscription Tier</Label>
                <Select defaultValue={editUser.subscription_tier} onValueChange={v => overrideMutation.mutate({ id: editUser.id, plan: v })}>
                  <SelectTrigger className="bg-gray-800 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="viewer">Viewer (Free)</SelectItem>
                    <SelectItem value="analyst">Analyst ($29/mo)</SelectItem>
                    <SelectItem value="pro">Pro ($79/mo)</SelectItem>
                    <SelectItem value="elite">Elite ($199/mo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="border-gray-600" onClick={() => setEditUser(null)}>Cancel</Button>
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-black"
                disabled={editMutation.isPending}
                onClick={() => editMutation.mutate({ id: editUser.id, body: { role: editUser.role, admin_role: editUser.admin_role } })}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Create User Dialog */}
      {createOpen && (
        <Dialog open onOpenChange={() => setCreateOpen(false)}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
            <DialogHeader><DialogTitle>Create New User</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              {[
                { label: "Email", key: "email", type: "email" },
                { label: "Username", key: "username", type: "text" },
                { label: "Password", key: "password", type: "password" },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-gray-400">{f.label}</Label>
                  <Input type={f.type} className="bg-gray-800 border-gray-600 text-white"
                    value={(newUser as any)[f.key]}
                    onChange={e => setNewUser(u => ({ ...u, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-gray-400">Role</Label>
                <Select value={newUser.role} onValueChange={v => setNewUser(u => ({ ...u, role: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-600"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="validator">Validator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-400">Subscription Tier</Label>
                <Select value={newUser.subscription_tier} onValueChange={v => setNewUser(u => ({ ...u, subscription_tier: v }))}>
                  <SelectTrigger className="bg-gray-800 border-gray-600"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="elite">Elite</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="border-gray-600" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-black"
                disabled={createMutation.isPending}
                onClick={() => createMutation.mutate(newUser)}>
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Module 3: Leagues ────────────────────────────────────────────────

function LeaguesTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ leagues: League[] }>({
    queryKey: ["admin-leagues"],
    queryFn: () => apiGet("/admin/leagues"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<League> }) => apiPut(`/admin/leagues/${id}`, body),
    onSuccess: () => { toast.success("League updated"); qc.invalidateQueries({ queryKey: ["admin-leagues"] }); },
    onError: () => toast.error("Update failed"),
  });

  const statusColor = { active: "text-emerald-400", paused: "text-yellow-400", disabled: "text-red-400" };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-cyan-400" /> League Configuration ({data?.leagues?.length ?? 0} leagues)
        </CardTitle>
        <CardDescription className="text-gray-400">Configure status, weights and data quality for each league</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left p-3">League</th>
                <th className="text-left p-3">Country</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Weight</th>
                <th className="text-left p-3">Quality</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.leagues?.map(lg => (
                <tr key={lg.id} className="border-b border-gray-800 hover:bg-gray-800/40">
                  <td className="p-3 font-medium text-white">{lg.name}</td>
                  <td className="p-3 text-gray-400">{lg.country}</td>
                  <td className="p-3">
                    <span className={`capitalize font-medium ${(statusColor as any)[lg.status] ?? "text-gray-400"}`}>{lg.status}</span>
                  </td>
                  <td className="p-3 text-gray-300">{lg.weight.toFixed(1)}×</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${lg.data_quality}%` }} />
                      </div>
                      <span className="text-gray-400 text-xs">{lg.data_quality}%</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      {(["active", "paused", "disabled"] as const).map(s => (
                        <Button key={s} size="sm" variant="outline"
                          className={`h-6 px-2 text-xs border-gray-600 ${lg.status === s ? "bg-gray-700" : "bg-transparent"}`}
                          onClick={() => updateMutation.mutate({ id: lg.id, body: { status: s } })}>
                          {s}
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
  );
}

// ─── Module 4: Markets ────────────────────────────────────────────────

function MarketsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Market | null>(null);
  const { data, isLoading } = useQuery<{ markets: Market[] }>({
    queryKey: ["admin-markets"],
    queryFn: () => apiGet("/admin/markets"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Market> }) => apiPut(`/admin/markets/${id}`, body),
    onSuccess: () => { toast.success("Market updated"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-markets"] }); },
    onError: () => toast.error("Update failed"),
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {data?.markets?.map(mk => (
          <Card key={mk.id} className="bg-gray-900 border-gray-700">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <CardTitle className="text-white text-base">{mk.name}</CardTitle>
                <StatusBadge status={mk.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>Stake Range</span>
                <span className="text-white">{mk.min_stake}–{mk.max_stake} VIT</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Edge Threshold</span>
                <span className="text-white">{mk.edge_threshold}%</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Commission</span>
                <span className="text-white">{mk.commission_rate}%</span>
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {mk.available_tiers.map(t => (
                  <Badge key={t} variant="outline" className="text-xs border-gray-600 text-gray-400 capitalize">{t}</Badge>
                ))}
              </div>
              <Button size="sm" variant="outline" className="w-full mt-2 border-gray-600 text-gray-300 hover:text-white"
                onClick={() => setEditing(mk)}>
                <Edit className="w-3 h-3 mr-1" /> Configure
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
            <DialogHeader><DialogTitle>Configure — {editing.name}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label className="text-gray-400">Status</Label>
                <Select defaultValue={editing.status} onValueChange={v => setEditing(e => e ? { ...e, status: v } : null)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-400">Min Stake (VIT)</Label>
                  <Input type="number" className="bg-gray-800 border-gray-600 text-white" defaultValue={editing.min_stake}
                    onChange={e => setEditing(m => m ? { ...m, min_stake: +e.target.value } : null)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Max Stake (VIT)</Label>
                  <Input type="number" className="bg-gray-800 border-gray-600 text-white" defaultValue={editing.max_stake}
                    onChange={e => setEditing(m => m ? { ...m, max_stake: +e.target.value } : null)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Edge Threshold %</Label>
                  <Input type="number" step="0.1" className="bg-gray-800 border-gray-600 text-white" defaultValue={editing.edge_threshold}
                    onChange={e => setEditing(m => m ? { ...m, edge_threshold: +e.target.value } : null)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Commission %</Label>
                  <Input type="number" step="0.1" className="bg-gray-800 border-gray-600 text-white" defaultValue={editing.commission_rate}
                    onChange={e => setEditing(m => m ? { ...m, commission_rate: +e.target.value } : null)} />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="border-gray-600" onClick={() => setEditing(null)}>Cancel</Button>
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-black"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: editing.id, body: { status: editing.status, min_stake: editing.min_stake, max_stake: editing.max_stake, edge_threshold: editing.edge_threshold, commission_rate: editing.commission_rate } })}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Module 5: Currency ───────────────────────────────────────────────

function CurrencyTab() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<{ currencies: Currency[]; conversion_fees: Record<string, number>; vit_pricing: Record<string, number> }>({
    queryKey: ["admin-currency"],
    queryFn: () => apiGet("/admin/currency"),
  });

  const recalcMutation = useMutation({
    mutationFn: () => apiPost("/admin/currency/recalculate-vit", {}),
    onSuccess: (d: any) => { toast.success(`New VIT price: $${d.new_price_usd}`); qc.invalidateQueries({ queryKey: ["admin-currency"] }); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ code, body }: { code: string; body: Partial<Currency> }) => apiPut(`/admin/currency/${code}`, body),
    onSuccess: () => { toast.success("Rate updated"); qc.invalidateQueries({ queryKey: ["admin-currency"] }); },
  });

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>;

  const vit = data?.vit_pricing ?? {};
  const fees = data?.conversion_fees ?? {};

  return (
    <div className="space-y-6">
      {/* VIT Pricing Engine */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-amber-400" /> VIT Coin Pricing Engine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Current Price</div>
              <div className="text-2xl font-bold text-amber-400">${(vit.current_price_usd ?? 0.10).toFixed(4)}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">Circulating Supply</div>
              <div className="text-2xl font-bold text-white">{(vit.circulating_supply ?? 0).toLocaleString()}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">30d Revenue</div>
              <div className="text-2xl font-bold text-emerald-400">${(vit.rolling_revenue_usd ?? 0).toLocaleString()}</div>
            </div>
          </div>
          <Button className="bg-amber-500 hover:bg-amber-400 text-black" onClick={() => recalcMutation.mutate()}>
            <RefreshCw className="w-4 h-4 mr-2" /> Recalculate VIT Price
          </Button>
        </CardContent>
      </Card>

      {/* Fiat Currencies */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Fiat Currency Rates</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400">
                <th className="text-left p-3">Currency</th>
                <th className="text-left p-3">Rate (USD)</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Min / Max Deposit</th>
              </tr>
            </thead>
            <tbody>
              {data?.currencies?.map(c => (
                <tr key={c.code} className="border-b border-gray-800 hover:bg-gray-800/40">
                  <td className="p-3">
                    <span className="font-bold text-white">{c.symbol}</span>
                    <span className="ml-2 text-gray-400">{c.code} — {c.name}</span>
                  </td>
                  <td className="p-3 font-mono text-gray-200">{c.rate_to_usd}</td>
                  <td className="p-3"><StatusBadge status={c.status} /></td>
                  <td className="p-3 text-gray-400 text-xs">
                    {c.symbol}{c.min_deposit.toLocaleString()} / {c.symbol}{c.max_deposit.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Conversion Fees */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader><CardTitle className="text-white">Conversion Fees</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          {[
            { label: "Fiat → VIT", key: "fiat_to_vit" },
            { label: "VIT → Fiat", key: "vit_to_fiat" },
            { label: "Cross-Fiat",  key: "cross_fiat" },
          ].map(f => (
            <div key={f.key} className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-500 mb-1">{f.label}</div>
              <div className="text-xl font-bold text-white">{fees[f.key] ?? 0}%</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Module 6: Subscriptions ──────────────────────────────────────────

function SubscriptionsTab() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Plan | null>(null);
  const { data, isLoading } = useQuery<{ plans: Plan[] }>({
    queryKey: ["admin-subscriptions"],
    queryFn: () => apiGet("/admin/subscriptions"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Plan> }) => apiPut(`/admin/subscriptions/${id}`, body),
    onSuccess: () => { toast.success("Plan updated"); setEditing(null); qc.invalidateQueries({ queryKey: ["admin-subscriptions"] }); },
  });

  const tierColors: Record<string, string> = {
    free: "border-gray-600 bg-gray-800",
    analyst: "border-blue-500/50 bg-blue-950/30",
    pro: "border-purple-500/50 bg-purple-950/30",
    elite: "border-amber-500/50 bg-amber-950/30",
  };

  if (isLoading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {data?.plans?.map(plan => (
          <Card key={plan.id} className={`border ${tierColors[plan.name] ?? "border-gray-700 bg-gray-900"}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-lg">{plan.display_name}</CardTitle>
                {!plan.is_active && <Badge variant="outline" className="border-red-500/50 text-red-400 text-xs">Inactive</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-2xl font-bold text-white">
                ${plan.price_monthly}<span className="text-sm text-gray-400">/mo</span>
              </div>
              <div className="text-sm text-gray-400">
                ${plan.price_yearly}<span className="text-gray-500">/yr</span>
              </div>
              <div className="text-sm text-gray-300">
                {plan.prediction_limit === null || plan.prediction_limit === undefined
                  ? "Unlimited predictions/day"
                  : `${plan.prediction_limit} predictions/day`}
              </div>
              <Button size="sm" variant="outline" className="w-full border-gray-600 text-gray-300 hover:text-white"
                onClick={() => setEditing(plan)}>
                <Edit className="w-3 h-3 mr-1" /> Edit Plan
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {editing && (
        <Dialog open onOpenChange={() => setEditing(null)}>
          <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
            <DialogHeader><DialogTitle>Edit Plan — {editing.display_name}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-gray-400">Monthly Price ($)</Label>
                  <Input type="number" step="0.01" className="bg-gray-800 border-gray-600 text-white"
                    defaultValue={editing.price_monthly}
                    onChange={e => setEditing(p => p ? { ...p, price_monthly: +e.target.value } : null)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-gray-400">Yearly Price ($)</Label>
                  <Input type="number" step="0.01" className="bg-gray-800 border-gray-600 text-white"
                    defaultValue={editing.price_yearly}
                    onChange={e => setEditing(p => p ? { ...p, price_yearly: +e.target.value } : null)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-gray-400">Daily Prediction Limit (blank = unlimited)</Label>
                <Input type="number" className="bg-gray-800 border-gray-600 text-white"
                  defaultValue={editing.prediction_limit ?? ""}
                  onChange={e => setEditing(p => p ? { ...p, prediction_limit: e.target.value ? +e.target.value : undefined } : null)} />
              </div>
              <div className="flex items-center justify-between py-2">
                <Label className="text-gray-400">Active</Label>
                <Switch defaultChecked={editing.is_active}
                  onCheckedChange={v => setEditing(p => p ? { ...p, is_active: v } : null)} />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="border-gray-600" onClick={() => setEditing(null)}>Cancel</Button>
              <Button className="bg-cyan-500 hover:bg-cyan-400 text-black"
                disabled={updateMutation.isPending}
                onClick={() => updateMutation.mutate({ id: editing.id, body: { price_monthly: editing.price_monthly, price_yearly: editing.price_yearly, prediction_limit: editing.prediction_limit, is_active: editing.is_active } })}>
                Save Plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ─── Module 7: System Configuration ──────────────────────────────────

function SystemTab() {
  const qc = useQueryClient();
  const { isSuperAdmin } = useAuth();
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const { data: flagsData, isLoading } = useQuery<{ flags: Record<string, { value: boolean; description: string }> }>({
    queryKey: ["admin-flags"],
    queryFn: () => apiGet("/admin/system/flags"),
  });
  const { data: keysData } = useQuery<{ keys: { name: string; label: string; description: string; configured: boolean; masked: string }[] }>({
    queryKey: ["admin-keys"],
    queryFn: () => apiGet("/admin/api-keys"),
  });

  const flagMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: boolean }) => apiPut("/admin/system/flags", { flags: { [key]: value } }),
    onSuccess: () => { toast.success("Flag updated"); qc.invalidateQueries({ queryKey: ["admin-flags"] }); },
    onError: () => toast.error("Update failed"),
  });
  const cacheMutation = useMutation({
    mutationFn: () => apiPost("/admin/system/cache/clear", {}),
    onSuccess: () => toast.success("Cache cleared"),
  });
  const backupMutation = useMutation({
    mutationFn: () => apiPost("/admin/system/backup", {}),
    onSuccess: (d: any) => toast.success(d.message),
    onError: () => toast.error("Backup failed — super_admin only"),
  });

  return (
    <div className="space-y-6">
      {/* Feature Flags */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-400" /> Feature Flags
          </CardTitle>
          <CardDescription className="text-gray-400">Toggle platform features without code changes</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-6"><div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              {Object.entries(flagsData?.flags ?? {}).map(([key, val]) => {
                const isOn = typeof val === "object" ? val.value : val;
                const desc = typeof val === "object" ? val.description : key;
                return (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div>
                      <div className="text-white font-mono text-sm">{key}</div>
                      <div className="text-xs text-gray-500">{desc}</div>
                    </div>
                    <Switch checked={isOn} onCheckedChange={v => flagMutation.mutate({ key, value: v })} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-400" /> API Keys
          </CardTitle>
          <CardDescription className="text-gray-400">External service API key status — manage via environment secrets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {keysData?.keys?.map(k => (
            <div key={k.name} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <div>
                <div className="text-white text-sm font-medium">{k.label}</div>
                <div className="text-xs text-gray-500">{k.description}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-gray-400">
                  {showKey[k.name] ? k.masked : "••••••••"}
                </span>
                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-500 hover:text-white"
                  onClick={() => setShowKey(s => ({ ...s, [k.name]: !s[k.name] }))}>
                  {showKey[k.name] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
                {k.configured
                  ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                  : <XCircle className="w-4 h-4 text-red-400" />}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* System Actions */}
      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Server className="w-5 h-5 text-cyan-400" /> System Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" className="border-purple-500/50 text-purple-400 hover:border-purple-400"
            onClick={() => cacheMutation.mutate()}>
            <Zap className="w-4 h-4 mr-2" /> Clear Cache
          </Button>
          {isSuperAdmin && (
            <Button variant="outline" className="border-cyan-500/50 text-cyan-400 hover:border-cyan-400"
              onClick={() => backupMutation.mutate()}>
              <Database className="w-4 h-4 mr-2" /> Create Backup
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Module 8: Audit Log ──────────────────────────────────────────────

function AuditTab() {
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const { data, isLoading } = useQuery<{ total: number; logs: AuditEntry[] }>({
    queryKey: ["admin-audit", actionFilter, actorFilter],
    queryFn: () => {
      const p = new URLSearchParams();
      if (actionFilter) p.set("action", actionFilter);
      if (actorFilter) p.set("actor", actorFilter);
      p.set("limit", "100");
      return apiGet(`/admin/audit?${p}`);
    },
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Filter by action…" className="pl-9 bg-gray-800 border-gray-600 text-white"
            value={actionFilter} onChange={e => setActionFilter(e.target.value)} />
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input placeholder="Filter by actor…" className="pl-9 bg-gray-800 border-gray-600 text-white"
            value={actorFilter} onChange={e => setActorFilter(e.target.value)} />
        </div>
      </div>

      <Card className="bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" /> Audit Trail
            </span>
            <span className="text-sm text-gray-500 font-normal">{data?.total ?? 0} entries</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400">
                    <th className="text-left p-3">Timestamp</th>
                    <th className="text-left p-3">Actor</th>
                    <th className="text-left p-3">Action</th>
                    <th className="text-left p-3">Resource</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.logs?.map(lg => (
                    <tr key={lg.id} className="border-b border-gray-800 hover:bg-gray-800/40">
                      <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                        {lg.timestamp ? new Date(lg.timestamp).toLocaleString() : "-"}
                      </td>
                      <td className="p-3 text-gray-300 font-mono text-xs truncate max-w-[140px]">{lg.actor}</td>
                      <td className="p-3 text-cyan-400 font-mono text-xs">{lg.action}</td>
                      <td className="p-3 text-gray-400 text-xs">{lg.resource ?? "-"}</td>
                      <td className="p-3"><StatusBadge status={lg.status} /></td>
                      <td className="p-3 text-gray-500 text-xs truncate max-w-[200px]">
                        {lg.details ? JSON.stringify(lg.details).slice(0, 60) : "-"}
                      </td>
                    </tr>
                  ))}
                  {!data?.logs?.length && (
                    <tr><td colSpan={6} className="text-center text-gray-500 py-8">No audit entries found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Root Admin Page ──────────────────────────────────────────────────

export default function AdminPage() {
  const { user, isAdmin, isSuperAdmin } = useAuth();

  if (!user) return <Redirect to="/login" />;
  if (!isAdmin) return <Redirect to="/dashboard" />;

  const adminRoleLabel: Record<string, string> = {
    super_admin: "Super Admin", admin: "Admin",
    auditor: "Auditor", support: "Support",
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top bar */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-cyan-400" />
          <div>
            <div className="font-bold text-white text-lg leading-tight">Admin Control Center</div>
            <div className="text-xs text-gray-500">VIT Sports Intelligence Network</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm text-white font-medium">{user.username}</div>
            <div className="text-xs text-cyan-400">{adminRoleLabel[user.admin_role ?? "admin"] ?? "Admin"}</div>
          </div>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
            isSuperAdmin ? "bg-amber-500 text-black" : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
          }`}>
            {user.username[0]?.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="bg-gray-800 border border-gray-700 flex-wrap h-auto mb-6 p-1 gap-1">
            {[
              { value: "dashboard",      label: "Dashboard",      icon: BarChart2 },
              { value: "users",          label: "Users",          icon: Users },
              { value: "leagues",        label: "Leagues",        icon: Globe },
              { value: "markets",        label: "Markets",        icon: TrendingUp },
              { value: "currency",       label: "Currency",       icon: Coins },
              { value: "subscriptions",  label: "Subscriptions",  icon: CreditCard },
              { value: "system",         label: "System",         icon: Settings },
              { value: "audit",          label: "Audit",          icon: ShieldCheck },
            ].map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}
                className="data-[state=active]:bg-cyan-500 data-[state=active]:text-black flex items-center gap-1.5 text-gray-300 px-3 py-1.5">
                <tab.icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="dashboard"><DashboardTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="leagues"><LeaguesTab /></TabsContent>
          <TabsContent value="markets"><MarketsTab /></TabsContent>
          <TabsContent value="currency"><CurrencyTab /></TabsContent>
          <TabsContent value="subscriptions"><SubscriptionsTab /></TabsContent>
          <TabsContent value="system"><SystemTab /></TabsContent>
          <TabsContent value="audit"><AuditTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
