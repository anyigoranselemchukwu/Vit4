import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Trophy, Zap, TrendingUp, Shield, BarChart2, Brain,
  ArrowRight, Check, Star, ChevronRight, Activity,
  Users, Coins, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/* ── Ticker data ─────────────────────────────────────────── */
const TICKER_ITEMS = [
  { match: "Man Utd vs Arsenal",   edge: "+8.4%", outcome: "WIN",  confidence: 87 },
  { match: "PSG vs Real Madrid",   edge: "+6.1%", outcome: "WIN",  confidence: 82 },
  { match: "Bayern vs Dortmund",   edge: "+11.2%", outcome: "WIN", confidence: 91 },
  { match: "Chelsea vs Liverpool", edge: "+5.3%", outcome: "LOSS", confidence: 73 },
  { match: "Juventus vs Milan",    edge: "+9.7%", outcome: "WIN",  confidence: 88 },
  { match: "Barcelona vs Sevilla", edge: "+7.8%", outcome: "WIN",  confidence: 85 },
  { match: "Inter vs Napoli",      edge: "+4.9%", outcome: "WIN",  confidence: 76 },
];

const TESTIMONIALS = [
  { user: "TraderXVI", role: "Elite Member",   stars: 5, text: "The 12-model ensemble is genuinely impressive. My ROI jumped 34% in 3 months." },
  { user: "QuantBettor", role: "Pro Member",   stars: 5, text: "Best AI predictions I've used. The CLV tracking alone is worth the subscription." },
  { user: "EdgeHunter99", role: "Elite Member", stars: 5, text: "I never trusted AI picks until VIT. The transparency of each model's confidence changed everything." },
];

