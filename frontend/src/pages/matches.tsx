import { useState } from "react";
import { useListMatches, useListRecentMatches } from "@/api-client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PremiumMatchCard } from "@/components/PremiumMatchCard";
import { Search, Zap, Clock } from "lucide-react";

export default function MatchesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [leagueFilter, setLeagueFilter] = useState<string>("all");

  const { data: upcomingData, isLoading: upcomingLoading } = useListMatches();
  const { data: recentData, isLoading: recentLoading } = useListRecentMatches();

  const isLoading = upcomingLoading;

  const upcoming = upcomingData?.matches ?? [];
  const recent = recentData?.matches ?? [];

  const allMatches = statusFilter === "completed" ? recent : upcoming.length > 0 ? upcoming : recent;

  const leagues = [...new Set(allMatches.map((m) => m.league).filter(Boolean))].slice(0, 10);

  const matches = allMatches.filter((m) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search ||
      m.home_team?.toLowerCase().includes(searchLower) ||
      m.away_team?.toLowerCase().includes(searchLower) ||
      m.league?.toLowerCase().includes(searchLower);

    if (!matchesSearch) return false;

    if (leagueFilter !== "all" && m.league !== leagueFilter) return false;

    if (statusFilter === "completed") return !!m.actual_outcome;
    if (statusFilter === "upcoming") return !m.actual_outcome;
    if (statusFilter === "live") return m.status === "live" || m.status === "IN_PLAY" || m.status === "LIVE";

    return true;
  });

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────── */}
      <div>
        <h1 className="text-3xl font-mono font-bold uppercase tracking-tight">Intelligence Feed</h1>
        <p className="text-muted-foreground font-mono text-sm">
          {upcoming.length > 0
            ? `${upcoming.length} upcoming fixtures loaded`
            : recent.length > 0
            ? `${recent.length} fixtures available`
            : "Real-time match data & ML consensus"}
        </p>
      </div>

      {/* ── Filters ─────────────────────────────────────── */}
      <div className="space-y-2">
        {/* Search — always full width */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search teams or league…"
            className="pl-9 font-mono bg-card/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* Dropdowns — side-by-side even on mobile */}
        <div className="flex gap-2">
          <Select value={leagueFilter} onValueChange={setLeagueFilter}>
            <SelectTrigger className="flex-1 font-mono bg-card/50 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leagues</SelectItem>
              {leagues.map((lg) => (
                <SelectItem key={lg} value={lg}>{lg.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="flex-1 font-mono bg-card/50 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Matches</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="live">Live</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
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
      ) : upcoming.length === 0 && recent.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center space-y-3">
          <Clock className="w-10 h-10 text-muted-foreground mx-auto" />
          <p className="font-mono text-sm text-muted-foreground uppercase tracking-wider">No match data loaded yet.</p>
          <p className="font-mono text-xs text-muted-foreground max-w-sm mx-auto">
            Fixtures load automatically via the data pipeline. Admins can trigger a manual sync from the Admin panel.
          </p>
        </div>
      ) : matches.length > 0 ? (
        <>
          {statusFilter !== "completed" && upcoming.length > 0 && (
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="font-mono text-xs text-muted-foreground uppercase tracking-widest">Upcoming Fixtures</span>
              <Badge variant="outline" className="font-mono text-[10px]">{matches.length}</Badge>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {matches.map((match, i) => (
              <PremiumMatchCard key={`${match.match_id}-${i}`} match={match} />
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border p-6 text-center space-y-2">
          <Search className="w-8 h-8 text-muted-foreground mx-auto" />
          <p className="font-mono text-sm text-muted-foreground">No matches for the selected filters.</p>
          <p className="font-mono text-xs text-muted-foreground/60">Try adjusting the league or status filter.</p>
        </div>
      )}
    </div>
  );
}
