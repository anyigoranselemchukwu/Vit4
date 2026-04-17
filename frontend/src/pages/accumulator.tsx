import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/apiClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Zap, Send, Search, RefreshCw, Trophy, AlertTriangle } from "lucide-react";

const SIDE_LABELS: Record<string, string> = { home: "HOME", draw: "DRAW", away: "AWAY" };
const LEAGUE_SHORT: Record<string, string> = {
  premier_league: "EPL", la_liga: "LA LIGA", bundesliga: "BUND",
  serie_a: "SERIE A", ligue_1: "L1", championship: "CHAMP",
};

function edgeLabel(e: number) {
  if (e >= 0.05) return "🔥🔥🔥 FIRE";
  if (e >= 0.03) return "🔥🔥 STRONG";
  if (e >= 0.01) return "🔥 GOOD";
  return "📊 MARGINAL";
}

interface Candidate {
  match_id: number;
  home_team: string;
  away_team: string;
  league: string;
  kickoff?: string;
  best_side: string;
  best_odds: number;
  confidence: number;
  edge: number;
}

interface AccLeg extends Candidate {}

interface Accumulator {
  n_legs: number;
  legs: AccLeg[];
  combined_odds: number;
  combined_prob: number;
  fair_odds: number;
  adjusted_edge: number;
  correlation_penalty: number;
  avg_confidence: number;
  kelly_stake: number;
}

