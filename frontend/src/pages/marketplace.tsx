import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch } from "@/lib/apiClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShoppingBag, Plus, Star, Zap, TrendingUp, BarChart2, DollarSign, Search } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────

interface Listing {
  id: number;
  creator_id: number;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  tags: string | null;
  price_per_call: string;
  model_key: string | null;
  usage_count: number;
  avg_rating: number;
  rating_count: number;
  total_revenue: string;
  creator_revenue: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

interface BrowseResponse {
  items: Listing[];
  total: number;
  page: number;
  pages: number;
}

interface Stats {
  total_listings: number;
  active_listings: number;
  total_calls: number;
  total_volume_vitcoin: number;
  protocol_revenue_vitcoin: number;
  top_models: { id: number; name: string; usage_count: number; avg_rating: number }[];
}

// ── Helpers ────────────────────────────────────────────────────────────

function StarRating({ value, count }: { value: number; count: number }) {
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      <Star className={`w-3 h-3 ${value >= 1 ? "text-yellow-400 fill-yellow-400" : ""}`} />
      <span className="font-medium text-foreground">{value.toFixed(1)}</span>
      <span>({count})</span>
    </span>
  );
}

function CategoryBadge({ cat }: { cat: string }) {
  const colors: Record<string, string> = {
    prediction: "bg-blue-500/10 text-blue-400",
    analytics:  "bg-purple-500/10 text-purple-400",
    strategy:   "bg-green-500/10 text-green-400",
    data:       "bg-orange-500/10 text-orange-400",
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colors[cat] ?? "bg-muted text-muted-foreground"}`}>
      {cat}
    </span>
  );
}

// ── Call Modal ─────────────────────────────────────────────────────────

function CallModal({ listing }: { listing: Listing }) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [open, setOpen] = useState(false);

  const call = useMutation({
    mutationFn: () =>
      apiPost(`/api/marketplace/models/${listing.id}/call`, { input_summary: input || null }),
    onSuccess: (data: any) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ["marketplace"] });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setResult(null); setInput(""); } }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Zap className="w-3 h-3" /> Call · {listing.price_per_call} VIT
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> {listing.name}
          </DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <p className="text-sm font-medium text-green-400">Call successful — {listing.price_per_call} VITCoin charged</p>
            <div className="bg-muted rounded-lg p-3 text-xs font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
              {JSON.stringify(result.prediction, null, 2)}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={() => { setResult(null); setInput(""); }}>
              Make another call
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{listing.description ?? "No description provided."}</p>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Context / Input (optional)</Label>
              <Textarea
                placeholder="e.g. match_id: 12345, home_team: Arsenal"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="text-xs"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Cost</span>
              <span className="font-semibold text-primary">{listing.price_per_call} VITCoin</span>
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => call.mutate()}
              disabled={call.isPending}
            >
              <Zap className="w-4 h-4" />
              {call.isPending ? "Calling..." : `Call Model`}
            </Button>
            {call.isError && (
              <p className="text-xs text-destructive text-center">
                {(call.error as Error)?.message ?? "Call failed"}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Rate Modal ─────────────────────────────────────────────────────────

function RateModal({ listing }: { listing: Listing }) {
  const qc = useQueryClient();
  const [stars, setStars] = useState(5);
  const [review, setReview] = useState("");
  const [open, setOpen] = useState(false);

  const rate = useMutation({
    mutationFn: () =>
      apiPost(`/api/marketplace/models/${listing.id}/rate`, { stars, review: review || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      setOpen(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Star className="w-3 h-3" /> Rate
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Rate {listing.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Stars</Label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <button key={s} onClick={() => setStars(s)}>
                  <Star className={`w-6 h-6 transition-colors ${s <= stars ? "text-yellow-400 fill-yellow-400" : "text-muted"}`} />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Review (optional)</Label>
            <Textarea
              placeholder="Share your experience..."
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={3}
            />
          </div>
          <Button className="w-full" onClick={() => rate.mutate()} disabled={rate.isPending}>
            {rate.isPending ? "Submitting..." : "Submit Rating"}
          </Button>
          {rate.isError && (
            <p className="text-xs text-destructive text-center">
              {(rate.error as Error)?.message ?? "Rating failed — have you called this model?"}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── List Model Modal ────────────────────────────────────────────────────

function ListModelModal() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", category: "prediction",
    tags: "", price_per_call: "1.0", model_key: "",
  });

  const create = useMutation({
    mutationFn: () =>
      apiPost("/api/marketplace/models", {
        ...form,
        price_per_call: parseFloat(form.price_per_call) || 1,
        model_key: form.model_key || null,
        tags: form.tags || null,
        description: form.description || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketplace"] });
      setOpen(false);
      setForm({ name: "", description: "", category: "prediction", tags: "", price_per_call: "1.0", model_key: "" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="w-4 h-4" /> List Your Model</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>List an AI Model</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="My Prediction Model" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["prediction", "analytics", "strategy", "data"].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Price (VITCoin/call)</Label>
              <Input
                type="number" min="0" step="0.1"
                value={form.price_per_call}
                onChange={(e) => setForm({ ...form, price_per_call: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tags (comma-separated)</Label>
            <Input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="football, xgboost, poisson" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Internal Model Key (optional)</Label>
            <Input value={form.model_key} onChange={(e) => setForm({ ...form, model_key: e.target.value })} placeholder="xgboost_v1" />
          </div>
          <Button className="w-full" onClick={() => create.mutate()} disabled={create.isPending || !form.name}>
            {create.isPending ? "Listing..." : "Publish Listing"}
          </Button>
          {create.isError && (
            <p className="text-xs text-destructive text-center">{(create.error as Error)?.message}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Model Card ─────────────────────────────────────────────────────────

function ModelCard({ listing }: { listing: Listing }) {
  const { user } = useAuth();
  const isOwner = user?.id === listing.creator_id;

  return (
    <Card className="flex flex-col hover:border-primary/40 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <CategoryBadge cat={listing.category} />
              {listing.is_verified && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
                  ✓ Verified
                </span>
              )}
              {isOwner && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                  Your model
                </span>
              )}
            </div>
            <CardTitle className="text-sm truncate">{listing.name}</CardTitle>
          </div>
          <span className="text-sm font-bold text-primary flex-shrink-0">{listing.price_per_call} VIT</span>
        </div>
        {listing.description && (
          <CardDescription className="text-xs line-clamp-2">{listing.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="pb-3 flex-1">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3" /> {listing.usage_count.toLocaleString()} calls
          </span>
          <StarRating value={listing.avg_rating} count={listing.rating_count} />
        </div>
        {listing.tags && (
          <div className="flex flex-wrap gap-1 mt-2">
            {listing.tags.split(",").slice(0, 4).map((t) => (
              <span key={t} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {t.trim()}
              </span>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 gap-2 flex-wrap">
        {!isOwner && <CallModal listing={listing} />}
        {!isOwner && <RateModal listing={listing} />}
        {isOwner && (
          <span className="text-xs text-muted-foreground">
            Revenue: {parseFloat(listing.creator_revenue).toFixed(2)} VIT
          </span>
        )}
      </CardFooter>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("usage_count");
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("browse");

  const { data: statsData } = useQuery<Stats>({
    queryKey: ["marketplace", "stats"],
    queryFn: () => apiGet("/api/marketplace/stats"),
  });

  const { data: browseData, isLoading } = useQuery<BrowseResponse>({
    queryKey: ["marketplace", "browse", search, category, sortBy, page],
    queryFn: () =>
      apiGet(
        `/api/marketplace/models?page=${page}&sort_by=${sortBy}` +
        (search ? `&search=${encodeURIComponent(search)}` : "") +
        (category !== "all" ? `&category=${category}` : "")
      ),
    placeholderData: (prev) => prev,
  });

  const { data: myListings } = useQuery<Listing[]>({
    queryKey: ["marketplace", "my-listings"],
    queryFn: () => apiGet("/api/marketplace/my-listings"),
    enabled: tab === "my-models",
  });

  const { data: myUsage } = useQuery<any[]>({
    queryKey: ["marketplace", "my-usage"],
    queryFn: () => apiGet("/api/marketplace/my-usage?limit=30"),
    enabled: tab === "my-usage",
  });

  const stats = statsData;
  const listings = browseData?.items ?? [];
  const totalPages = browseData?.pages ?? 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-primary" /> AI Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">Buy and sell AI prediction models using VITCoin</p>
        </div>
        <ListModelModal />
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Active Models", value: stats.active_listings, icon: ShoppingBag },
            { label: "Total Calls", value: stats.total_calls.toLocaleString(), icon: Zap },
            { label: "Volume (VIT)", value: stats.total_volume_vitcoin.toFixed(2), icon: TrendingUp },
            { label: "Protocol Revenue", value: stats.protocol_revenue_vitcoin.toFixed(2), icon: DollarSign },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Icon className="w-3 h-3" /> {label}
              </div>
              <p className="text-lg font-bold text-foreground">{value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="browse">Browse</TabsTrigger>
          <TabsTrigger value="my-models">My Models</TabsTrigger>
          <TabsTrigger value="my-usage">My Usage</TabsTrigger>
          {(stats?.top_models?.length ?? 0) > 0 && <TabsTrigger value="top">Top Models</TabsTrigger>}
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search models..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <Select value={category} onValueChange={(v) => { setCategory(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {["prediction", "analytics", "strategy", "data"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v); setPage(1); }}>
              <SelectTrigger className="w-36"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="usage_count">Most Used</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="price">Lowest Price</SelectItem>
                <SelectItem value="revenue">Top Revenue</SelectItem>
                <SelectItem value="created_at">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 rounded-xl bg-muted animate-pulse" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ShoppingBag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No models found. Be the first to list one!</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {listings.map((l) => <ModelCard key={l.id} listing={l} />)}
              </div>
              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                  <span className="text-sm text-muted-foreground self-center">Page {page} / {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* My Models Tab */}
        <TabsContent value="my-models" className="space-y-4">
          {!myListings || myListings.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>You haven't listed any models yet.</p>
              <div className="mt-4"><ListModelModal /></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myListings.map((l) => <ModelCard key={l.id} listing={l} />)}
            </div>
          )}
        </TabsContent>

        {/* My Usage Tab */}
        <TabsContent value="my-usage">
          {!myUsage || myUsage.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No model calls yet. Start by calling a model from the marketplace.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myUsage.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-muted/40 rounded-lg text-sm">
                  <div>
                    <p className="font-medium text-foreground">Model #{log.listing_id}</p>
                    {log.input_summary && <p className="text-xs text-muted-foreground truncate max-w-xs">{log.input_summary}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">{log.vitcoin_charged} VIT</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.called_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Top Models Tab */}
        <TabsContent value="top">
          <div className="space-y-3">
            {stats?.top_models?.map((m, i) => (
              <div key={m.id} className="flex items-center gap-4 p-4 bg-muted/40 rounded-lg">
                <span className="text-2xl font-bold text-muted-foreground w-8">#{i + 1}</span>
                <div className="flex-1">
                  <p className="font-medium text-foreground">{m.name}</p>
                  <StarRating value={m.avg_rating} count={0} />
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">{m.usage_count.toLocaleString()} calls</p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
