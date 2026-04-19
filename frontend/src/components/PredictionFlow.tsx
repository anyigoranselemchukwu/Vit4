import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiPost } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { BrainCircuit, TrendingUp, Coins, CheckCircle2, AlertTriangle } from "lucide-react";

interface MatchInfo {
  match_id: number;
  home_team: string;
  away_team: string;
  league: string;
  kickoff_time: string;
  odds?: { home?: number | null; draw?: number | null; away?: number | null };
  home_prob?: number | null;
  draw_prob?: number | null;
  away_prob?: number | null;
  confidence?: number | null;
  bet_side?: string | null;
  edge?: number | null;
}

interface PredictionFlowProps {
  match: MatchInfo;
  open: boolean;
  onClose: () => void;
}

type Side = "home" | "draw" | "away";

const PRESETS = [5, 10, 25, 50, 100];

export function PredictionFlow({ match, open, onClose }: PredictionFlowProps) {
  const [selectedSide, setSelectedSide] = useState<Side | null>(
    (match.bet_side as Side) ?? null
  );
  const [stake, setStake] = useState("10");
  const queryClient = useQueryClient();

  const homeOdds = match.odds?.home ?? 2.0;
  const drawOdds = match.odds?.draw ?? 3.3;
  const awayOdds = match.odds?.away ?? 3.5;

  const oddsMap: Record<Side, number> = {
    home: homeOdds,
    draw: drawOdds,
    away: awayOdds,
  };

  const probMap: Record<Side, number> = {
    home: match.home_prob ?? 0.33,
    draw: match.draw_prob ?? 0.33,
    away: match.away_prob ?? 0.33,
  };

  const selectedOdds = selectedSide ? oddsMap[selectedSide] : 0;
  const potentialPayout = selectedOdds > 0 ? parseFloat(stake || "0") * selectedOdds : 0;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedSide) throw new Error("Select a prediction");
      const stakeVal = parseFloat(stake);
      if (!stakeVal || stakeVal <= 0) throw new Error("Enter a valid stake");

      const kickoff = match.kickoff_time?.endsWith("Z")
        ? match.kickoff_time
        : match.kickoff_time + "Z";

      return apiPost("/predict", {
        home_team: match.home_team,
        away_team: match.away_team,
        league: match.league,
        kickoff_time: kickoff,
        fixture_id: String(match.match_id),
        market_odds: {
          home: homeOdds,
          draw: drawOdds,
          away: awayOdds,
        },
      });
    },
    onSuccess: (result: any) => {
      toast.success(
        `Prediction submitted: ${selectedSide?.toUpperCase()} @ ${selectedOdds.toFixed(2)}`,
        { description: `Edge: ${((result?.edge ?? 0) * 100).toFixed(2)}% | Confidence: ${((result?.confidence ?? 0) * 100).toFixed(1)}%` }
      );
      queryClient.invalidateQueries({ queryKey: ["matches-recent"] });
      queryClient.invalidateQueries({ queryKey: ["/history"] });
      onClose();
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.detail || e?.message || "Prediction failed";
      if (msg.includes("duplicate")) {
        toast.warning("Already predicted — run the ML ensemble to get an updated prediction");
      } else {
        toast.error(msg);
      }
    },
  });

  const sideLabel = { home: match.home_team, draw: "Draw", away: match.away_team };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-card border-border font-mono">
        <DialogHeader>
          <DialogTitle className="font-mono uppercase text-sm tracking-widest flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-primary" />
            Submit Prediction
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="text-center space-y-1">
            <p className="text-xs text-muted-foreground uppercase">{match.league?.replace(/_/g, " ")}</p>
            <div className="flex items-center justify-center gap-3 text-sm font-bold">
              <span>{match.home_team}</span>
              <span className="text-muted-foreground text-xs">vs</span>
              <span>{match.away_team}</span>
            </div>
            {match.edge != null && Math.abs(match.edge) > 0.01 && (
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                <TrendingUp className="w-3 h-3 mr-1" />
                ML Edge: {(match.edge * 100).toFixed(1)}%
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(["home", "draw", "away"] as Side[]).map((side) => {
              const isSelected = selectedSide === side;
              const isRecommended = match.bet_side === side;
              const prob = probMap[side];
              const odds = oddsMap[side];
              return (
                <button
                  key={side}
                  onClick={() => setSelectedSide(side)}
                  className={`relative flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(0,255,255,0.1)]"
                      : "border-border bg-card/50 hover:border-primary/40"
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono bg-primary text-primary-foreground px-1.5 rounded uppercase">
                      ML Pick
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground uppercase">
                    {side === "home" ? "Home" : side === "draw" ? "Draw" : "Away"}
                  </span>
                  <span className="text-lg font-bold text-primary">{odds.toFixed(2)}</span>
                  {prob > 0 && (
                    <span className="text-[10px] text-muted-foreground">{(prob * 100).toFixed(0)}% prob</span>
                  )}
                  {isSelected && <CheckCircle2 className="w-3 h-3 text-primary absolute top-2 right-2" />}
                </button>
              );
            })}
          </div>

          <div>
            <label className="text-xs text-muted-foreground uppercase mb-2 block">Stake (VITCoin)</label>
            <div className="flex gap-2 mb-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => setStake(String(p))}
                  className={`flex-1 py-1 text-xs font-mono rounded border transition-colors ${
                    stake === String(p)
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <Input
              type="number"
              value={stake}
              onChange={(e) => setStake(e.target.value)}
              className="font-mono bg-card/50"
              placeholder="Enter stake amount"
              min={1}
            />
          </div>

          {selectedSide && potentialPayout > 0 && (
            <Card className="bg-muted/10 border-primary/10">
              <CardContent className="p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground uppercase">Prediction</span>
                  <span className="font-bold text-primary uppercase">{sideLabel[selectedSide]}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground uppercase">Stake</span>
                  <span className="font-mono">{parseFloat(stake || "0").toFixed(2)} VIT</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground uppercase">Odds</span>
                  <span className="font-mono">{selectedOdds.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold border-t border-border/50 pt-1 mt-1">
                  <span className="text-muted-foreground uppercase">Potential Return</span>
                  <span className="text-primary flex items-center gap-1">
                    <Coins className="w-3 h-3" />
                    {potentialPayout.toFixed(2)} VIT
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedSide && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="w-3 h-3" />
              Select Home, Draw, or Away to continue
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 font-mono uppercase text-xs" onClick={onClose}>
              Cancel
            </Button>
            <Button
              className="flex-1 font-mono uppercase text-xs"
              disabled={!selectedSide || !stake || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? "SUBMITTING..." : "RUN ML ENSEMBLE"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
