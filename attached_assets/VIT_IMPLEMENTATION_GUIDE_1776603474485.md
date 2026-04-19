# VIT NETWORK — STEP-BY-STEP FEATURE IMPLEMENTATION GUIDE

**Target**: Get all critical features working this week  
**Effort**: 36 hours (distribute across team)  
**Outcome**: Platform usable for real predictions

---

## TASK 1: Match Fetching & Exploration (Tuesday, 6-8 hours)

### Step 1.1: Create `/app/api/routes/matches.py` (NEW FILE)

```python
# app/api/routes/matches.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime, timedelta
from app.db.database import get_db
from app.db.models import Match, Prediction
from app.core.errors import HTTPException

router = APIRouter(prefix="/matches", tags=["matches"])

@router.get("/upcoming")
async def get_upcoming_matches(
    league: str = Query(None),
    days: int = Query(7),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch upcoming matches for next N days
    
    Filters:
    - league: Filter by league name (optional)
    - days: Days ahead to fetch (default 7)
    
    Returns: List of upcoming matches with odds
    """
    try:
        # Calculate date range
        now = datetime.utcnow()
        future_date = now + timedelta(days=days)
        
        # Build query
        query = select(Match).where(
            and_(
                Match.kickoff_time >= now,
                Match.kickoff_time <= future_date,
                Match.status == "upcoming"
            )
        )
        
        # Optional: filter by league
        if league:
            query = query.where(Match.league == league)
        
        # Order by kickoff time
        query = query.order_by(Match.kickoff_time)
        
        # Execute
        result = await db.execute(query)
        matches = result.scalars().all()
        
        # Format response
        return {
            "count": len(matches),
            "matches": [
                {
                    "match_id": m.id,
                    "home_team": m.home_team,
                    "away_team": m.away_team,
                    "league": m.league,
                    "kickoff_time": m.kickoff_time.isoformat(),
                    "status": m.status,
                    "odds": {
                        "home": m.odds_home,
                        "draw": m.odds_draw,
                        "away": m.odds_away,
                    }
                }
                for m in matches
            ]
        }
    except Exception as e:
        raise HTTPException(500, f"Error fetching upcoming matches: {str(e)}")

@router.get("/explore")
async def explore_matches_with_predictions(
    league: str = Query(None),
    min_edge: float = Query(0.01),
    min_confidence: float = Query(0.50),
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch upcoming matches with AI predictions and edge analysis
    
    Filters:
    - league: Filter by league (optional)
    - min_edge: Minimum edge threshold (default 0.01 = 1%)
    - min_confidence: Minimum confidence threshold (default 0.50)
    
    Returns: Matches with predictions, edges, and confidence scores
    """
    try:
        # Get upcoming matches with predictions
        query = select(Match, func.count(Prediction.id).label("prediction_count")).outerjoin(
            Prediction, Match.id == Prediction.match_id
        ).where(
            and_(
                Match.kickoff_time >= datetime.utcnow(),
                Match.status == "upcoming"
            )
        )
        
        if league:
            query = query.where(Match.league == league)
        
        query = query.group_by(Match.id).order_by(Match.kickoff_time)
        
        result = await db.execute(query)
        matches = result.all()
        
        # Format with AI predictions (from cache or compute)
        formatted_matches = []
        for match, pred_count in matches:
            # Get latest prediction for this match
            pred_query = select(Prediction).where(
                Prediction.match_id == match.id
            ).order_by(Prediction.created_at.desc()).limit(1)
            
            pred_result = await db.execute(pred_query)
            latest_prediction = pred_result.scalar()
            
            # Calculate edge (prediction probability - market implied)
            market_prob = 1 / match.odds_home if match.odds_home else 0
            model_prob = latest_prediction.probability if latest_prediction else 0.50
            edge = model_prob - market_prob
            confidence = latest_prediction.confidence if latest_prediction else 0.50
            
            # Only include if meets thresholds
            if edge >= min_edge and confidence >= min_confidence:
                formatted_matches.append({
                    "match_id": match.id,
                    "home_team": match.home_team,
                    "away_team": match.away_team,
                    "league": match.league,
                    "kickoff_time": match.kickoff_time.isoformat(),
                    "market_odds": {
                        "home": match.odds_home,
                        "draw": match.odds_draw,
                        "away": match.odds_away,
                    },
                    "prediction": {
                        "best_side": latest_prediction.prediction if latest_prediction else "DRAW",
                        "probability": model_prob,
                        "confidence": confidence,
                        "edge": edge,
                    },
                    "prediction_count": pred_count,
                })
        
        return {
            "count": len(formatted_matches),
            "matches": formatted_matches
        }
    except Exception as e:
        raise HTTPException(500, f"Error exploring matches: {str(e)}")

@router.get("/live")
async def get_live_matches(db: AsyncSession = Depends(get_db)):
    """
    Fetch currently live/in-progress matches with live scores
    
    Returns: List of live matches with current scores
    """
    try:
        now = datetime.utcnow()
        
        query = select(Match).where(
            and_(
                Match.status == "live",
                Match.kickoff_time <= now
            )
        )
        
        result = await db.execute(query)
        matches = result.scalars().all()
        
        return {
            "count": len(matches),
            "matches": [
                {
                    "match_id": m.id,
                    "home_team": m.home_team,
                    "away_team": m.away_team,
                    "league": m.league,
                    "status": m.status,
                    "current_time": (datetime.utcnow() - m.kickoff_time).total_seconds() // 60,
                    "current_score": {
                        "home": m.home_goals,
                        "away": m.away_goals,
                    },
                }
                for m in matches
            ]
        }
    except Exception as e:
        raise HTTPException(500, f"Error fetching live matches: {str(e)}")

@router.get("/{match_id}")
async def get_match_detail(match_id: int, db: AsyncSession = Depends(get_db)):
    """
    Get detailed information about a specific match
    
    Includes:
    - Full match details
    - All predictions made on this match
    - Odds comparison
    - Settlement status
    """
    try:
        # Get match
        query = select(Match).where(Match.id == match_id)
        result = await db.execute(query)
        match = result.scalar()
        
        if not match:
            raise HTTPException(404, "Match not found")
        
        # Get all predictions for this match
        pred_query = select(Prediction).where(
            Prediction.match_id == match_id
        ).order_by(Prediction.created_at.desc())
        
        pred_result = await db.execute(pred_query)
        predictions = pred_result.scalars().all()
        
        return {
            "match": {
                "match_id": match.id,
                "home_team": match.home_team,
                "away_team": match.away_team,
                "league": match.league,
                "kickoff_time": match.kickoff_time.isoformat(),
                "status": match.status,
                "odds": {
                    "home": match.odds_home,
                    "draw": match.odds_draw,
                    "away": match.odds_away,
                },
                "result": {
                    "home_goals": match.home_goals,
                    "away_goals": match.away_goals,
                    "actual_outcome": match.actual_outcome,
                } if match.status == "completed" else None,
            },
            "predictions_count": len(predictions),
            "predictions": [
                {
                    "user_id": p.user_id,
                    "prediction": p.prediction,
                    "stake": p.stake,
                    "odds": p.odds,
                    "potential_payout": p.potential_payout,
                    "status": p.status,
                    "created_at": p.created_at.isoformat(),
                }
                for p in predictions[:10]  # Return last 10
            ]
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Error fetching match detail: {str(e)}")
```