export default function AccumulatorPage() {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [candFilters, setCandFilters] = useState({ minConfidence: 0.60, minEdge: 0.01, count: 15 });
  const [accFilters, setAccFilters] = useState({ minLegs: 2, maxLegs: 6, topN: 10 });
  const [accumulators, setAccumulators] = useState<Accumulator[]>([]);
  const [sendStatus, setSendStatus] = useState("");

  const candidatesQuery = useQuery<{ candidates: Candidate[] }>({
    queryKey: ["accumulator-candidates", candFilters],
    queryFn: () => apiGet<{ candidates: Candidate[] }>(
      `/admin/accumulator/candidates?min_confidence=${candFilters.minConfidence}&min_edge=${candFilters.minEdge}&count=${candFilters.count}`
    ),
    enabled: false,
  });

  const generateMutation = useMutation<{ accumulators: Accumulator[] }, Error, { candidates: Candidate[]; minLegs: number; maxLegs: number; topN: number }>({
    mutationFn: (data) => apiPost<{ accumulators: Accumulator[] }>("/admin/accumulator/generate", data),
    onSuccess: (data) => setAccumulators(data.accumulators || []),
    onError: (e) => toast.error(e.message),
  });

  const sendMutation = useMutation<{ sent: boolean }, Error, Accumulator>({
    mutationFn: (acc) => apiPost<{ sent: boolean }>("/admin/accumulator/send", { accumulator: acc }),
    onSuccess: (data) => {
      setSendStatus(data.sent ? "✅ Sent to Telegram!" : "❌ Send failed");
      toast.success(data.sent ? "Accumulator sent to Telegram!" : "Send failed");
    },
    onError: (e) => {
      setSendStatus(`❌ ${e.message}`);
      toast.error(e.message);
    },
  });

  const candidates = candidatesQuery.data?.candidates ?? [];

  function toggleCandidate(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleFetch() {
    candidatesQuery.refetch().then((result) => {
      if (result.data?.candidates) {
        setSelectedIds(new Set(result.data.candidates.map((c) => c.match_id)));
        setAccumulators([]);
      }
    });
  }

  function handleGenerate() {
    const selected = candidates.filter((c) => selectedIds.has(c.match_id));
    if (selected.length < accFilters.minLegs) {
      toast.error(`Select at least ${accFilters.minLegs} candidates`);
      return;
    }
    generateMutation.mutate({
      candidates: selected,
      minLegs: accFilters.minLegs,
      maxLegs: Math.min(accFilters.maxLegs, selected.length),
      topN: accFilters.topN,
    });
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-mono font-bold uppercase tracking-tight">Accumulator Engine</h1>
        <p className="text-muted-foreground font-mono text-sm mt-1">
          Find high-edge candidates, build Kelly-optimised accumulator combos, send to Telegram
        </p>
      </div>

      {/* Step 1 — Fetch Candidates */}
      <Card className="bg-card/50 backdrop-blur border-border">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="font-mono uppercase flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" /> Step 1 — Fetch Candidates
          </CardTitle>
          <CardDescription className="font-mono text-xs">
            Scan upcoming fixtures for positive-edge accumulator legs
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="font-mono text-xs uppercase">Min Confidence</Label>
              <Input type="number" step="0.05" min="0" max="1" className="font-mono bg-background/50"
                value={candFilters.minConfidence}
                onChange={(e) => setCandFilters((f) => ({ ...f, minConfidence: parseFloat(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono text-xs uppercase">Min Edge</Label>
              <Input type="number" step="0.005" min="0" max="0.5" className="font-mono bg-background/50"
                value={candFilters.minEdge}
                onChange={(e) => setCandFilters((f) => ({ ...f, minEdge: parseFloat(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono text-xs uppercase">Max Fixtures to Scan</Label>
              <Input type="number" min="5" max="30" className="font-mono bg-background/50"
                value={candFilters.count}
                onChange={(e) => setCandFilters((f) => ({ ...f, count: parseInt(e.target.value) }))} />
            </div>
          </div>
          <Button onClick={handleFetch} disabled={candidatesQuery.isFetching} className="font-mono uppercase">
            <RefreshCw className={`w-4 h-4 mr-2 ${candidatesQuery.isFetching ? "animate-spin" : ""}`} />
            {candidatesQuery.isFetching ? "SCANNING..." : "FIND CANDIDATES"}
          </Button>

          {candidates.length > 0 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center font-mono text-sm">
                <span>{candidates.length} found — <span className="text-primary font-bold">{selectedIds.size} selected</span></span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="font-mono text-xs"
                    onClick={() => setSelectedIds(new Set(candidates.map((c) => c.match_id)))}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" className="font-mono text-xs"
                    onClick={() => setSelectedIds(new Set())}>
                    Clear
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {candidates.map((c) => {
                  const isSelected = selectedIds.has(c.match_id);
                  return (
                    <div
                      key={c.match_id}
                      onClick={() => toggleCandidate(c.match_id)}
                      className={`rounded-lg border p-3 cursor-pointer transition-all ${
                        isSelected ? "border-primary bg-primary/5" : "border-border bg-card/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Checkbox checked={isSelected} className="pointer-events-none" />
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {LEAGUE_SHORT[c.league] || c.league}
                        </Badge>
                      </div>
                      <p className="font-bold text-sm truncate">{c.home_team} vs {c.away_team}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-mono">
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          {SIDE_LABELS[c.best_side]} @ {c.best_odds.toFixed(2)}
                        </Badge>
                        <span className="text-primary">{edgeLabel(c.edge)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        {(c.confidence * 100).toFixed(0)}% conf · {(c.edge * 100).toFixed(1)}% edge
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — Build */}
      {candidates.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="font-mono uppercase flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Step 2 — Build Accumulators
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="font-mono text-xs uppercase">Min Legs</Label>
                <Input type="number" min="2" max="8" className="font-mono bg-background/50"
                  value={accFilters.minLegs}
                  onChange={(e) => setAccFilters((f) => ({ ...f, minLegs: parseInt(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-xs uppercase">Max Legs</Label>
                <Input type="number" min="2" max="8" className="font-mono bg-background/50"
                  value={accFilters.maxLegs}
                  onChange={(e) => setAccFilters((f) => ({ ...f, maxLegs: parseInt(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="font-mono text-xs uppercase">Top N Results</Label>
                <Input type="number" min="1" max="20" className="font-mono bg-background/50"
                  value={accFilters.topN}
                  onChange={(e) => setAccFilters((f) => ({ ...f, topN: parseInt(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleGenerate} disabled={generateMutation.isPending || selectedIds.size < accFilters.minLegs} className="font-mono uppercase">
                <Trophy className="w-4 h-4 mr-2" />
                {generateMutation.isPending ? "GENERATING..." : `GENERATE (${selectedIds.size} selected)`}
              </Button>
              {selectedIds.size < accFilters.minLegs && (
                <p className="text-xs font-mono text-yellow-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Select at least {accFilters.minLegs} candidates
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Results */}
      {accumulators.length > 0 && (
        <Card className="bg-card/50 backdrop-blur border-border">
          <CardHeader className="border-b border-border/50 pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="font-mono uppercase flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" /> Top {accumulators.length} Accumulators
              </CardTitle>
              {sendStatus && <span className="font-mono text-xs text-primary">{sendStatus}</span>}
            </div>
          </CardHeader>
          <CardContent className="pt-5 space-y-4">
            {accumulators.map((acc, i) => (
              <div key={i} className={`rounded-lg border p-4 ${acc.adjusted_edge > 0.03 ? "border-primary/40 bg-primary/5" : "border-border bg-card/30"}`}>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono font-bold">{acc.n_legs}-Leg Accumulator {edgeLabel(acc.adjusted_edge)}</span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="font-mono text-xs">
                      @ {acc.combined_odds.toFixed(2)}
                    </Badge>
                    <Badge className={`font-mono text-xs ${acc.adjusted_edge > 0.03 ? "bg-primary/10 text-primary" : "bg-muted/50 text-muted-foreground"}`}>
                      {(acc.adjusted_edge * 100).toFixed(2)}% edge
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1.5 mb-3">
                  {acc.legs.map((leg, j) => (
                    <div key={j} className="flex items-center gap-2 text-xs font-mono bg-background/40 rounded p-2">
                      <span className="text-muted-foreground w-4">{j + 1}.</span>
                      <span className="flex-1 truncate font-medium">{leg.home_team} vs {leg.away_team}</span>
                      <Badge variant="outline" className="text-[10px]">{SIDE_LABELS[leg.best_side]}</Badge>
                      <span className="text-muted-foreground">@ {leg.best_odds.toFixed(2)}</span>
                      <span className="text-primary">{(leg.confidence * 100).toFixed(0)}%</span>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono mb-3">
                  <div className="bg-background/50 rounded p-2">
                    <div className="text-muted-foreground uppercase mb-0.5">Combined Prob</div>
                    <div className="font-bold">{(acc.combined_prob * 100).toFixed(2)}%</div>
                  </div>
                  <div className="bg-background/50 rounded p-2">
                    <div className="text-muted-foreground uppercase mb-0.5">Fair Odds</div>
                    <div className="font-bold">{acc.fair_odds.toFixed(2)}</div>
                  </div>
                  <div className="bg-background/50 rounded p-2">
                    <div className="text-muted-foreground uppercase mb-0.5">Avg Confidence</div>
                    <div className="font-bold">{(acc.avg_confidence * 100).toFixed(0)}%</div>
                  </div>
                  <div className="bg-background/50 rounded p-2">
                    <div className="text-muted-foreground uppercase mb-0.5">Kelly Stake %</div>
                    <div className="font-bold text-primary">{(acc.kelly_stake * 100).toFixed(1)}%</div>
                  </div>
                </div>

                {acc.correlation_penalty > 0 && (
                  <p className="text-xs font-mono text-yellow-400 flex items-center gap-1 mb-3">
                    <AlertTriangle className="w-3 h-3" />
                    Correlation penalty: -{(acc.correlation_penalty * 100).toFixed(1)}%
                  </p>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="font-mono text-xs"
                  onClick={() => sendMutation.mutate(acc)}
                  disabled={sendMutation.isPending}
                >
                  <Send className="w-3 h-3 mr-1.5" />
                  {sendMutation.isPending ? "SENDING..." : "Send to Telegram"}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
