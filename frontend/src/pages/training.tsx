import { useRef, useState } from "react";
import { useListTrainingJobs, useGetModelPerformance, useUploadTrainingData } from "@/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete, apiFormPost } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Terminal, Database, Server, Cpu, Activity, Upload, FolderOpen, GitCompare, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";

export default function TrainingPage() {
  const { data: jobsData, isLoading: isJobsLoading } = useListTrainingJobs();
  const { data: performance, isLoading: isPerfLoading } = useGetModelPerformance();
  const uploadTraining = useUploadTrainingData();
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const result = await uploadTraining.mutateAsync(fd);
      toast.success(`Dataset uploaded: job ${result.job_id}`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  if (isJobsLoading || isPerfLoading) {
    return <div className="h-full flex items-center justify-center font-mono text-muted-foreground">INITIALIZING_ML_PIPELINE...</div>;
  }

  const jobs = jobsData?.jobs ?? [];
  const models = performance?.models ?? [];
  const ensembleAccuracy = performance?.ensemble_accuracy ?? performance?.accuracy_rate ?? 0;
  const totalPredictions = performance?.total_predictions ?? 0;

  const chartData = models.length > 0
    ? models
    : [
        { name: "XGBoost", accuracy: 0 },
        { name: "LightGBM", accuracy: 0 },
        { name: "Random Forest", accuracy: 0 },
        { name: "Neural Net", accuracy: 0 },
      ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-mono font-bold uppercase tracking-tight">ML Infrastructure</h1>
        <p className="text-muted-foreground font-mono text-sm">Model training status, pipeline health, and data ingestion</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card className="bg-card/50 backdrop-blur border-border">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="font-mono uppercase text-sm flex items-center">
                <Activity className="w-4 h-4 mr-2 text-primary" />
                Ensemble Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold font-mono text-primary">
                  {(ensembleAccuracy * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground font-mono uppercase mt-1">Overall Accuracy</div>
              </div>
              <div className="bg-muted/30 rounded p-3 text-xs font-mono flex justify-between border border-border">
                <span className="text-muted-foreground">Total Predictions</span>
                <span className="font-bold">{totalPredictions.toLocaleString()}</span>
              </div>
              <div className="bg-muted/30 rounded p-3 text-xs font-mono flex justify-between border border-border">
                <span className="text-muted-foreground">Training Jobs</span>
                <span className="font-bold">{jobs.length}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border">
            <CardHeader className="pb-2 border-b border-border/50">
              <CardTitle className="font-mono uppercase text-sm flex items-center">
                <Database className="w-4 h-4 mr-2 text-primary" />
                Upload Training Data
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <p className="text-xs font-mono text-muted-foreground">
                Upload a CSV file with match data to trigger a new training pipeline run.
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                className="w-full font-mono"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploadTraining.isPending}
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploadTraining.isPending ? "UPLOADING..." : "SELECT_CSV_FILE"}
              </Button>
              <div className="text-xs font-mono text-muted-foreground space-y-1 pt-2 border-t border-border/50">
                <p className="font-bold uppercase">Required columns:</p>
                <p>home_team, away_team, league, kickoff_time, home_goals, away_goals</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card/50 backdrop-blur border-border">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="font-mono uppercase flex items-center">
                <Cpu className="w-5 h-5 mr-2 text-primary" />
                Model Performance Matrix
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      angle={-45}
                      textAnchor="end"
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => `${(val * 100).toFixed(0)}%`}
                      domain={[0, 1]}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "hsl(var(--muted)/0.5)" }}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", fontFamily: "var(--font-mono)", fontSize: "12px" }}
                      formatter={(val: number) => [`${(val * 100).toFixed(1)}%`, "Accuracy"]}
                    />
                    <Bar dataKey="accuracy" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border">
            <CardHeader className="pb-4 border-b border-border/50">
              <CardTitle className="font-mono uppercase text-sm flex items-center">
                <Server className="w-4 h-4 mr-2" />
                Pipeline Execution Queue
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {jobs.map((job) => (
                  <div key={job.job_id} className="p-4 flex items-center justify-between font-mono text-sm">
                    <div className="flex items-center gap-4">
                      <Terminal className={`w-4 h-4 ${job.status === "running" ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
                      <div>
                        <div className="font-bold">JOB_{job.job_id?.slice(0, 8) ?? "?"}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {job.models_trained ? `${job.models_trained} models` : "pending"}
                          {job.avg_accuracy != null ? ` · ${(job.avg_accuracy * 100).toFixed(1)}% acc` : ""}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={`text-[10px] uppercase mb-1 ${
                        job.status === "completed" ? "border-secondary/50 text-secondary" :
                        job.status === "failed" ? "border-destructive/50 text-destructive" :
                        job.status === "running" ? "border-primary/50 text-primary" :
                        "border-muted-foreground/30 text-muted-foreground"
                      }`}>
                        {job.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground">
                        {job.created_at ? format(new Date(job.created_at), "HH:mm:ss") : "WAITING"}
                      </div>
                    </div>
                  </div>
                ))}
                {jobs.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground font-mono text-sm">
                    NO_JOBS_IN_QUEUE
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dataset Management (from V1 DatasetPanel) */}
      <DatasetManagement />
    </div>
  );
}

type DatasetTab = "upload" | "browser" | "models";

function DatasetManagement() {
  const [activeTab, setActiveTab] = useState<DatasetTab>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [merge, setMerge] = useState(false);
  const [browserPage, setBrowserPage] = useState(1);
  const [browserLeague, setBrowserLeague] = useState("");
  const [browserSearch, setBrowserSearch] = useState("");
  const [clearConfirm, setClearConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();

  const { data: stats, refetch: refetchStats } = useQuery<any>({
    queryKey: ["dataset-stats"],
    queryFn: () => apiGet<any>("/training/dataset/stats"),
  });

  const { data: browser, isLoading: browserLoading, refetch: refetchBrowser } = useQuery<any>({
    queryKey: ["dataset-browser", browserPage, browserLeague, browserSearch],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(browserPage) });
      if (browserLeague) params.set("league", browserLeague);
      if (browserSearch) params.set("search", browserSearch);
      return apiGet<any>(`/training/dataset/browser?${params.toString()}`);
    },
    enabled: activeTab === "browser",
  });

  const { data: models, isLoading: modelsLoading, refetch: refetchModels } = useQuery<any>({
    queryKey: ["model-comparison"],
    queryFn: () => apiGet<any>("/training/models/compare"),
    enabled: activeTab === "models",
  });

  const uploadMutation = useMutation({
    mutationFn: async (f: File) => {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("merge", String(merge));
      return apiFormPost<any>("/training/dataset/upload", fd);
    },
    onSuccess: (data) => {
      toast.success(`Uploaded ${data.records_uploaded?.toLocaleString()} records`);
      setFile(null);
      refetchStats();
    },
    onError: (e: any) => toast.error(e.message || "Upload failed"),
  });

  const clearMutation = useMutation({
    mutationFn: () => apiDelete<any>("/training/dataset/clear"),
    onSuccess: () => {
      toast.success("Dataset cleared");
      setClearConfirm(false);
      refetchStats();
      qc.invalidateQueries({ queryKey: ["dataset-browser"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const TABS: { id: DatasetTab; label: string; icon: React.ElementType }[] = [
    { id: "upload",  label: "Upload Data",        icon: Upload },
    { id: "browser", label: "Dataset Browser",    icon: FolderOpen },
    { id: "models",  label: "Model Comparison",   icon: GitCompare },
  ];

  return (
    <Card className="bg-card/50 backdrop-blur border-border">
      <CardHeader className="border-b border-border/50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="font-mono uppercase flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> Dataset Management
          </CardTitle>
          {/* Stats row */}
          {stats && (
            <div className="flex gap-4 font-mono text-xs text-muted-foreground">
              <span>Historical: <strong className="text-foreground">{stats.historical?.count?.toLocaleString() ?? 0}</strong></span>
              <span>Simulated: <strong className="text-foreground">{stats.simulated?.count?.toLocaleString() ?? 0}</strong></span>
              <span>Total: <strong className="text-primary">{stats.total?.toLocaleString() ?? 0}</strong></span>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-3">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="pt-5">
        {activeTab === "upload" && (
          <div className="space-y-4 max-w-lg">
            <p className="text-xs font-mono text-muted-foreground leading-relaxed">
              Upload a <strong>.csv</strong> or <strong>.json</strong> file of historical match results.
              <br />
              <strong>Required columns:</strong> home_team, away_team, home_goals, away_goals
              <br />
              <strong>Optional:</strong> league, date, season, actual_outcome
            </p>

            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.json"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <Button variant="outline" className="font-mono text-xs uppercase" onClick={() => fileRef.current?.click()}>
                <Upload className="w-3 h-3 mr-1.5" />
                {file ? file.name : "SELECT FILE (.csv / .json)"}
              </Button>
              {file && (
                <p className="text-xs font-mono text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 text-xs font-mono cursor-pointer">
              <input type="checkbox" checked={merge} onChange={(e) => setMerge(e.target.checked)} />
              Merge with existing dataset (instead of replacing)
            </label>

            <Button
              className="font-mono uppercase text-xs"
              disabled={!file || uploadMutation.isPending}
              onClick={() => file && uploadMutation.mutate(file)}
            >
              {uploadMutation.isPending ? "UPLOADING..." : "UPLOAD & NORMALIZE"}
            </Button>

            {(stats?.historical?.count ?? 0) > 0 && (
              <div className="pt-4 border-t border-border/50">
                <Button
                  variant={clearConfirm ? "destructive" : "outline"}
                  size="sm"
                  className="font-mono text-xs uppercase"
                  onClick={() => clearConfirm ? clearMutation.mutate() : setClearConfirm(true)}
                  disabled={clearMutation.isPending}
                >
                  <Trash2 className="w-3 h-3 mr-1.5" />
                  {clearMutation.isPending ? "CLEARING..." : clearConfirm ? "CONFIRM CLEAR" : "CLEAR DATASET"}
                </Button>
                {clearConfirm && (
                  <Button variant="ghost" size="sm" className="ml-2 font-mono text-xs" onClick={() => setClearConfirm(false)}>
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "browser" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Input
                placeholder="Search team name..."
                value={browserSearch}
                onChange={(e) => { setBrowserSearch(e.target.value); setBrowserPage(1); }}
                className="font-mono text-sm bg-background/50 max-w-xs"
              />
              <Select value={browserLeague || "all"} onValueChange={(v) => { setBrowserLeague(v === "all" ? "" : v); setBrowserPage(1); }}>
                <SelectTrigger className="w-48 font-mono bg-background/50 text-sm">
                  <SelectValue placeholder="All Leagues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leagues</SelectItem>
                  {(browser?.leagues ?? []).map((l: string) => (
                    <SelectItem key={l} value={l}>{l.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="font-mono text-xs" onClick={() => refetchBrowser()}>
                ↺ Refresh
              </Button>
            </div>

            {browserLoading ? (
              <p className="font-mono text-muted-foreground text-sm text-center py-6">Loading...</p>
            ) : !browser || browser.total === 0 ? (
              <p className="font-mono text-muted-foreground text-sm text-center py-6">
                No records. Upload data first.
              </p>
            ) : (
              <>
                <p className="font-mono text-xs text-muted-foreground">
                  {browser.total.toLocaleString()} records · Page {browser.page} of {browser.pages}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-border">
                        {["Home", "Away", "Score", "League", "Date", "Result"].map((h) => (
                          <th key={h} className="text-left p-2 text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(browser.records ?? []).map((r: any, i: number) => (
                        <tr key={i} className="border-b border-border/30 hover:bg-muted/10">
                          <td className="p-2 font-bold">{r.home_team}</td>
                          <td className="p-2 font-bold">{r.away_team}</td>
                          <td className="p-2 font-bold">
                            {r.home_goals != null && r.away_goals != null ? `${r.home_goals}–${r.away_goals}` : "—"}
                          </td>
                          <td className="p-2 text-muted-foreground">{(r.league || "").replace(/_/g, " ")}</td>
                          <td className="p-2 text-muted-foreground">{r.date || "—"}</td>
                          <td className="p-2">
                            {r.actual_outcome ? (
                              <Badge variant={r.actual_outcome === "home" ? "default" : r.actual_outcome === "away" ? "destructive" : "outline"}
                                className="text-[9px] uppercase">
                                {r.actual_outcome}
                              </Badge>
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {browser.pages > 1 && (
                  <div className="flex items-center gap-3 font-mono text-xs">
                    <Button variant="outline" size="sm" disabled={browser.page <= 1} onClick={() => setBrowserPage((p) => p - 1)}>← Prev</Button>
                    <span className="text-muted-foreground">Page {browser.page} of {browser.pages}</span>
                    <Button variant="outline" size="sm" disabled={browser.page >= browser.pages} onClick={() => setBrowserPage((p) => p + 1)}>Next →</Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "models" && (
          <div className="space-y-3">
            <Button variant="outline" size="sm" className="font-mono text-xs uppercase" onClick={() => refetchModels()} disabled={modelsLoading}>
              {modelsLoading ? "⟳" : "↺"} Refresh
            </Button>
            {modelsLoading ? (
              <p className="font-mono text-muted-foreground text-sm text-center py-6">Loading...</p>
            ) : (models?.models ?? []).length === 0 ? (
              <p className="font-mono text-muted-foreground text-sm text-center py-6">
                No model metrics available. Run a training job first.
              </p>
            ) : (
              (models?.models ?? []).map((m: any, i: number) => {
                const rank = i + 1;
                const rankColor = rank === 1 ? "text-yellow-400" : rank === 2 ? "text-muted-foreground" : rank === 3 ? "text-orange-500" : "text-muted-foreground/50";
                return (
                  <div key={m.model} className={`flex items-center gap-4 p-3 rounded-lg border ${i === 0 ? "border-yellow-400/30 bg-yellow-400/5" : "border-border bg-card/30"}`}>
                    <span className={`font-mono font-bold text-lg w-6 ${rankColor}`}>{rank}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm font-mono truncate">{m.model}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {m.training_samples ? `${m.training_samples.toLocaleString()} samples` : ""}
                        {m.last_trained ? ` · ${new Date(m.last_trained).toLocaleDateString()}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-4 text-xs font-mono">
                      <div className="text-center">
                        <div className="font-bold text-primary">{m.accuracy != null ? `${(m.accuracy * 100).toFixed(1)}%` : "—"}</div>
                        <div className="text-muted-foreground uppercase">Acc</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-secondary">{m.log_loss != null ? m.log_loss.toFixed(4) : "—"}</div>
                        <div className="text-muted-foreground uppercase">LogLoss</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-yellow-400">{m.calibration_error != null ? m.calibration_error.toFixed(4) : "—"}</div>
                        <div className="text-muted-foreground uppercase">CalErr</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-muted-foreground">v{m.version || 1}</div>
                        <div className="text-muted-foreground uppercase">Ver</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