### Step 1.2: Register Route in `main.py`

```python
# In main.py, add:

from app.api.routes import matches as matches_route

# Then in the routers section, add:
app.include_router(matches_route.router)
```

### Step 1.3: Create Fixture Fetching Function

```python
# In app/services/football_api.py, add:

async def fetch_upcoming_fixtures(days: int = 7):
    """Fetch upcoming fixtures from Football-Data API"""
    
    from app.db.database import AsyncSessionLocal
    from app.db.models import Match
    from sqlalchemy import insert
    
    try:
        # Call Football-Data API
        api_key = os.getenv("FOOTBALL_DATA_API_KEY")
        headers = {"X-Auth-Token": api_key}
        
        # Common leagues
        league_codes = [
            "PL",      # Premier League
            "LA",      # La Liga
            "BL1",     # Bundesliga
            "SA",      # Serie A
            "FL1",     # Ligue 1
            "ELC",     # Championship
            "PPL",     # Primeira Liga
            "PD",      # Eredivisie
        ]
        
        all_fixtures = []
        
        for league_code in league_codes:
            url = f"https://api.football-data.org/v4/competitions/{league_code}/matches"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=headers) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        all_fixtures.extend(data.get("matches", []))
        
        # Store in database
        async with AsyncSessionLocal() as db:
            for fixture in all_fixtures:
                # Check if already exists
                existing = await db.execute(
                    select(Match).where(Match.match_id == fixture['id'])
                )
                if existing.scalar():
                    continue
                
                # Create match record
                match = Match(
                    match_id=fixture['id'],
                    home_team=fixture['homeTeam']['name'],
                    away_team=fixture['awayTeam']['name'],
                    league=fixture['competition']['name'],
                    kickoff_time=datetime.fromisoformat(fixture['utcDate'].replace('Z', '+00:00')),
                    status=fixture['status'].lower(),
                    odds_home=2.0,  # Placeholder
                    odds_draw=3.0,
                    odds_away=3.5,
                )
                
                db.add(match)
            
            await db.commit()
        
        return len(all_fixtures)
    
    except Exception as e:
        print(f"Error fetching fixtures: {e}")
        return 0
```

