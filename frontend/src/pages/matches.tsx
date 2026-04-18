import { useState } from "react";
import { useListMatches } from "@/api-client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { PremiumMatchCard } from "@/components/PremiumMatchCard";
import { Search } from "lucide-react";

export default function MatchesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const { data, isLoading } = useListMatches();

  const allMatches = data?.predictions ?? [];
  const matches = allMatches.filter((m) => {
    const matchesSearch =
      m.home_team.toLowerCase().includes(search.toLowerCase()) ||
      m.away_team.toLowerCase().includes(search.toLowerCase()) ||
      m.league.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;
    if (statusFilter === "completed") return m.actual_outcome != null;
    if (statusFilter === "upcoming") return m.actual_outcome == null;
    if (statusFilter === "live") return m.actual_outcome == null;
    return true;
  });

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {matches.map((match, i) => (
            <PremiumMatchCard key={`${match.match_id}-${i}`} match={match} />
          ))}
          {matches.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground font-mono">
              NO_TARGETS_FOUND — No predictions in the system yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
