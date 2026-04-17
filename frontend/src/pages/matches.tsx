import { useState } from "react";
import { Link } from "wouter";
import { useListMatches } from "@/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Activity, BrainCircuit, Search } from "lucide-react";

export default function MatchesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useListMatches();

  const matches = (data?.predictions ?? []).filter((m) =>
    m.home_team.toLowerCase().includes(search.toLowerCase()) ||
    m.away_team.toLowerCase().includes(search.toLowerCase()) ||
    m.league.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div>
          <h1 className="text-3xl font-mono font-bold uppercase tracking-tight">Intelligence Feed</h1>
          <p className="text-muted-foreground font-mono text-sm">Real-time match data & ML consensus</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="SEARCH_TEAMS" 
              className="pl-9 font-mono bg-card/50"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px] font-mono bg-card/50">
              <SelectValue placeholder="FILTER_STATUS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">ALL_MATCHES</SelectItem>
              <SelectItem value="upcoming">UPCOMING</SelectItem>
              <SelectItem value="live">LIVE</SelectItem>
              <SelectItem value="completed">COMPLETED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground font-mono">
          SCANNING_NETWORK...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {matches.map((match, i) => (
            <Link key={`${match.match_id}-${i}`} href={`/matches/${match.match_id}`}>
              <Card className="bg-card/50 backdrop-blur border-border hover:border-primary/50 transition-colors cursor-pointer h-full flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="font-mono text-xs text-muted-foreground border-primary/20">
                      {match.league}
                    </Badge>
                    <Badge variant={match.actual_outcome ? "secondary" : "outline"} className="font-mono text-[10px]">
                      {match.actual_outcome ? "SETTLED" : "UPCOMING"}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg flex justify-between items-center">
                    <span className="truncate">{match.home_team}</span>
                    {match.ft_score && <span className="mx-2 font-mono font-bold text-primary text-sm">{match.ft_score.split("-")[0]}</span>}
                  </CardTitle>
                  <CardTitle className="text-lg flex justify-between items-center text-muted-foreground">
                    <span className="truncate">{match.away_team}</span>
                    {match.ft_score && <span className="mx-2 font-mono font-bold text-primary text-sm">{match.ft_score.split("-")[1]}</span>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="mt-auto pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-muted-foreground font-mono text-xs">
                      <Activity className="w-3 h-3 mr-1.5" />
                      {format(new Date(match.kickoff_time), "MMM dd HH:mm")}
                    </div>
                    <div className="flex items-center text-primary font-mono text-xs font-medium">
                      <BrainCircuit className="w-3 h-3 mr-1.5" />
                      {((match.confidence ?? 0) * 100).toFixed(1)}% CONF
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
          {matches.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground font-mono">
              NO_TARGETS_FOUND
            </div>
          )}
        </div>
      )}
    </div>
  );
}
