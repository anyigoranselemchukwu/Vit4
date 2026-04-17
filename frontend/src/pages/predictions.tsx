import { useListPredictions } from "@/api-client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Activity, Coins } from "lucide-react";
import { Link } from "wouter";

export default function PredictionsPage() {
  const { data, isLoading } = useListPredictions();

  if (isLoading) {
    return <div className="h-full flex items-center justify-center font-mono text-muted-foreground">LOADING_LEDGER...</div>;
  }

  const predictions = data?.predictions ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-mono font-bold uppercase tracking-tight">Active Operations</h1>
        <p className="text-muted-foreground font-mono text-sm">Your prediction ledger and historical execution</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {predictions.map((prediction, i) => (
          <Link key={`${prediction.match_id}-${i}`} href={`/matches/${prediction.match_id}`}>
            <Card className="bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-colors cursor-pointer overflow-hidden">
              <CardContent className="p-0 flex flex-col md:flex-row">
                <div className="p-6 md:w-1/3 border-b md:border-b-0 md:border-r border-border/50 bg-muted/10 flex flex-col justify-center">
                  <div className="flex justify-between items-center mb-4">
                    <Badge variant="outline" className="font-mono text-xs border-primary/20 text-primary">{prediction.league}</Badge>
                    <Badge variant={
                      prediction.actual_outcome ? "secondary" :
                      "outline"
                    } className="font-mono text-[10px] uppercase">
                      {prediction.actual_outcome ?? "PENDING"}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <div className="font-medium truncate">{prediction.home_team}</div>
                    <div className="font-medium truncate text-muted-foreground">{prediction.away_team}</div>
                  </div>
                  <div className="mt-4 flex items-center text-xs text-muted-foreground font-mono">
                    <Activity className="w-3 h-3 mr-1.5" />
                    {format(new Date(prediction.kickoff_time), "MMM dd HH:mm")}
                  </div>
                </div>

                <div className="p-6 flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 items-center">
                  <div>
                    <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Bet Side</div>
                    <div className="font-bold text-lg capitalize">{prediction.bet_side ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Entry Odds</div>
                    <div className="font-mono font-bold flex items-center">
                      <Coins className="w-4 h-4 mr-1.5 text-secondary" />
                      {prediction.entry_odds ? prediction.entry_odds.toFixed(2) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-mono uppercase mb-1">Edge</div>
                    <div className={`font-mono font-bold ${(prediction.edge ?? 0) > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {prediction.edge != null ? `${(prediction.edge * 100).toFixed(2)}%` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground font-mono uppercase mb-1">P&L</div>
                    <div className={`font-mono font-bold text-xl ${(prediction.profit ?? 0) > 0 ? "text-primary" : (prediction.profit ?? 0) < 0 ? "text-destructive" : ""}`}>
                      {prediction.profit != null ? `${prediction.profit >= 0 ? "+" : ""}${prediction.profit.toFixed(2)}` : "—"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        {predictions.length === 0 && (
          <div className="text-center py-12 text-muted-foreground font-mono border border-dashed border-border rounded-lg">
            NO_RECORDS_FOUND
          </div>
        )}
      </div>
    </div>
  );
}
