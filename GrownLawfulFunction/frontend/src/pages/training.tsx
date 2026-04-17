import { useRef } from "react";
import { useListTrainingJobs, useGetModelPerformance, useUploadTrainingData } from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Terminal, Database, Server, Cpu, Activity, Upload } from "lucide-react";
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
    </div>
  );
}
