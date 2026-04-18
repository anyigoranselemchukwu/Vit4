import { useState } from "react";
import { useParams, useLocation } from "wouter";
import {
  useGetMatch, useGetConsensusPrediction, useStakeOnPrediction, useGetWallet,
} from "@/api-client";
import { AIInsightComparison } from "@/components/AIInsightComparison";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { BrainCircuit, ShieldCheck, ChevronLeft, Zap, Coins, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

export default function MatchDetailPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const matchId = params.id || "";

  const { data: match, isLoading } = useGetMatch(matchId);
  const { data: consensus } = useGetConsensusPrediction(matchId);
  const { data: wallet } = useGetWallet();
  const stake = useStakeOnPrediction();

  const [selectedSide, setSelectedSide] = useState<"home" | "draw" | "away" | null>(null);
  const [stakeAmount, setStakeAmount] = useState("10");

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center font-mono text-muted-foreground">
        <div className="text-center space-y-2">
          <div className="text-2xl animate-pulse">⬡</div>
          <div>RETRIEVING_DATA...</div>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 font-mono">
          <div className="text-4xl text-muted-foreground">404</div>
          <div className="text-muted-foreground uppercase text-sm">Match not found in the intelligence network</div>
          <Button variant="outline" className="font-mono uppercase text-xs" onClick={() => setLocation("/matches")}>
            <ChevronLeft className="w-4 h-4 mr-2" /> Return to Feed
          </Button>
        </div>
      </div>
    );
  }

  const homeProb = match.home_prob ?? 0;
  const drawProb = match.draw_prob ?? 0;
  const awayProb = match.away_prob ?? 0;
  const confidence = match.confidence ?? 0;

  const handleStake = async () => {
    if (!selectedSide) {
      toast.error("Select a prediction first");
      return;
    }
    const amount = parseFloat(stakeAmount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid stake amount");
      return;
    }
    try {
      await stake.mutateAsync({ matchId, prediction: selectedSide, amount });
      toast.success(`Staked ${amount} VITCoin on ${selectedSide}`);
      setSelectedSide(null);
    } catch (e: any) {
      toast.error(e.message || "Stake failed");
    }
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="font-mono text-xs uppercase tracking-wider mb-2" onClick={() => setLocation("/matches")}>
        <ChevronLeft className="w-4 h-4 mr-2" /> Back to Feed
      </Button>

      <Card className="bg-card/80 backdrop-blur border-primary/30 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5 pointer-events-none" />
        <CardContent className="p-8 relative z-10">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Badge variant="outline" className="font-mono border-primary/30 text-primary uppercase">{match.league}</Badge>
            <div className="flex items-center justify-center gap-8 w-full max-w-2xl">
              <div className="flex-1 text-right">
                <h2 className="text-3xl font-bold tracking-tight">{match.home_team}</h2>
              </div>
              <div className="flex flex-col items-center px-4">
                {match.ft_score ? (
                  <div className="text-4xl font-bold font-mono text-primary bg-background/50 px-6 py-3 rounded-lg border border-primary/30">
                    {match.ft_score}
                  </div>
                ) : (
                  <div className="text-center font-mono bg-background/50 px-4 py-2 rounded-lg border border-border">
                    <span className="block text-xl font-bold text-primary">VS</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(match.kickoff_time), "HH:mm")}
                    </span>
                  </div>
                )}
                <Badge variant={match.actual_outcome ? "secondary" : "outline"} className="mt-4 font-mono">
                  {match.actual_outcome ? "SETTLED" : "UPCOMING"}
                </Badge>
              </div>
              <div className="flex-1 text-left">
                <h2 className="text-3xl font-bold tracking-tight">{match.away_team}</h2>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/50 backdrop-blur border-border">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-mono uppercase flex items-center">
                <BrainCircuit className="w-5 h-5 mr-2 text-primary" />
                Ensemble Intelligence
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-2">
                  <div className="font-mono text-sm text-muted-foreground uppercase">Home Win</div>
                  <div className="text-2xl font-bold font-mono text-primary">{(homeProb * 100).toFixed(1)}%</div>
                </div>
                <div className="space-y-2">
                  <div className="font-mono text-sm text-muted-foreground uppercase">Draw</div>
                  <div className="text-2xl font-bold font-mono">{(drawProb * 100).toFixed(1)}%</div>
                </div>
                <div className="space-y-2">
                  <div className="font-mono text-sm text-muted-foreground uppercase">Away Win</div>
                  <div className="text-2xl font-bold font-mono">{(awayProb * 100).toFixed(1)}%</div>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2 font-mono text-sm">
                  <span className="text-muted-foreground uppercase">Network Confidence</span>
                  <span className="text-primary">{(confidence * 100).toFixed(1)}%</span>
                </div>
                <Progress value={confidence * 100} className="h-2 bg-muted [&>div]:bg-primary" />
              </div>

              {match.bet_side && (
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <h4 className="font-mono text-sm font-bold uppercase mb-2 flex items-center text-primary">
                    <Zap className="w-4 h-4 mr-2" /> AI Recommendation
                  </h4>
                  <div className="flex flex-wrap gap-4 font-mono text-sm">
                    <div>
                      <span className="text-muted-foreground uppercase text-xs">Bet Side: </span>
                      <span className="font-bold uppercase">{match.bet_side}</span>
                    </div>
                    {match.entry_odds && (
                      <div>
                        <span className="text-muted-foreground uppercase text-xs">Odds: </span>
                        <span className="font-bold">{match.entry_odds}</span>
                      </div>
                    )}
                    {match.edge != null && (
                      <div>
                        <span className="text-muted-foreground uppercase text-xs">Edge: </span>
                        <span className={`font-bold ${match.edge > 0 ? "text-primary" : "text-destructive"}`}>
                          {(match.edge * 100).toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {consensus && (
            <Card className="bg-card/50 backdrop-blur border-border">
              <CardHeader className="border-b border-border/50 pb-4">
                <CardTitle className="font-mono uppercase flex items-center">
                  <ShieldCheck className="w-5 h-5 mr-2 text-secondary" />
                  Validator Consensus
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-background rounded-lg border border-border">
                    <div className="font-mono text-xs text-muted-foreground uppercase mb-1">Active Nodes</div>
                    <div className="text-xl font-bold font-mono">{consensus.validators?.count ?? 0}</div>
                  </div>
                  <div className="p-4 bg-background rounded-lg border border-border">
                    <div className="font-mono text-xs text-muted-foreground uppercase mb-1">Total Influence</div>
                    <div className="text-xl font-bold font-mono text-secondary">
                      {(consensus.validators?.total_influence ?? 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-4 bg-background rounded-lg border border-border">
                    <div className="font-mono text-xs text-muted-foreground uppercase mb-1">Status</div>
                    <Badge variant="outline" className="font-mono uppercase text-xs">{consensus.status}</Badge>
                  </div>
                  <div className="p-4 bg-background rounded-lg border border-border">
                    <div className="font-mono text-xs text-muted-foreground uppercase mb-1">Final Home%</div>
                    <div className="text-xl font-bold font-mono text-primary">
                      {((consensus.final?.p_home ?? 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <AIInsightComparison matchId={matchId} />

          <Card className="bg-card/50 backdrop-blur border-primary/20 shadow-[0_0_30px_rgba(0,255,255,0.05)]">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-mono uppercase flex items-center">
                <Coins className="w-5 h-5 mr-2 text-secondary" />
                Stake VITCoin
              </CardTitle>
              <CardDescription className="font-mono">
                Balance: {Number(wallet?.vitcoin_balance ?? 0).toLocaleString()} VIT
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {match.actual_outcome ? (
                <div className="text-center p-4 bg-muted/30 rounded-lg border border-border font-mono text-sm text-muted-foreground">
                  MARKET_CLOSED
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-2">
                    {(["home", "draw", "away"] as const).map((side) => (
                      <Button
                        key={side}
                        type="button"
                        variant={selectedSide === side ? "default" : "outline"}
                        className={`font-mono h-12 ${selectedSide === side ? "shadow-[0_0_15px_rgba(0,255,255,0.3)]" : ""}`}
                        onClick={() => setSelectedSide(side)}
                      >
                        {side === "home" ? "1" : side === "away" ? "2" : "X"}
                      </Button>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs font-mono text-muted-foreground uppercase mb-1 block">Amount (VITCoin)</label>
                    <Input
                      type="number"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      className="font-mono text-lg bg-background/50 border-primary/20 h-12"
                      min="1"
                    />
                  </div>
                  <Button
                    className="w-full h-12 font-mono uppercase tracking-widest text-sm"
                    onClick={handleStake}
                    disabled={stake.isPending || !selectedSide}
                  >
                    {stake.isPending ? "PROCESSING_TX..." : "EXECUTE_STAKE"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/50 backdrop-blur border-border">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="font-mono uppercase text-sm flex items-center">
                <TrendingUp className="w-4 h-4 mr-2" />
                Match Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 font-mono text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase text-xs">Kickoff</span>
                <span>{format(new Date(match.kickoff_time), "yyyy-MM-dd HH:mm")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground uppercase text-xs">League</span>
                <span className="truncate ml-4">{match.league}</span>
              </div>
              {match.over_25_prob != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase text-xs">Over 2.5</span>
                  <span>{(match.over_25_prob * 100).toFixed(1)}%</span>
                </div>
              )}
              {match.btts_prob != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase text-xs">BTTS</span>
                  <span>{(match.btts_prob * 100).toFixed(1)}%</span>
                </div>
              )}
              {match.clv != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase text-xs">CLV</span>
                  <span className={match.clv > 0 ? "text-primary" : "text-destructive"}>{match.clv.toFixed(3)}</span>
                </div>
              )}
              {match.profit != null && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground uppercase text-xs">P&L</span>
                  <span className={match.profit >= 0 ? "text-primary" : "text-destructive"}>
                    {match.profit >= 0 ? "+" : ""}{match.profit.toFixed(2)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