### Step 1.4: Create Admin Endpoint to Trigger Fetch

```python
# In app/api/routes/admin.py, add:

@router.post("/matches/fetch-live")
async def fetch_live_matches_admin(api_key: Optional[str] = Query(None)):
    """Admin: Fetch live matches and update database"""
    from app.services.football_api import fetch_upcoming_fixtures
    
    if not verify_admin(api_key):
        raise HTTPException(401, "Unauthorized")
    
    count = await fetch_upcoming_fixtures(days=7)
    return {"fetched": count, "message": f"Fetched {count} fixtures"}
```

### Step 1.5: Update Frontend API Client

```typescript
// frontend/src/api-client/index.ts

export function useListMatches(filters?: {league?: string; status?: string}) {
  return useQuery({
    queryKey: ['matches', filters],
    queryFn: () => apiGet(
      `/matches/upcoming?${filters?.league ? `league=${filters.league}` : ''}`
    ),
  });
}

export function useExploreMatches(filters?: {league?: string; minEdge?: number; minConfidence?: number}) {
  return useQuery({
    queryKey: ['explore-matches', filters],
    queryFn: () => apiGet(
      `/matches/explore?${new URLSearchParams(filters as any).toString()}`
    ),
  });
}

export function useGetMatch(matchId: string) {
  return useQuery({
    queryKey: ['match', matchId],
    queryFn: () => apiGet(`/matches/${matchId}`),
    enabled: !!matchId,
  });
}
```

### Step 1.6: Update Frontend Pages

```typescript
// frontend/src/pages/matches.tsx - Already mostly correct, just needs to use right endpoint

const { data, isLoading } = useListMatches({ league: selectedLeague });
// Should now work!
```

---

## TASK 2: Prediction Flow (Wednesday, 6-8 hours)

### Step 2.1: Ensure Prediction Endpoints Work