const FEATURES = [
  {
    icon: Brain,
    title: "12-Model AI Ensemble",
    desc: "Random Forest, LSTM, XGBoost and 9 more models vote on every prediction. No black boxes.",
    color: "text-primary",
    bg: "bg-primary/10 border-primary/20",
  },
  {
    icon: TrendingUp,
    title: "CLV Tracking",
    desc: "Measure your edge against closing line value. Know exactly when you're beating the market.",
    color: "text-secondary",
    bg: "bg-secondary/10 border-secondary/20",
  },
  {
    icon: Shield,
    title: "Blockchain Verified",
    desc: "Results settled on-chain by a decentralized validator network. Zero manipulation possible.",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
  },
  {
    icon: Coins,
    title: "VITCoin Economy",
    desc: "Earn, stake, and earn revenue share as an Elite validator. Real value, not just points.",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
  {
    icon: BarChart2,
    title: "Bankroll Management",
    desc: "Kelly Criterion, fractional staking, drawdown alerts. Built-in money management tools.",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
  },
  {
    icon: Zap,
    title: "Real-Time Intelligence",
    desc: "Live odds monitoring, line movement alerts, and arbitrage detection all in one place.",
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/month",
    desc: "Get started",
    features: ["5 predictions/day", "Basic history", "Community access"],
    cta: "Start Free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$49",
    period: "/month",
    desc: "For serious bettors",
    features: [
      "100 predictions/day",
      "AI ensemble breakdown",
      "CLV tracking",
      "Bankroll tools",
      "Telegram alerts",
      "Accumulator builder",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    name: "Elite",
    price: "$199",
    period: "/month",
    desc: "Institutional grade",
    features: [
      "Unlimited predictions",
      "Everything in Pro",
      "Validator eligibility",
      "Revenue share",
      "CSV upload",
      "Priority support",
    ],
    cta: "Go Elite",
    highlight: false,
  },
];

function TickerTape() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  return (
    <div className="vit-ticker-wrap bg-vit-gray-900 border-y border-border/50 py-2 overflow-hidden">
      <div className="vit-ticker-content gap-8 px-4">
        {items.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-2 text-xs font-mono mr-8 flex-shrink-0">
            <span className="text-muted-foreground">{item.match}</span>
            <span className="text-primary">{item.edge}</span>
            <span className="text-muted-foreground">AI: {item.confidence}%</span>
            <span className={`font-bold ${item.outcome === "WIN" ? "text-green-400" : "text-destructive"}`}>
              {item.outcome}
            </span>
            <span className="text-border">•</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function StatCounter({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-3xl md:text-4xl font-bold font-mono vit-gradient-text">{value}</div>
      <div className="text-sm text-muted-foreground font-mono mt-1">{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial((n) => (n + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-center">
              <Trophy className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold font-mono tracking-tight text-foreground">
              VIT<span className="text-primary">_OS</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-mono text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#ai" className="hover:text-foreground transition-colors">AI Engine</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-mono text-xs">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="font-mono text-xs gap-1">
                Start Predicting <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="relative pt-32 pb-16 md:pt-40 md:pb-24 px-4 md:px-8">
        {/* Grid background */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(to right, rgba(0,245,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,245,255,0.04) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent)',
        }} />
        {/* Glow orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center">
          <Badge className="mb-6 font-mono text-xs border-primary/30 bg-primary/10 text-primary px-4 py-1.5">
            <Activity className="w-3 h-3 mr-1.5 inline animate-pulse" />
            12 AI Models · Live Predictions · Blockchain Verified
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold font-mono tracking-tight leading-tight mb-6">
            <span className="block text-foreground">Institutional-Grade</span>
            <span className="block vit-gradient-text">Sports Intelligence</span>
          </h1>

          <p className="text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            A 12-model AI ensemble analyses every match with machine learning precision.
            Real edge. Real transparency. Real results.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
            <Link href="/register">
              <Button size="lg" className="font-mono gap-2 px-8 h-12 text-base shadow-lg vit-glow-cyan">
                Start Predicting Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="font-mono gap-2 px-8 h-12 text-base border-border/60">
                Sign In
              </Button>
            </Link>
          </div>

          {/* Social proof numbers */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
            <StatCounter value="50K+" label="Predictions" />
            <StatCounter value="73%" label="Accuracy Rate" />
            <StatCounter value="$2.4M" label="Total Staked" />
            <StatCounter value="12" label="AI Models" />
          </div>
        </div>
      </section>

      {/* ── Live ticker ─────────────────────────────────── */}
      <TickerTape />

      {/* ── Features ────────────────────────────────────── */}
      <section id="features" className="py-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-tight mb-3">
              Everything you need to win
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Built by quants and traders, for bettors who demand an edge.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className={`rounded-xl border p-6 ${f.bg} transition-all duration-250 hover:-translate-y-1 hover:shadow-lg cursor-default`}>
                <div className={`w-10 h-10 rounded-lg bg-background/50 border border-border/50 flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="font-bold font-mono text-sm mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Ensemble Visualization ───────────────────── */}
      <section id="ai" className="py-20 px-4 md:px-8 bg-card/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 font-mono text-xs border-primary/30 bg-primary/10 text-primary">
                AI Transparency
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold font-mono tracking-tight mb-4">
                See exactly why every prediction is made
              </h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                Unlike black-box systems, VIT shows you the confidence score of each of its 12 models,
                their historical accuracy, and the weighted consensus that drives the final call.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  "Per-model confidence breakdown",
                  "Agreement/disagreement visualization",
                  "Historical accuracy by model",
                  "Expandable 'Why this prediction?' section",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm">
                    <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="font-mono gap-2">
                  Try it now <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>

            {/* Animated model breakdown mockup */}
            <div className="rounded-2xl border border-border bg-card/50 backdrop-blur p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-muted-foreground uppercase">Model Consensus</span>
                <Badge className="text-primary border-primary/30 bg-primary/10 font-mono text-xs">LIVE</Badge>
              </div>
              {[
                { name: "Random Forest",   conf: 91, weight: 12 },
                { name: "XGBoost",         conf: 88, weight: 11 },
                { name: "LSTM Neural",     conf: 84, weight: 10 },
                { name: "Gradient Boost",  conf: 79, weight: 9  },
                { name: "Logistic Reg.",   conf: 76, weight: 8  },
                { name: "SVM Classifier",  conf: 82, weight: 9  },
              ].map((m) => (
                <div key={m.name} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-mono text-foreground">{m.name}</span>
                    <span className="text-xs font-mono text-primary">{m.conf}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-700"
                      style={{ width: `${m.conf}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground">Ensemble Consensus</span>
                <span className="text-lg font-bold font-mono text-primary">83.3%</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────── */}
      <section className="py-20 px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold font-mono mb-12">Trusted by serious bettors</h2>
          <div className="relative min-h-[160px]">
            {TESTIMONIALS.map((t, i) => (
              <div
                key={i}
                className={`absolute inset-0 transition-all duration-500 ${
                  i === activeTestimonial ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                }`}
              >
                <div className="flex justify-center mb-3">
                  {Array.from({ length: t.stars }).map((_, s) => (
                    <Star key={s} className="w-4 h-4 text-secondary fill-secondary" />
                  ))}
                </div>
                <blockquote className="text-lg text-foreground mb-4 leading-relaxed">"{t.text}"</blockquote>
                <div className="text-sm font-mono">
                  <span className="text-primary">{t.user}</span>
                  <span className="text-muted-foreground"> · {t.role}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-2 mt-6">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === activeTestimonial ? "bg-primary w-6" : "bg-muted-foreground/30"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-4 md:px-8 bg-card/20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold font-mono mb-3">Transparent Pricing</h2>
            <p className="text-muted-foreground">Start free. Upgrade when you're ready.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-xl border p-6 flex flex-col transition-all duration-250 hover:-translate-y-1 ${
                  plan.highlight
                    ? "border-primary/40 bg-primary/5 shadow-lg vit-glow-cyan"
                    : "border-border bg-card/50"
                }`}
              >
                {plan.highlight && (
                  <Badge className="self-start mb-3 font-mono text-xs bg-primary text-primary-foreground">
                    Most Popular
                  </Badge>
                )}
                <div className="mb-4">
                  <div className="text-sm font-mono text-muted-foreground mb-1">{plan.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold font-mono">{plan.price}</span>
                    <span className="text-sm text-muted-foreground">{plan.period}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">{plan.desc}</div>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register">
                  <Button
                    className="w-full font-mono"
                    variant={plan.highlight ? "default" : "outline"}
                    size="sm"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────── */}
      <section className="py-24 px-4 md:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold font-mono tracking-tight mb-4">
            Ready to gain the edge?
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            Join 50,000+ bettors using AI to beat the market. Free to start. No credit card required.
          </p>
          <Link href="/register">
            <Button size="lg" className="font-mono gap-2 px-10 h-14 text-lg shadow-xl vit-glow-cyan">
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-xs text-muted-foreground mt-4 font-mono">
            100 VITCoin bonus on first prediction · No credit card required
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-8 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span>VIT Sports Intelligence Network</span>
          </div>
          <div className="flex gap-4">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Contact</span>
          </div>
          <span>© {new Date().getFullYear()} VIT Network. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
}