```python
# Check in app/api/routes/predict.py:

@router.post("")
async def create_prediction(
    body: PredictionRequest,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new prediction"""
    # Should:
    # 1. Validate user has enough balance
    # 2. Create Prediction record
    # 3. Return prediction details with potential payout
    pass

@router.get("/my")
async def get_user_predictions(
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's active predictions"""
    # Should return all predictions by this user
    pass

@router.get("/{prediction_id}")
async def get_prediction_detail(
    prediction_id: int,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get single prediction details"""
    pass

@router.put("/{prediction_id}/cancel")
async def cancel_prediction(
    prediction_id: int,
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel prediction before match starts"""
    pass
```

### Step 2.2: Create Prediction UI Flow Component

```typescript
// frontend/src/components/PredictionFlow.tsx

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { apiPost } from "@/lib/apiClient";
import { toast } from "sonner";

interface PredictionFlowProps {
  match: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function PredictionFlow({ match, onClose, onSuccess }: PredictionFlowProps) {
  const [selectedSide, setSelectedSide] = useState<"home" | "draw" | "away" | null>(null);
  const [stake, setStake] = useState(50);
  
  const odds = {
    home: match.odds_home || 2.0,
    draw: match.odds_draw || 3.0,
    away: match.odds_away || 3.5,
  };
  
  const potentialPayout = selectedSide ? stake * odds[selectedSide] : 0;
  
  const createPredictionMutation = useMutation({
    mutationFn: (data) => apiPost("/predict", data),
    onSuccess: (data) => {
      toast.success("Prediction created!");
      onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create prediction");
    },
  });
  
  const handleConfirm = () => {
    if (!selectedSide) {
      toast.error("Select a prediction side");
      return;
    }
    
    createPredictionMutation.mutate({
      match_id: match.match_id,
      prediction: selectedSide.toUpperCase(),
      stake,
      odds: odds[selectedSide],
    });
  };
  
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {match.home_team} vs {match.away_team}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Odds Display */}
          <div className="grid grid-cols-3 gap-4">
            <Card
              className={`p-4 cursor-pointer transition-all ${selectedSide === "home" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setSelectedSide("home")}
            >
              <div className="text-sm text-muted-foreground">{match.home_team}</div>
              <div className="text-2xl font-bold">{odds.home}</div>
            </Card>
            
            <Card
              className={`p-4 cursor-pointer transition-all ${selectedSide === "draw" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setSelectedSide("draw")}
            >
              <div className="text-sm text-muted-foreground">DRAW</div>
              <div className="text-2xl font-bold">{odds.draw}</div>
            </Card>
            
            <Card
              className={`p-4 cursor-pointer transition-all ${selectedSide === "away" ? "ring-2 ring-blue-500" : ""}`}
              onClick={() => setSelectedSide("away")}
            >
              <div className="text-sm text-muted-foreground">{match.away_team}</div>
              <div className="text-2xl font-bold">{odds.away}</div>
            </Card>
          </div>
          
          {/* Stake Input */}
          <div>
            <label className="text-sm font-medium">Stake (VIT)</label>
            <Input
              type="number"
              value={stake}
              onChange={(e) => setStake(Number(e.target.value))}
              min="1"
              max="1000"
            />
          </div>
          
          {/* Payout Display */}
          {selectedSide && (
            <Card className="p-4 bg-blue-50">
              <div className="text-sm text-muted-foreground">Potential Payout</div>
              <div className="text-3xl font-bold text-blue-600">{potentialPayout.toFixed(2)} VIT</div>
              <div className="text-xs text-muted-foreground mt-1">
                Return: {potentialPayout - stake > 0 ? "+" : ""}{(potentialPayout - stake).toFixed(2)} VIT
              </div>
            </Card>
          )}
          
          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedSide || createPredictionMutation.isPending}
              className="flex-1"
            >
              {createPredictionMutation.isPending ? "Creating..." : "Confirm Prediction"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 2.3: Update Predictions Page

```typescript
// frontend/src/pages/predictions.tsx

import { useState } from "react";
import { useListMyPredictions } from "@/api-client";
import { PredictionFlow } from "@/components/PredictionFlow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PredictionsPage() {
  const [selectedMatch, setSelectedMatch] = useState(null);
  const { data: predictions, refetch } = useListMyPredictions();
  
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Predictions</h1>
      
      {predictions?.map((pred) => (
        <Card key={pred.prediction_id}>
          <CardHeader>
            <CardTitle>{pred.home_team} vs {pred.away_team}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>Prediction: <Badge>{pred.prediction}</Badge></div>
            <div>Stake: {pred.stake} VIT @ {pred.odds}</div>
            <div>Potential Payout: {pred.potential_payout} VIT</div>
            <div>Status: <Badge variant={pred.status === "pending" ? "yellow" : "green"}>{pred.status}</Badge></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

---

## TASK 3: Admin Match Management (Thursday, 4-6 hours)

### Step 3.1: Fix Accumulator Endpoints

Refer to the existing `admin.py` endpoints but fix them to:
1. Return real data instead of mock
2. Handle errors properly
3. Validate inputs
4. Log actions

(Code provided above in main feature audit)

### Step 3.2: Admin Dashboard to Trigger Fetch

```typescript
// frontend/src/pages/admin.tsx

<Button onClick={() => fetchLiveMatches.mutate()}>
  Fetch Live Matches
</Button>

<Button onClick={() => fetchFixtures.mutate()}>
  Fetch Upcoming Fixtures
</Button>
```

---

## TASK 4: User Analytics (Friday, 4-6 hours)

### Step 4.1: Implement Analytics Endpoint

```python
# In app/api/routes/analytics.py

@router.get("/my")
async def get_user_analytics(
    user_id: int = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user's prediction analytics"""
    # Calculate:
    # - Total predictions
    # - Win rate
    # - ROI
    # - Accuracy by league
    # - Accuracy by market
    # - Total payout
    # - Current balance
    pass
```

---

## 📅 SCHEDULE THIS WEEK

```
Tuesday (6-8 hrs):
  ✅ Create matches.py
  ✅ Implement fetch_fixtures()
  ✅ Register routes
  → Matches visible to users

Wednesday (8 hrs):
  ✅ Complete prediction endpoints
  ✅ Create PredictionFlow component
  ✅ Update predictions page
  → Users can make predictions

Thursday (4-6 hrs):
  ✅ Fix accumulator endpoints
  ✅ Admin fetch triggers
  ✅ Admin dashboard updates
  → Admin can manage system

Friday (4-6 hrs):
  ✅ Analytics endpoint
  ✅ Dashboard data
  ✅ Leaderboard
  → Users see their performance

TOTAL: 36-42 hours
TEAM: 2-3 developers
COMPLETION: Friday EOD
```

---

## ✅ VERIFICATION CHECKLIST

After implementing each feature:

**Matches Feature**:
- [ ] GET /matches/upcoming returns matches
- [ ] GET /matches/explore returns matches with edges
- [ ] Frontend pages/matches shows real data
- [ ] Can filter by league

**Predictions Feature**:
- [ ] POST /predict creates prediction
- [ ] GET /predictions/my returns user predictions
- [ ] PredictionFlow UI works
- [ ] Potential payout calculated correctly

**Accumulator Feature**:
- [ ] GET /admin/accumulator/candidates returns real data
- [ ] POST /admin/accumulator/generate creates accumulators
- [ ] Frontend can fetch and generate

**Admin Feature**:
- [ ] POST /admin/matches/fetch-live works
- [ ] Admin can trigger match fetches
- [ ] Dashboard shows metrics

**Analytics Feature**:
- [ ] GET /analytics/my returns user stats
- [ ] ROI/win rate calculated correctly
- [ ] Frontend dashboard displays data

---

**Status**: ALL CRITICAL FEATURES FIXABLE THIS WEEK ✅

