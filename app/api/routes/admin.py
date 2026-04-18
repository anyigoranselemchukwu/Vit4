# app/api/routes/admin.py
# VIT Sports Intelligence Network — v2.2.0 + v2.3.0
#
# v2.2.0 New Endpoints:
#   GET  /admin/models/status          — per-model status + error message
#   POST /admin/models/reload          — reload all or single model
#   GET  /admin/data-sources/status    — Football API + Odds API health check
#   POST /admin/matches/manual         — add a single fixture manually
#   POST /admin/upload/csv             — bulk upload fixtures via CSV
#
# v2.3.0 New Endpoints:
#   GET  /admin/accumulator/candidates — top picks per market type
#   POST /admin/accumulator/generate   — build top-10 accumulators
#   POST /admin/accumulator/send       — push an accumulator to Telegram

import asyncio
import csv
import hashlib
import io
import json
import logging
import os
import zipfile
import shutil
from datetime import datetime, timezone, timedelta
from itertools import combinations
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select

from app.config import get_env, APP_VERSION
from app.db.database import AsyncSessionLocal
from app.db.models import Match, Prediction
from app.services.market_utils import MarketUtils
from app.core.dependencies import get_orchestrator, get_telegram_alerts
from app.services.results_settler import settle_results, fetch_live_matches
from app.auth.dependencies import get_current_admin

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
    dependencies=[Depends(get_current_admin)],
)

orchestrator = get_orchestrator()
telegram_alerts = get_telegram_alerts()
VERSION = APP_VERSION


def create_request_hash(home: str, away: str, league: str, kickoff_time: str) -> str:
    try:
        kickoff_dt = datetime.fromisoformat(kickoff_time.replace("Z", "+00:00"))
    except Exception:
        kickoff_dt = datetime.now()

    content = {
        "home_team": home,
        "away_team": away,
        "kickoff_time": kickoff_dt.isoformat(),
        "league": league,
    }
    return hashlib.sha256(json.dumps(content, sort_keys=True).encode()).hexdigest()[:32]

COMPETITIONS = {
    "premier_league": "PL",
    "serie_a":        "SA",
    "la_liga":        "PD",
    "bundesliga":     "BL1",
    "ligue_1":        "FL1",
    "championship":   "ELC",
    "eredivisie":     "DED",
    "primeira_liga":  "PPL",
    "scottish_premiership": "SPL",
    "belgian_pro_league": "BJL",
}


def _verify_key(api_key: Optional[str] = None):
    auth_enabled = os.getenv("AUTH_ENABLED", "false").lower() == "true"
    if not auth_enabled:
        return
    if api_key is None:
        return
    expected = get_env("API_KEY", "")
    if not expected or api_key != expected:
        raise HTTPException(status_code=403, detail="Invalid admin key")


# ======================================================================
# API KEY MANAGEMENT
# ======================================================================

_ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env")

# Registry of every configurable key exposed through the admin UI
_KEY_REGISTRY = [
    {
        "name":        "FOOTBALL_DATA_API_KEY",
        "label":       "Football-Data.org",
        "description": "Fetches scheduled fixtures and match history",
        "required":    True,
    },
    {
        "name":        "ODDS_API_KEY",
        "label":       "The Odds API",
        "description": "Live betting odds and market data (also readable as THE_ODDS_API_KEY)",
        "required":    True,
    },
    {
        "name":        "TELEGRAM_BOT_TOKEN",
        "label":       "Telegram Bot Token",
        "description": "Sends alerts and accumulators via Telegram",
        "required":    False,
    },
    {
        "name":        "TELEGRAM_CHAT_ID",
        "label":       "Telegram Chat / Channel ID",
        "description": "Target chat or channel for Telegram messages",
        "required":    False,
    },
    {
        "name":        "BZZOIRO_API_KEY",
        "label":       "Bzzoiro AI Feed",
        "description": "Free AI predictions from sports.bzzoiro.com",
        "required":    False,
    },
    {
        "name":        "SPORTBOT_API_KEY",
        "label":       "SportBot AI Feed",
        "description": "Free-tier AI predictions from sportbot.ai",
        "required":    False,
    },
    {
        "name":        "GEMINI_API_KEY",
        "label":       "Google Gemini AI",
        "description": "Powers AI match insights and tactical analysis shown on every prediction detail",
        "required":    False,
    },
    {
        "name":        "ANTHROPIC_API_KEY",
        "label":       "Anthropic Claude",
        "description": "Claude 3 Haiku — second AI analyst for multi-AI match insights",
        "required":    False,
    },
    {
        "name":        "XAI_API_KEY",
        "label":       "xAI Grok",
        "description": "Grok Beta — third AI analyst for multi-AI match insights",
        "required":    False,
    },
    {
        "name":        "API_KEY",
        "label":       "Admin API Key",
        "description": "Master key used to authenticate all admin endpoints",
        "required":    True,
    },
]


def _mask(value: str) -> str:
    """Return a safely masked version of an API key."""
    if not value:
        return ""
    if len(value) <= 4:
        return "••••"
    return "•" * min(len(value) - 4, 24) + value[-4:]


def _write_env(key: str, value: str) -> None:
    """Persist key=value to the .env file AND update os.environ immediately."""
    os.environ[key] = value
    try:
        env_path = _ENV_PATH
        lines: list[str] = []
        found = False
        if os.path.exists(env_path):
            with open(env_path, "r") as f:
                lines = f.readlines()
        new_lines = []
        for line in lines:
            if line.startswith(f"{key}=") or line.startswith(f"{key} ="):
                new_lines.append(f'{key}="{value}"\n')
                found = True
            else:
                new_lines.append(line)
        if not found:
            new_lines.append(f'{key}="{value}"\n')
        with open(env_path, "w") as f:
            f.writelines(new_lines)
    except Exception as e:
        logger.warning(f"Could not persist {key} to .env: {e}")


class ApiKeyUpdate(BaseModel):
    updates: dict  # {ENV_VAR_NAME: new_value, ...}


@router.get("/api-keys")
async def list_api_keys(api_key: Optional[str] = Query(default=None)):
    """
    Return all configurable API keys with masked current values.
    Never returns plaintext secrets.
    """
    _verify_key(api_key)
    keys = []
    for entry in _KEY_REGISTRY:
        current = os.getenv(entry["name"], "")
        keys.append({
            "name":        entry["name"],
            "label":       entry["label"],
            "description": entry["description"],
            "required":    entry["required"],
            "is_set":      bool(current),
            "masked":      _mask(current),
        })
    return {"keys": keys, "total": len(keys)}


@router.post("/api-keys/update")
async def update_api_keys(body: ApiKeyUpdate, api_key: Optional[str] = Query(default=None)):
    """
    Update one or more API keys. Changes take effect immediately
    (os.environ) and are persisted to .env for restart survival.
    """
    _verify_key(api_key)
    allowed_names = {entry["name"] for entry in _KEY_REGISTRY}
    results = {}
    errors  = {}

    for key_name, new_value in body.updates.items():
        if key_name not in allowed_names:
            errors[key_name] = "Not a recognised key name"
            continue
        if not isinstance(new_value, str):
            errors[key_name] = "Value must be a string"
            continue
        new_value = new_value.strip()
        if not new_value:
            errors[key_name] = "Value cannot be empty"
            continue
        try:
            _write_env(key_name, new_value)
            results[key_name] = "updated"
            logger.info(f"API key updated: {key_name}")
        except Exception as e:
            errors[key_name] = str(e)

    return {
        "updated": results,
        "errors":  errors,
        "message": f"{len(results)} key(s) updated successfully" + (f", {len(errors)} error(s)" if errors else ""),
    }


# ======================================================================
# v2.2.0 — MODEL MANAGEMENT
# ======================================================================

@router.get("/models/status")
async def get_models_status(api_key: Optional[str] = Query(default=None)):
    """
    Return per-model status, weight, and error message.
    Powers the Model Status Dashboard in the admin panel.
    """
    _verify_key(api_key)
    if orchestrator is None:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")

    status = orchestrator.get_model_status()
    return {
        "version": VERSION,
        "ready":   status.get("ready", 0),
        "total":   status.get("total", 12),
        "models":  status.get("models", []),
    }


class ReloadRequest(BaseModel):
    model_key: Optional[str] = None  # None = reload all


@router.post("/models/reload")
async def reload_models(body: ReloadRequest, api_key: Optional[str] = Query(default=None)):
    """
    Reload all models or a single model by key.
    One-click fix for failed models.
    """
    _verify_key(api_key)
    if orchestrator is None:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")

    try:
        results = orchestrator.load_all_models()
        ready   = sum(1 for v in results.values() if v)
        return {
            "message": f"Reload complete: {ready}/{len(results)} models ready",
            "results": results,
            "ready":   ready,
            "total":   len(results),
        }
    except Exception as e:
        logger.error(f"Model reload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ======================================================================
# v2.2.0 — DATA SOURCE HEALTH
# ======================================================================

@router.get("/data-sources/status")
async def data_sources_status(api_key: Optional[str] = Query(default=None)):
    """
    Check connectivity to Football-Data.org and The Odds API.
    Shown as live/down/no-key badges in the admin panel.
    """
    _verify_key(api_key)

    football_key = os.getenv("FOOTBALL_DATA_API_KEY", "")
    odds_key     = os.getenv("ODDS_API_KEY", "") or os.getenv("THE_ODDS_API_KEY", "")

    results = {}

    # Football-Data.org
    if not football_key:
        results["football_data"] = {"status": "no_key", "message": "FOOTBALL_DATA_API_KEY not set"}
    else:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(
                    "https://api.football-data.org/v4/competitions/PL",
                    headers={"X-Auth-Token": football_key},
                )
                if r.status_code == 200:
                    results["football_data"] = {"status": "live", "message": "Connected"}
                elif r.status_code == 403:
                    results["football_data"] = {"status": "error", "message": "Invalid API key"}
                elif r.status_code == 429:
                    results["football_data"] = {"status": "limited", "message": "Rate limited"}
                else:
                    results["football_data"] = {"status": "error", "message": f"HTTP {r.status_code}"}
        except Exception as e:
            results["football_data"] = {"status": "down", "message": str(e)}

    # The Odds API
    if not odds_key:
        results["odds_api"] = {"status": "no_key", "message": "ODDS_API_KEY not set"}
    else:
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                r = await client.get(
                    "https://api.the-odds-api.com/v4/sports",
                    params={"apiKey": odds_key},
                )
                if r.status_code == 200:
                    remaining = r.headers.get("x-requests-remaining", "?")
                    results["odds_api"] = {"status": "live", "message": f"Connected — {remaining} requests remaining"}
                elif r.status_code == 401:
                    results["odds_api"] = {"status": "error", "message": "Invalid API key"}
                else:
                    results["odds_api"] = {"status": "error", "message": f"HTTP {r.status_code}"}
        except Exception as e:
            results["odds_api"] = {"status": "down", "message": str(e)}

    return {"sources": results, "checked_at": datetime.now(timezone.utc).isoformat()}


# ======================================================================
# v2.2.0 — MANUAL MATCH ENTRY
# ======================================================================

class ManualMatchRequest(BaseModel):
    home_team:    str
    away_team:    str
    league:       str = "premier_league"
    kickoff_time: str                      # ISO string
    home_odds:    float = 2.30
    draw_odds:    float = 3.30
    away_odds:    float = 3.10


@router.post("/matches/manual")
async def add_manual_match(body: ManualMatchRequest, api_key: Optional[str] = Query(default=None)):
    """
    Add a single fixture manually and run a prediction immediately.
    Used when the Football-Data API is down.
    """
    _verify_key(api_key)
    if orchestrator is None:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")

    if body.home_team.strip() == body.away_team.strip():
        raise HTTPException(status_code=422, detail="Home and away teams must differ")

    if not MarketUtils.validate_odds_dict({
        "home": body.home_odds, "draw": body.draw_odds, "away": body.away_odds
    }):
        raise HTTPException(status_code=422, detail="Invalid odds — must be between 1.01 and 100")

    features = {
        "home_team":   body.home_team.strip(),
        "away_team":   body.away_team.strip(),
        "league":      body.league,
        "market_odds": {"home": body.home_odds, "draw": body.draw_odds, "away": body.away_odds},
    }

    try:
        kickoff_dt = datetime.fromisoformat(body.kickoff_time.replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        kickoff_dt = datetime.now()

    request_hash = create_request_hash(body.home_team.strip(), body.away_team.strip(), body.league, kickoff_dt.isoformat())

    try:
        raw   = await orchestrator.predict(features, request_hash)
        preds = raw.get("predictions", {})
        best  = MarketUtils.determine_best_bet(
            preds.get("home_prob", 0.33),
            preds.get("draw_prob", 0.33),
            preds.get("away_prob", 0.33),
            body.home_odds, body.draw_odds, body.away_odds,
        )

        async with AsyncSessionLocal() as db:
            existing_pred = await db.execute(select(Prediction).where(Prediction.request_hash == request_hash))
            existing = existing_pred.scalar_one_or_none()
            if existing:
                return {
                    "status": "ok",
                    "match_id": existing.match_id,
                    "prediction_id": existing.id,
                    "home_team": body.home_team,
                    "away_team": body.away_team,
                    "predictions": preds,
                    "best_bet": best,
                    "message": "Existing manual match prediction returned",
                }

            db_match = Match(
                home_team=body.home_team.strip(),
                away_team=body.away_team.strip(),
                league=body.league,
                kickoff_time=kickoff_dt,
                opening_odds_home=body.home_odds,
                opening_odds_draw=body.draw_odds,
                opening_odds_away=body.away_odds,
            )
            db.add(db_match)
            await db.flush()

            home_prob = float(preds.get("home_prob", 0.33))
            draw_prob = float(preds.get("draw_prob", 0.33))
            away_prob = float(preds.get("away_prob", 0.34))
            individual_results = raw.get("individual_results", [])
            model_insights_payload = [
                {
                    "model_name": p.get("model_name"),
                    "model_type": p.get("model_type"),
                    "model_weight": p.get("model_weight", 1.0),
                    "supported_markets": p.get("supported_markets", []),
                    "home_prob": p.get("home_prob"),
                    "draw_prob": p.get("draw_prob"),
                    "away_prob": p.get("away_prob"),
                    "over_2_5_prob": p.get("over_2_5_prob"),
                    "btts_prob": p.get("btts_prob"),
                    "confidence": p.get("confidence", {}),
                    "latency_ms": p.get("latency_ms"),
                    "failed": p.get("failed", False),
                    "error": p.get("error"),
                }
                for p in individual_results
            ]
            confidence_raw = preds.get("confidence", raw.get("confidence", 0.65))
            confidence = confidence_raw.get("1x2", 0.65) if isinstance(confidence_raw, dict) else float(confidence_raw or 0.65)
            prediction = Prediction(
                request_hash=request_hash,
                match_id=db_match.id,
                home_prob=home_prob,
                draw_prob=draw_prob,
                away_prob=away_prob,
                over_25_prob=preds.get("over_25_prob") or preds.get("over_2_5_prob"),
                under_25_prob=preds.get("under_25_prob") or preds.get("under_2_5_prob"),
                btts_prob=preds.get("btts_prob"),
                no_btts_prob=preds.get("no_btts_prob"),
                consensus_prob=max(home_prob, draw_prob, away_prob),
                final_ev=best.get("edge", 0),
                recommended_stake=best.get("kelly_stake", 0),
                model_weights=preds.get("model_weights", raw.get("model_weights", {})),
                model_insights=model_insights_payload,
                confidence=confidence,
                bet_side=best.get("best_side"),
                entry_odds=best.get("odds", 2.0),
                raw_edge=best.get("raw_edge", 0),
                normalized_edge=best.get("edge", 0),
                vig_free_edge=best.get("edge", 0),
            )
            db.add(prediction)
            await db.commit()

        return {
            "status":      "ok",
            "match_id":    db_match.id,
            "prediction_id": prediction.id,
            "home_team":   body.home_team,
            "away_team":   body.away_team,
            "predictions": preds,
            "best_bet":    best,
        }
    except Exception as e:
        logger.error(f"Manual match prediction failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload/insights")
async def upload_match_insights(
    api_key: Optional[str] = Query(default=None),
    match_id: Optional[int] = Form(default=None),
    file: UploadFile = File(...),
):
    _verify_key(api_key)
    if not file.filename.lower().endswith(".json"):
        raise HTTPException(status_code=422, detail="File must be a .json insight file")

    try:
        raw = json.loads((await file.read()).decode("utf-8"))
        if not isinstance(raw, dict):
            raise ValueError("Top-level JSON must be an object")
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Invalid JSON: {exc}")

    from app.services.insight_store import infer_match_id, save_match_insights

    resolved_match_id = match_id or infer_match_id(raw)
    if not resolved_match_id:
        raise HTTPException(status_code=422, detail="match_id is required either in the form or inside the JSON")

    async with AsyncSessionLocal() as db:
        match_row = await db.execute(select(Match).where(Match.id == resolved_match_id))
        if not match_row.scalar_one_or_none():
            raise HTTPException(status_code=404, detail=f"Match {resolved_match_id} not found")

    try:
        saved = save_match_insights(resolved_match_id, raw)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    return {"status": "ok", **saved}


# ======================================================================
# v2.2.0 — CSV BULK UPLOAD
# ======================================================================

@router.post("/upload/csv")
async def upload_csv_fixtures(
    api_key: Optional[str] = Query(default=None),
    file:    UploadFile = File(...),
):
    """
    Upload a CSV of fixtures and run batch predictions.

    Expected CSV columns (header required):
      home_team, away_team, league, kickoff_time, home_odds, draw_odds, away_odds

    Returns a prediction for each valid row.
    """
    _verify_key(api_key)
    if orchestrator is None:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=422, detail="File must be a .csv")

    content  = await file.read()
    text     = content.decode("utf-8", errors="replace")
    reader   = csv.DictReader(io.StringIO(text))

    REQUIRED = {"home_team", "away_team"}
    if reader.fieldnames is None or not REQUIRED.issubset(set(reader.fieldnames)):
        raise HTTPException(
            status_code=422,
            detail=f"CSV must contain columns: {', '.join(REQUIRED)}"
        )

    results = []
    errors  = []

    for i, row in enumerate(reader):
        home = row.get("home_team", "").strip()
        away = row.get("away_team", "").strip()

        if not home or not away:
            errors.append({"row": i + 2, "error": "Missing home_team or away_team"})
            continue

        try:
            home_odds = float(row.get("home_odds", 2.30))
            draw_odds = float(row.get("draw_odds", 3.30))
            away_odds = float(row.get("away_odds", 3.10))
        except ValueError:
            errors.append({"row": i + 2, "error": "Invalid odds values"})
            continue

        league = row.get("league", "premier_league").strip()

        features = {
            "home_team":   home,
            "away_team":   away,
            "league":      league,
            "market_odds": {"home": home_odds, "draw": draw_odds, "away": away_odds},
        }

        try:
            raw  = await orchestrator.predict(features, f"csv_{i}_{home}_{away}")
            pred = raw.get("predictions", {})
            best = MarketUtils.determine_best_bet(
                pred.get("home_prob", 0.33),
                pred.get("draw_prob", 0.33),
                pred.get("away_prob", 0.33),
                home_odds, draw_odds, away_odds,
            )
            results.append({
                "row":        i + 2,
                "home_team":  home,
                "away_team":  away,
                "league":     league,
                "kickoff":    row.get("kickoff_time", ""),
                "home_prob":  round(pred.get("home_prob", 0), 3),
                "draw_prob":  round(pred.get("draw_prob", 0), 3),
                "away_prob":  round(pred.get("away_prob", 0), 3),
                "edge":       round(best.get("edge", 0), 4),
                "stake":      round(best.get("kelly_stake", 0), 4),
                "best_side":  best.get("best_side"),
                "has_edge":   best.get("has_edge", False),
                "home_odds":  home_odds,
                "draw_odds":  draw_odds,
                "away_odds":  away_odds,
            })
        except Exception as e:
            errors.append({"row": i + 2, "error": str(e)})

    return {
        "processed": len(results),
        "errors":    len(errors),
        "results":   results,
        "error_details": errors,
    }


# ======================================================================
# v3.1.0 — MODEL WEIGHTS UPLOAD
# ======================================================================

MODELS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "models")
DATA_DIR   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "data")

@router.post("/upload/models")
async def upload_model_weights(
    api_key: Optional[str] = Query(default=None),
    file: UploadFile = File(...),
):
    """
    Accept a vit_models.zip produced by the Colab training notebook.
    Extracts .pkl files into the models/ directory and
    historical_matches.json into data/, then reloads the orchestrator.
    """
    _verify_key(api_key)

    if not file.filename.endswith(".zip"):
        raise HTTPException(status_code=422, detail="File must be a .zip (from the Colab training notebook)")

    os.makedirs(MODELS_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)

    content = await file.read()
    saved_models = []
    saved_data   = []
    skipped      = []

    try:
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            for member in zf.namelist():
                basename = os.path.basename(member)
                if not basename:
                    continue

                # .pkl files → models/
                if basename.endswith(".pkl"):
                    dest = os.path.join(MODELS_DIR, basename)
                    with zf.open(member) as src, open(dest, "wb") as dst:
                        shutil.copyfileobj(src, dst)
                    saved_models.append(basename)
                    logger.info(f"📦 Saved model weight: {basename}")

                # training data/metrics → data/
                elif basename in {"historical_matches.json", "training_metrics.json"}:
                    dest = os.path.join(DATA_DIR, basename)
                    with zf.open(member) as src, open(dest, "wb") as dst:
                        shutil.copyfileobj(src, dst)
                    saved_data.append(basename)
                    logger.info(f"📊 Saved training data: {basename}")

                else:
                    skipped.append(basename)

    except zipfile.BadZipFile:
        raise HTTPException(status_code=422, detail="Invalid zip file — please re-download from Colab")
    except Exception as e:
        logger.error(f"Model upload failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

    # Reload orchestrator so new weights are picked up immediately
    reload_results = {}
    models_ready   = 0
    if orchestrator is not None and saved_models:
        try:
            reload_results = orchestrator.load_all_models()
            models_ready   = sum(1 for v in reload_results.values() if v)
            logger.info(f"♻️  Orchestrator reloaded: {models_ready}/{len(reload_results)} models ready")
        except Exception as e:
            logger.warning(f"Orchestrator reload failed after upload: {e}")

    return {
        "message":      f"Upload complete — {len(saved_models)} model file(s) saved, {models_ready} models now active",
        "saved_models": saved_models,
        "saved_data":   saved_data,
        "skipped":      skipped,
        "models_ready": models_ready,
        "models_total": orchestrator._total_model_specs if orchestrator else 0,
        "reload_results": reload_results,
    }


# ======================================================================
# v2.3.0 — ACCUMULATOR ENGINE
# ======================================================================

@router.get("/accumulator/candidates")
async def get_accumulator_candidates(
    api_key: Optional[str] = Query(default=None),
    min_confidence:  float = Query(default=0.60),
    min_edge:        float = Query(default=0.01),
    count:           int   = Query(default=15, le=30),
):
    """
    Fetch upcoming fixtures and return top candidates for accumulators.
    Each candidate includes edge, confidence, and market type.
    """
    _verify_key(api_key)
    if orchestrator is None:
        raise HTTPException(status_code=503, detail="Orchestrator not initialized")

    fixtures = await _fetch_fixtures(count)
    candidates = []

    for fix in fixtures:
        home = fix["home_team"]
        away = fix["away_team"]
        mkt  = fix.get("market_odds", {})

        home_odds = float(mkt.get("home", 2.30))
        draw_odds = float(mkt.get("draw", 3.30))
        away_odds = float(mkt.get("away", 3.10))

        try:
            raw  = await orchestrator.predict({
                "home_team":   home,
                "away_team":   away,
                "league":      fix["league"],
                "market_odds": mkt,
            }, f"acc_{home}_{away}")
            pred = raw.get("predictions", {})
        except Exception as e:
            logger.warning(f"Prediction failed for {home} vs {away}: {e}")
            continue

        home_prob = pred.get("home_prob", 0.33)
        draw_prob = pred.get("draw_prob", 0.33)
        away_prob = pred.get("away_prob", 0.33)
        confidence = pred.get("confidence", {}).get("1x2", 0.60)
        models_used = pred.get("models_used", 0)
        data_source = pred.get("data_source", "market_implied")

        best = MarketUtils.determine_best_bet(
            home_prob, draw_prob, away_prob,
            home_odds, draw_odds, away_odds,
        )

        edge = best.get("edge", 0)
        best_side = best.get("best_side")
        best_odds_val = best.get("odds", 2.0)

        if best_side and confidence >= min_confidence and edge >= min_edge:
            candidates.append({
                "home_team":   home,
                "away_team":   away,
                "league":      fix["league"],
                "kickoff":     fix["kickoff_time"][:16],
                "best_side":   best_side,
                "best_odds":   round(best_odds_val, 2),
                "edge":        round(edge, 4),
                "confidence":  round(confidence, 3),
                "home_prob":   round(home_prob, 3),
                "draw_prob":   round(draw_prob, 3),
                "away_prob":   round(away_prob, 3),
                "models_used": models_used,
                "data_source": data_source,
                "home_odds":   home_odds,
                "draw_odds":   draw_odds,
                "away_odds":   away_odds,
            })

    # Sort by confidence × edge (highest expected value first)
    candidates.sort(key=lambda x: x["confidence"] * x["edge"], reverse=True)

    return {
        "candidates":  candidates[:count],
        "total_found": len(candidates),
        "filters": {"min_confidence": min_confidence, "min_edge": min_edge},
    }


class AccumulatorRequest(BaseModel):
    candidates:     List[dict]
    min_legs:       int   = 2
    max_legs:       int   = 6
    min_combined_edge: float = 0.0
    top_n:          int   = 10


def _correlation_penalty(legs: List[dict]) -> float:
    """
    Apply a correlation penalty for same-league matches.
    Same league in one acca = -1.5% per pair.
    """
    leagues = [leg["league"] for leg in legs]
    same_league_pairs = sum(
        1 for a, b in combinations(range(len(leagues)), 2)
        if leagues[a] == leagues[b]
    )
    return same_league_pairs * 0.015


@router.post("/accumulator/generate")
async def generate_accumulators(body: AccumulatorRequest, api_key: Optional[str] = Query(default=None)):
    """
    Generate top-N accumulators from the provided candidates.

    For each combination:
    - Combined probability = product of individual probs
    - Fair combined odds   = 1 / combined_prob
    - Market combined odds = product of best_odds
    - Combined edge        = fair_odds - market_odds (as %)
    - Correlation penalty  = -1.5% per same-league pair
    """
    _verify_key(api_key)

    candidates = body.candidates
    if len(candidates) < body.min_legs:
        raise HTTPException(
            status_code=422,
            detail=f"Need at least {body.min_legs} candidates. Got {len(candidates)}."
        )

    accumulators = []

    for n_legs in range(body.min_legs, min(body.max_legs, len(candidates)) + 1):
        for combo in combinations(candidates, n_legs):
            legs = list(combo)

            # Combined probability
            combined_prob = 1.0
            for leg in legs:
                prob_map = {"home": leg["home_prob"], "draw": leg["draw_prob"], "away": leg["away_prob"]}
                combined_prob *= prob_map.get(leg["best_side"], 0.33)

            if combined_prob <= 0:
                continue

            # Combined market odds (what bookmaker would offer)
            combined_odds = 1.0
            for leg in legs:
                combined_odds *= leg["best_odds"]

            # Fair odds from model
            fair_odds = 1.0 / combined_prob

            # Edge = what we think it's worth vs what book offers
            combined_edge = (combined_prob - (1.0 / combined_odds))

            # Penalty for correlated legs
            penalty = _correlation_penalty(legs)
            adjusted_edge = combined_edge - penalty

            # Average confidence across legs
            avg_confidence = sum(leg["confidence"] for leg in legs) / len(legs)

            # Kelly for the accumulator
            b = combined_odds - 1
            p = combined_prob
            q = 1 - p
            kelly = max(0, (b * p - q) / b) if b > 0 else 0
            kelly = min(kelly, 0.03)  # Cap at 3% for accumulators

            if adjusted_edge >= body.min_combined_edge:
                accumulators.append({
                    "n_legs":          n_legs,
                    "legs":            legs,
                    "combined_prob":   round(combined_prob, 4),
                    "combined_odds":   round(combined_odds, 2),
                    "fair_odds":       round(fair_odds, 2),
                    "combined_edge":   round(combined_edge, 4),
                    "correlation_penalty": round(penalty, 4),
                    "adjusted_edge":   round(adjusted_edge, 4),
                    "avg_confidence":  round(avg_confidence, 3),
                    "kelly_stake":     round(kelly, 4),
                })

    # Sort by adjusted_edge descending
    accumulators.sort(key=lambda x: x["adjusted_edge"], reverse=True)
    top = accumulators[:body.top_n]

    return {
        "accumulators":    top,
        "total_generated": len(accumulators),
        "top_n":           body.top_n,
    }


class SendAccumulatorRequest(BaseModel):
    accumulator: dict
    channel_note: str = ""


@router.post("/accumulator/send")
async def send_accumulator_to_telegram(body: SendAccumulatorRequest, api_key: Optional[str] = Query(default=None)):
    """
    Push a single accumulator to Telegram.
    """
    _verify_key(api_key)
    if telegram_alerts is None or not telegram_alerts.enabled:
        raise HTTPException(status_code=503, detail="Telegram alerts not enabled")

    acc = body.accumulator
    legs = acc.get("legs", [])

    legs_text = ""
    for i, leg in enumerate(legs, 1):
        side_labels = {"home": "HOME WIN", "draw": "DRAW", "away": "AWAY WIN"}
        side = side_labels.get(leg["best_side"], leg["best_side"].upper())
        legs_text += (
            f"  {i}. {leg['home_team']} vs {leg['away_team']}\n"
            f"     → {side} @ {leg['best_odds']:.2f} "
            f"(conf: {leg['confidence']:.0%})\n"
        )

    adj_edge = acc.get("adjusted_edge", 0)
    edge_emoji = "🔥🔥🔥" if adj_edge > 0.05 else ("🔥🔥" if adj_edge > 0.03 else "🔥")

    message = f"""<b>🎰 VIT ACCUMULATOR</b>
━━━━━━━━━━━━━━━━━━━━━

<b>🏆 {acc.get('n_legs', len(legs))}-Leg Accumulator</b>

<b>Selections:</b>
{legs_text.strip()}

<b>📊 Combined Odds:</b> {acc.get('combined_odds', 0):.2f}
<b>📈 Edge:</b> {adj_edge:+.2%} {edge_emoji}
<b>🎯 Avg Confidence:</b> {acc.get('avg_confidence', 0):.0%}
<b>💵 Suggested Stake:</b> {acc.get('kelly_stake', 0):.1%} of bankroll

{f'<i>{body.channel_note}</i>' if body.channel_note else ''}
━━━━━━━━━━━━━━━━━━━━━
<i>VIT Sports Intelligence v{VERSION}</i>"""

    from app.services.alerts import AlertPriority
    success = await telegram_alerts.send_message(message.strip(), AlertPriority.BET)
    return {"sent": success, "message_preview": message[:200]}


# ======================================================================
# EXISTING ENDPOINTS — preserved from v2.0
# ======================================================================

async def _fetch_fixtures(count: int, target_date: Optional[str] = None) -> list:
    football_key = os.getenv("FOOTBALL_DATA_API_KEY", "")
    odds_key     = os.getenv("ODDS_API_KEY", "") or os.getenv("THE_ODDS_API_KEY", "")
    now          = datetime.now(timezone.utc)
    if target_date:
        date_from = target_date
        date_to   = target_date
    else:
        date_from = now.strftime("%Y-%m-%d")
        date_to   = (now + timedelta(days=7)).strftime("%Y-%m-%d")
    fixtures     = []

    async with httpx.AsyncClient(timeout=20) as client:
        for league, code in COMPETITIONS.items():
            if len(fixtures) >= count:
                break
            try:
                r = await client.get(
                    f"https://api.football-data.org/v4/competitions/{code}/matches",
                    headers={"X-Auth-Token": football_key},
                    params={"status": "SCHEDULED", "dateFrom": date_from, "dateTo": date_to},
                )
                if r.status_code == 200:
                    for m in r.json().get("matches", []):
                        fixtures.append({
                            "fixture_id":   str(m.get("id", "")),  # Unique ID from Football-Data API
                            "home_team":    m["homeTeam"]["name"],
                            "away_team":    m["awayTeam"]["name"],
                            "league":       league,
                            "kickoff_time": m["utcDate"],
                            "market_odds":  {},
                        })
                        if len(fixtures) >= count:
                            break
                elif r.status_code == 429:
                    logger.warning(f"Football-Data rate limit hit for {league}")
            except Exception as e:
                logger.warning(f"Fixture fetch failed for {league}: {e}")

    ODDS_SPORT_MAP = {
        "premier_league": "soccer_epl",
        "la_liga":        "soccer_spain_la_liga",
        "bundesliga":     "soccer_germany_bundesliga",
        "serie_a":        "soccer_italy_serie_a",
        "ligue_1":        "soccer_france_ligue_one",
        "championship":   "soccer_england_championship",
        "eredivisie":     "soccer_netherlands_eredivisie",
        "primeira_liga":  "soccer_portugal_primeira_liga",
        "scottish_premiership": "soccer_scotland_premiership",
        "belgian_pro_league": "soccer_belgium_jupiler_pro_league",
    }

    if odds_key and fixtures:
        leagues_needed = list({f["league"] for f in fixtures})
        odds_by_teams: dict = {}

        async with httpx.AsyncClient(timeout=20) as client:
            for league in leagues_needed:
                sport = ODDS_SPORT_MAP.get(league, "soccer_epl")
                try:
                    r = await client.get(
                        f"https://api.the-odds-api.com/v4/sports/{sport}/odds/",
                        params={"apiKey": odds_key, "regions": "eu", "markets": "h2h", "oddsFormat": "decimal"},
                    )
                    if r.status_code == 200:
                        for event in r.json():
                            home = event.get("home_team", "")
                            away = event.get("away_team", "")
                            for bk in event.get("bookmakers", []):
                                for mkt in bk.get("markets", []):
                                    if mkt.get("key") == "h2h":
                                        outcomes = {o["name"]: o["price"] for o in mkt.get("outcomes", [])}
                                        ho = outcomes.get(home, 0)
                                        do = outcomes.get("Draw", 0)
                                        ao = outcomes.get(away, 0)
                                        if ho and do and ao:
                                            odds_by_teams[(home.lower(), away.lower())] = {
                                                "home": ho, "draw": do, "away": ao
                                            }
                                        break
                                if (home.lower(), away.lower()) in odds_by_teams:
                                    break
                except Exception as e:
                    logger.warning(f"Odds fetch failed for {league}: {e}")

        def _norm(name):
            for s in [" FC", " AFC", " CF", " SC", " United", " City", " Town"]:
                name = name.replace(s, "")
            return name.strip().lower()

        norm_odds = {(_norm(h), _norm(a)): o for (h, a), o in odds_by_teams.items()}
        for fixture in fixtures:
            h = fixture["home_team"]
            a = fixture["away_team"]
            fixture["market_odds"] = (
                odds_by_teams.get((h.lower(), a.lower())) or
                norm_odds.get((_norm(h), _norm(a))) or {}
            )

    if not fixtures:
        logger.warning("No fixtures returned from Football-Data API; using synthetic fixtures fallback.")
        now = datetime.now(timezone.utc)
        
        # More realistic synthetic team pairings for each league
        synthetic_teams = {
            "premier_league": [
                ("Manchester United", "Liverpool"), ("Arsenal", "Manchester City"),
                ("Chelsea", "Tottenham"), ("Newcastle", "Brighton"),
            ],
            "la_liga": [
                ("Real Madrid", "Barcelona"), ("Atletico Madrid", "Valencia"),
                ("Seville", "Real Sociedad"), ("Villarreal", "Getafe"),
            ],
            "bundesliga": [
                ("Bayern Munich", "Borussia Dortmund"), ("RB Leipzig", "Bayer Leverkusen"),
                ("Schalke", "Hertha Berlin"), ("Hoffenheim", "Eintracht Frankfurt"),
            ],
            "serie_a": [
                ("Inter", "AC Milan"), ("Juventus", "Roma"),
                ("Napoli", "Lazio"), ("Fiorentina", "Atalanta"),
            ],
            "ligue_1": [
                ("Paris Saint-Germain", "Marseille"), ("Lyon", "Monaco"),
                ("Lille", "Strasbourg"), ("Rennes", "Lens"),
            ],
        }
        
        for i, (league, teams_list) in enumerate(synthetic_teams.items()):
            if len(fixtures) >= count:
                break
            if league in COMPETITIONS:
                for j, (home, away) in enumerate(teams_list):
                    if len(fixtures) >= count:
                        break
                    kickoff = now + timedelta(days=i + 1, hours=12 + j)
                    # Vary odds slightly for realism
                    odds_variation = 0.1 * (j % 3 - 1)  # -0.1, 0, or 0.1
                    fixtures.append({
                        "fixture_id": f"synthetic_{league}_{i}_{j}",
                        "home_team": home,
                        "away_team": away,
                        "league": league,
                        "kickoff_time": kickoff.isoformat().replace("+00:00", "Z"),
                        "market_odds": {
                            "home": round(2.30 + odds_variation, 2),
                            "draw": 3.30,
                            "away": round(3.10 - odds_variation, 2)
                        },
                    })

    return fixtures[:count]


@router.get("/fixtures")
async def get_fixtures(api_key: Optional[str] = Query(default=None), count: int = Query(default=10, le=25)):
    _verify_key(api_key)
    fixtures = await _fetch_fixtures(count)
    return {"fixtures": fixtures, "total": len(fixtures)}


@router.get("/fixtures/by-date")
async def get_fixtures_by_date(
    api_key: Optional[str] = Query(default=None),
    date: str = Query(..., description="Target date in YYYY-MM-DD format"),
    count: int = Query(default=25, le=50),
):
    """Return fixtures for a specific calendar date."""
    _verify_key(api_key)
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=422, detail="date must be in YYYY-MM-DD format")
    fixtures = await _fetch_fixtures(count, target_date=date)
    return {"date": date, "fixtures": fixtures, "total": len(fixtures)}


@router.get("/fixtures/by-id/{fixture_id}")
async def get_fixture_by_id(
    fixture_id: str,
    api_key: Optional[str] = Query(default=None),
):
    """Return a specific fixture by its Football-Data API ID or synthetic ID."""
    _verify_key(api_key)
    try:
        # Fetch a large batch and find the matching fixture
        fixtures = await _fetch_fixtures(100)
        for fixture in fixtures:
            if fixture.get("fixture_id") == fixture_id:
                return {"fixture": fixture, "found": True}
        
        # If not found, log and return error
        logger.warning(f"Fixture ID {fixture_id} not found in current schedule")
        raise HTTPException(status_code=404, detail=f"Fixture with ID {fixture_id} not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Fixture lookup failed for ID {fixture_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bankroll")
async def get_bankroll(api_key: Optional[str] = Query(default=None)):
    """
    Return the current bankroll state: balance, P&L, ROI, win-rate, drawdown.
    Updated automatically after every settled prediction.
    """
    _verify_key(api_key)
    from app.db.database import AsyncSessionLocal
    from app.services.bankroll import BankrollManager
    try:
        async with AsyncSessionLocal() as db:
            bm = BankrollManager(db)
            await bm.load_state()
            return {"bankroll": bm.bankroll.to_dict(), "status": "ok"}
    except Exception as e:
        logger.error(f"Bankroll fetch failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/decision-log")
async def get_decision_log(
    api_key: Optional[str] = Query(default=None),
    limit: int = Query(default=50, le=200),
):
    """Return the last N logged prediction decisions with full context."""
    _verify_key(api_key)
    from app.db.database import AsyncSessionLocal
    from app.services.decision_logger import DecisionLogger
    try:
        async with AsyncSessionLocal() as db:
            dl = DecisionLogger(db)
            history = await dl.get_decision_history(limit)
            return {"decisions": history, "count": len(history)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/settle-results")
async def settle_past_results(
    api_key: Optional[str] = Query(default=None),
    days_back: int = Query(default=2, ge=1, le=7),
):
    """
    Scan Football-Data.org for FINISHED matches over the last `days_back` days,
    match them against unsettled DB predictions, and settle them with
    actual scores + CLV calculation.
    """
    _verify_key(api_key)
    try:
        result = await settle_results(days_back=days_back)
        return result
    except Exception as e:
        logger.error(f"Auto-settlement failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fixtures/live")
async def get_live_fixtures(api_key: Optional[str] = Query(default=None)):
    """
    Return all currently IN_PLAY matches from Football-Data.org.
    Used by the dashboard Live Now section.
    """
    _verify_key(api_key)
    try:
        live = await fetch_live_matches()
        return {"fixtures": live, "total": len(live)}
    except Exception as e:
        logger.error(f"Live fixture fetch failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stream-predictions")
async def stream_predictions(
    api_key: Optional[str] = Query(default=None),
    count:       int  = Query(default=10, le=20),
    force_alert: bool = Query(default=True),
):
    _verify_key(api_key)
    if orchestrator is None:
        raise HTTPException(status_code=503, detail="Orchestrator not initialised")

    async def event_stream():
        from app.db.database import AsyncSessionLocal
        from app.db.models import Match, Prediction
        from app.services.alerts import BetAlert

        def sse(payload: dict) -> str:
            return f"data: {json.dumps(payload)}\n\n"

        yield sse({"type": "status", "message": "Fetching upcoming fixtures..."})
        fixtures = await _fetch_fixtures(count)

        if not fixtures:
            yield sse({"type": "error", "fixture": "System", "message": "No fixtures found from Football-Data API and synthetic fallback failed."})
            return

        yield sse({"type": "status", "message": f"Found {len(fixtures)} fixtures. Running ML ensemble..."})

        for idx, fixture in enumerate(fixtures):
            home = fixture["home_team"]
            away = fixture["away_team"]
            mkt  = fixture.get("market_odds", {})

            yield sse({"type": "progress", "current": idx + 1, "total": len(fixtures), "fixture": f"{home} vs {away}"})

            try:
                home_odds = float(mkt.get("home", 2.30))
                draw_odds = float(mkt.get("draw", 3.30))
                away_odds = float(mkt.get("away", 3.10))

                features = {
                    "home_team":   home,
                    "away_team":   away,
                    "league":      fixture["league"],
                    "market_odds": mkt,
                }

                raw   = await orchestrator.predict(features, f"{home}_vs_{away}_{idx}")
                preds = raw.get("predictions", {})

                home_prob = float(preds.get("home_prob", 0.33))
                draw_prob = float(preds.get("draw_prob", 0.33))
                away_prob = float(preds.get("away_prob", 0.33))
                over_25   = float(preds.get("over_2_5_prob", 0.5))
                btts      = float(preds.get("btts_prob", 0.5))
                models_used = preds.get("models_used", 0)
                models_total = preds.get("models_total", orchestrator._total_model_specs if orchestrator else 0)
                data_source  = preds.get("data_source", "market_implied")
                confidence   = preds.get("confidence", {}).get("1x2", 0.65)

                best          = MarketUtils.determine_best_bet(home_prob, draw_prob, away_prob, home_odds, draw_odds, away_odds)
                edge          = float(best.get("edge", 0))
                stake         = float(min(best.get("kelly_stake", 0), 0.05))
                best_side     = str(best.get("best_side", "home"))
                consensus_prob = max(home_prob, draw_prob, away_prob)
                bet_odds      = best.get("odds", home_odds)

                kickoff_dt = datetime.fromisoformat(fixture["kickoff_time"].replace("Z", "+00:00")).replace(tzinfo=None)

                match_id = None
                request_hash = create_request_hash(home, away, fixture["league"], fixture["kickoff_time"])
                async with AsyncSessionLocal() as db:
                    existing_pred = await db.execute(select(Prediction).where(Prediction.request_hash == request_hash))
                    if existing_pred.scalar_one_or_none():
                        yield sse({
                            "type": "status",
                            "message": f"Skipping existing fixture: {home} vs {away} ({fixture['kickoff_time']})",
                        })
                        continue

                    existing_match = await db.execute(
                        select(Match).where(
                            Match.home_team == home,
                            Match.away_team == away,
                            Match.league == fixture["league"],
                            Match.kickoff_time == kickoff_dt,
                        )
                    )
                    if existing_match.scalar_one_or_none():
                        yield sse({
                            "type": "status",
                            "message": f"Skipping existing fixture: {home} vs {away} ({fixture['kickoff_time']})",
                        })
                        continue

                    db_match = Match(
                        home_team=home, away_team=away,
                        league=fixture["league"], kickoff_time=kickoff_dt,
                        opening_odds_home=home_odds,
                        opening_odds_draw=draw_odds,
                        opening_odds_away=away_odds,
                    )
                    db.add(db_match)
                    await db.flush()

                    pred_obj = Prediction(
                        request_hash=request_hash,
                        match_id=db_match.id,
                        home_prob=home_prob, draw_prob=draw_prob, away_prob=away_prob,
                        over_25_prob=over_25, btts_prob=btts,
                        consensus_prob=consensus_prob,
                        final_ev=edge, recommended_stake=stake,
                        confidence=confidence,
                        bet_side=best_side, entry_odds=bet_odds,
                        raw_edge=edge, normalized_edge=edge, vig_free_edge=edge,
                    )
                    db.add(pred_obj)
                    await db.commit()
                    match_id = db_match.id

                alert_sent = False
                if telegram_alerts and telegram_alerts.enabled and (force_alert or edge > 0.02):
                    try:
                        alert = BetAlert(
                            match_id=match_id,
                            home_team=home, away_team=away,
                            prediction=best_side,
                            probability=consensus_prob,
                            edge=edge, stake=stake, odds=bet_odds,
                            confidence=confidence,
                            kickoff_time=kickoff_dt,
                            home_prob=home_prob, draw_prob=draw_prob, away_prob=away_prob,
                            home_odds=home_odds, draw_odds=draw_odds, away_odds=away_odds,
                            models_used=models_used, models_total=models_total,
                            data_source=data_source,
                        )
                        alert_sent = await telegram_alerts.send_bet_alert(alert)
                    except Exception as e:
                        logger.warning(f"Telegram alert failed: {e}")

                yield sse({
                    "type": "prediction", "index": idx + 1,
                    "match_id": match_id,
                    "home_team": home, "away_team": away,
                    "league": fixture["league"],
                    "kickoff": fixture["kickoff_time"][:10],
                    "home_prob": round(home_prob, 3),
                    "draw_prob": round(draw_prob, 3),
                    "away_prob": round(away_prob, 3),
                    "over_25": round(over_25, 3), "btts": round(btts, 3),
                    "edge": round(edge, 4), "stake": round(stake, 4),
                    "best_side": best_side, "alert_sent": alert_sent,
                    "models_used": models_used, "models_total": models_total,
                    "data_source": data_source, "confidence": round(confidence, 3),
                })
                await asyncio.sleep(3)

            except Exception as e:
                logger.error(f"Prediction failed: {home} vs {away}: {e}", exc_info=True)
                yield sse({"type": "error", "message": str(e), "fixture": f"{home} vs {away}", "index": idx + 1})

        yield sse({"type": "done", "total": len(fixtures)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# ======================================================================
# RBAC ADMIN CONTROL CENTER — v4.0.0
# Dashboard Stats, User CRUD, Leagues, Markets, Currency,
# Subscriptions, Feature Flags, System Actions, Audit
# ======================================================================

import platform
import psutil
from sqlalchemy import select as _select, func as _func, desc as _desc, update as _update, delete as _delete
from app.db.models import (
    User as _User, AuditLog as _AuditLog,
    SubscriptionPlan as _SubscriptionPlan, UserSubscription as _UserSubscription,
    Match as _Match, TrainingJob as _TrainingJob,
)
from app.modules.wallet.models import PlatformConfig as _PlatformConfig, Wallet as _Wallet
from app.auth.jwt_utils import hash_password as _hash_password
from app.core.roles import AdminRole as _AdminRole, get_permissions_for_admin_role


# ── Pydantic schemas ──────────────────────────────────────────────────

class UserCreateBody(BaseModel):
    email: str
    username: str
    password: str
    role: str = "user"
    admin_role: Optional[str] = None
    subscription_tier: str = "viewer"


class UserEditBody(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None
    admin_role: Optional[str] = None
    subscription_tier: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class BanUserBody(BaseModel):
    banned: bool
    reason: Optional[str] = None


class SubscriptionOverrideBody(BaseModel):
    plan_name: str
    expires_at: Optional[str] = None
    reason: Optional[str] = None


class LeagueUpdateBody(BaseModel):
    status: Optional[str] = None        # active, paused, disabled
    weight: Optional[float] = None      # 0.0 - 2.0
    data_quality: Optional[float] = None


class MarketUpdateBody(BaseModel):
    status: Optional[str] = None        # active, paused, disabled
    min_stake: Optional[float] = None
    max_stake: Optional[float] = None
    edge_threshold: Optional[float] = None
    commission_rate: Optional[float] = None
    available_tiers: Optional[List[str]] = None


class CurrencyUpdateBody(BaseModel):
    rate_to_usd: Optional[float] = None
    status: Optional[str] = None
    min_deposit: Optional[float] = None
    max_deposit: Optional[float] = None


class PlanUpdateBody(BaseModel):
    display_name: Optional[str] = None
    price_monthly: Optional[float] = None
    price_yearly: Optional[float] = None
    prediction_limit: Optional[int] = None
    features: Optional[dict] = None
    is_active: Optional[bool] = None


class FlagsUpdateBody(BaseModel):
    flags: dict


# ── Default data (loaded from PlatformConfig or hardcoded fallback) ───

_DEFAULT_LEAGUES = [
    {"id": "pl",  "name": "Premier League",        "country": "England",    "status": "active", "weight": 1.0, "data_quality": 95, "matches": 0},
    {"id": "ll",  "name": "La Liga",               "country": "Spain",      "status": "active", "weight": 1.0, "data_quality": 93, "matches": 0},
    {"id": "bl",  "name": "Bundesliga",             "country": "Germany",    "status": "active", "weight": 1.0, "data_quality": 92, "matches": 0},
    {"id": "sa",  "name": "Serie A",               "country": "Italy",      "status": "active", "weight": 1.0, "data_quality": 91, "matches": 0},
    {"id": "l1",  "name": "Ligue 1",               "country": "France",     "status": "active", "weight": 1.0, "data_quality": 90, "matches": 0},
    {"id": "ere", "name": "Eredivisie",             "country": "Netherlands","status": "active", "weight": 0.9, "data_quality": 85, "matches": 0},
    {"id": "pl2", "name": "Primeira Liga",          "country": "Portugal",   "status": "active", "weight": 0.9, "data_quality": 84, "matches": 0},
    {"id": "br",  "name": "Brasileirão",            "country": "Brazil",     "status": "active", "weight": 0.8, "data_quality": 80, "matches": 0},
    {"id": "sl",  "name": "Super Lig",              "country": "Turkey",     "status": "active", "weight": 0.8, "data_quality": 78, "matches": 0},
    {"id": "jpb", "name": "Jupiler Pro League",     "country": "Belgium",    "status": "active", "weight": 0.8, "data_quality": 80, "matches": 0},
    {"id": "mls", "name": "MLS",                   "country": "USA",        "status": "active", "weight": 0.7, "data_quality": 75, "matches": 0},
    {"id": "mx",  "name": "Liga MX",               "country": "Mexico",     "status": "active", "weight": 0.7, "data_quality": 74, "matches": 0},
    {"id": "ch",  "name": "Championship",           "country": "England",    "status": "active", "weight": 0.8, "data_quality": 82, "matches": 0},
    {"id": "sp",  "name": "Scottish Premiership",   "country": "Scotland",   "status": "paused", "weight": 0.7, "data_quality": 76, "matches": 0},
    {"id": "ab",  "name": "Austrian Bundesliga",    "country": "Austria",    "status": "paused", "weight": 0.7, "data_quality": 73, "matches": 0},
    {"id": "ss",  "name": "Swiss Super League",     "country": "Switzerland","status": "paused", "weight": 0.7, "data_quality": 72, "matches": 0},
    {"id": "ds",  "name": "Danish Superliga",       "country": "Denmark",    "status": "paused", "weight": 0.7, "data_quality": 71, "matches": 0},
    {"id": "sve", "name": "Allsvenskan",            "country": "Sweden",     "status": "paused", "weight": 0.7, "data_quality": 70, "matches": 0},
    {"id": "nor", "name": "Eliteserien",            "country": "Norway",     "status": "paused", "weight": 0.7, "data_quality": 70, "matches": 0},
    {"id": "rpl", "name": "Russian Premier League", "country": "Russia",     "status": "disabled","weight": 0.5,"data_quality": 60, "matches": 0},
    {"id": "upl", "name": "Ukrainian Premier League","country": "Ukraine",   "status": "disabled","weight": 0.5,"data_quality": 58, "matches": 0},
    {"id": "gsl", "name": "Greek Super League",     "country": "Greece",     "status": "paused", "weight": 0.6, "data_quality": 65, "matches": 0},
    {"id": "arg", "name": "Argentine Primera",      "country": "Argentina",  "status": "active", "weight": 0.7, "data_quality": 74, "matches": 0},
    {"id": "j1",  "name": "J1 League",             "country": "Japan",      "status": "active", "weight": 0.7, "data_quality": 73, "matches": 0},
    {"id": "k1",  "name": "K League 1",            "country": "South Korea","status": "active", "weight": 0.6, "data_quality": 70, "matches": 0},
]

_DEFAULT_MARKETS = [
    {"id": "1x2",           "name": "1X2 (Home/Draw/Away)",   "status": "active", "min_stake": 5,  "max_stake": 1000, "edge_threshold": 2.0, "commission_rate": 5.0, "available_tiers": ["viewer","analyst","pro","elite"]},
    {"id": "over_under",    "name": "Over/Under 2.5 Goals",   "status": "active", "min_stake": 5,  "max_stake": 1000, "edge_threshold": 2.0, "commission_rate": 5.0, "available_tiers": ["viewer","analyst","pro","elite"]},
    {"id": "btts",          "name": "Both Teams to Score",    "status": "active", "min_stake": 5,  "max_stake": 1000, "edge_threshold": 2.0, "commission_rate": 5.0, "available_tiers": ["viewer","analyst","pro","elite"]},
    {"id": "double_chance", "name": "Double Chance",          "status": "active", "min_stake": 5,  "max_stake": 750,  "edge_threshold": 2.5, "commission_rate": 5.0, "available_tiers": ["analyst","pro","elite"]},
    {"id": "draw_no_bet",   "name": "Draw No Bet",            "status": "active", "min_stake": 5,  "max_stake": 500,  "edge_threshold": 2.5, "commission_rate": 5.0, "available_tiers": ["pro","elite"]},
    {"id": "asian_handicap","name": "Asian Handicap (-1.5)",  "status": "active", "min_stake": 5,  "max_stake": 500,  "edge_threshold": 3.0, "commission_rate": 6.0, "available_tiers": ["elite"]},
    {"id": "correct_score", "name": "Correct Score",          "status": "active", "min_stake": 2,  "max_stake": 100,  "edge_threshold": 5.0, "commission_rate": 8.0, "available_tiers": ["elite"]},
    {"id": "htft",          "name": "Half Time / Full Time",  "status": "paused", "min_stake": 2,  "max_stake": 200,  "edge_threshold": 4.0, "commission_rate": 7.0, "available_tiers": ["elite"]},
    {"id": "first_goal",    "name": "First Goal Scorer",      "status": "paused", "min_stake": 1,  "max_stake": 50,   "edge_threshold": 5.0, "commission_rate": 10.0,"available_tiers": ["elite"]},
]

_DEFAULT_CURRENCIES = [
    {"code": "USD",  "symbol": "$",  "name": "US Dollar",     "rate_to_usd": 1.0,    "status": "active", "min_deposit": 10,    "max_deposit": 10000},
    {"code": "NGN",  "symbol": "₦",  "name": "Nigerian Naira","rate_to_usd": 0.00065,"status": "active", "min_deposit": 1500,  "max_deposit": 15000000},
    {"code": "EUR",  "symbol": "€",  "name": "Euro",          "rate_to_usd": 1.085,  "status": "active", "min_deposit": 10,    "max_deposit": 10000},
    {"code": "GBP",  "symbol": "£",  "name": "British Pound", "rate_to_usd": 1.27,   "status": "active", "min_deposit": 10,    "max_deposit": 10000},
    {"code": "USDT", "symbol": "₮",  "name": "Tether",        "rate_to_usd": 1.0,    "status": "active", "min_deposit": 10,    "max_deposit": 10000},
]

_DEFAULT_FLAGS = {
    "USE_REAL_ML_MODELS":    {"value": True,  "description": "Use trained models vs random noise"},
    "AUTH_ENABLED":          {"value": True,  "description": "Require authentication on all routes"},
    "BLOCKCHAIN_ENABLED":    {"value": False, "description": "Enable blockchain settlement"},
    "RATE_LIMIT_ENABLED":    {"value": True,  "description": "Enable API rate limiting"},
    "WEBSOCKET_ENABLED":     {"value": True,  "description": "Real-time WebSocket updates"},
    "MAINTENANCE_MODE":      {"value": False, "description": "Show maintenance page to all users"},
    "LIVE_ODDS_ENABLED":     {"value": True,  "description": "Fetch and display live odds"},
    "AI_INSIGHTS_ENABLED":   {"value": True,  "description": "Generate AI match insights"},
    "NOTIFICATIONS_ENABLED": {"value": True,  "description": "Send push notifications"},
    "REFERRALS_ENABLED":     {"value": False, "description": "Enable affiliate/referral system"},
}


async def _config_get(db, key: str, default):
    row = (await db.execute(
        _select(_PlatformConfig).where(_PlatformConfig.key == key)
    )).scalar_one_or_none()
    if row:
        return row.value
    return default


async def _config_set(db, key: str, value, actor_id: Optional[int] = None):
    row = (await db.execute(
        _select(_PlatformConfig).where(_PlatformConfig.key == key)
    )).scalar_one_or_none()
    if row:
        row.value = value
        row.updated_by = actor_id
    else:
        db.add(_PlatformConfig(key=key, value=value, updated_by=actor_id))
    await db.commit()


async def _log_audit(db, action: str, actor: str, resource: str = None,
                     resource_id: str = None, details: dict = None, status: str = "success"):
    try:
        db.add(_AuditLog(
            action=action, actor=actor, resource=resource,
            resource_id=str(resource_id) if resource_id else None,
            details=details, status=status,
        ))
        await db.commit()
    except Exception:
        pass


# ── 1. Dashboard Stats ────────────────────────────────────────────────

@router.get("/stats")
async def admin_stats():
    """Enhanced dashboard KPIs + activity."""
    async with AsyncSessionLocal() as db:
        total_users   = (await db.execute(_select(_func.count()).select_from(_User))).scalar() or 0
        total_matches = (await db.execute(_select(_func.count()).select_from(_Match))).scalar() or 0
        total_jobs    = (await db.execute(_select(_func.count()).select_from(_TrainingJob))).scalar() or 0
        active_plans  = (await db.execute(_select(_func.count()).select_from(_SubscriptionPlan)
                                          .where(_SubscriptionPlan.is_active == True))).scalar() or 0
        recent_audit  = (await db.execute(
            _select(_AuditLog).order_by(_desc(_AuditLog.timestamp)).limit(10)
        )).scalars().all()
        top_users = (await db.execute(
            _select(_User).where(_User.is_active == True).limit(5)
        )).scalars().all()

    audit_list = [
        {"action": a.action, "actor": a.actor, "resource": a.resource,
         "status": a.status, "timestamp": a.timestamp.isoformat() if a.timestamp else None}
        for a in recent_audit
    ]
    top_list = [
        {"id": u.id, "username": u.username, "email": u.email,
         "role": u.role, "tier": getattr(u, "subscription_tier", "viewer"),
         "joined": u.created_at.isoformat() if u.created_at else None}
        for u in top_users
    ]
    return {
        "users": total_users,
        "matches": total_matches,
        "training_jobs": total_jobs,
        "active_plans": active_plans,
        "audit_entries": len(audit_list),
        "recent_activity": audit_list,
        "top_users": top_list,
    }


# ── 2. System Health ──────────────────────────────────────────────────

@router.get("/system/health")
async def system_health():
    """Real-time system health metrics."""
    try:
        cpu_pct = psutil.cpu_percent(interval=0.2)
        mem     = psutil.virtual_memory()
        disk    = psutil.disk_usage("/")
    except Exception:
        cpu_pct = 0; mem = None; disk = None

    async with AsyncSessionLocal() as db:
        try:
            await db.execute(_select(_func.count()).select_from(_User))
            db_ok = True
        except Exception:
            db_ok = False

    redis_ok = bool(get_env("REDIS_URL"))
    return {
        "api":    True,
        "database": db_ok,
        "redis":  redis_ok,
        "models_loaded": 12,
        "cpu_pct": round(cpu_pct, 1),
        "mem_pct": round(mem.percent, 1) if mem else 0,
        "disk_pct": round(disk.percent, 1) if disk else 0,
        "python_version": platform.python_version(),
    }


# ── 3. User Management ────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    tier: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
):
    """List all users with filtering."""
    async with AsyncSessionLocal() as db:
        q = _select(_User)
        if search:
            q = q.where(
                (_User.email.ilike(f"%{search}%")) | (_User.username.ilike(f"%{search}%"))
            )
        if role:
            q = q.where(_User.role == role)
        if tier:
            q = q.where(_User.subscription_tier == tier)
        if status == "active":
            q = q.where(_User.is_active == True)
        elif status == "banned":
            q = q.where(_User.is_banned == True)
        elif status == "inactive":
            q = q.where(_User.is_active == False)
        total = (await db.execute(_select(_func.count()).select_from(q.subquery()))).scalar() or 0
        users = (await db.execute(q.order_by(_desc(_User.created_at)).offset(offset).limit(limit))).scalars().all()

        wallet_map = {}
        if users:
            ids = [u.id for u in users]
            wallets = (await db.execute(_select(_Wallet).where(_Wallet.user_id.in_(ids)))).scalars().all()
            wallet_map = {w.user_id: w for w in wallets}

    return {
        "total": total,
        "users": [
            {
                "id": u.id,
                "email": u.email,
                "username": u.username,
                "role": u.role,
                "admin_role": getattr(u, "admin_role", None),
                "subscription_tier": getattr(u, "subscription_tier", "viewer"),
                "is_active": u.is_active,
                "is_verified": u.is_verified,
                "is_banned": getattr(u, "is_banned", False),
                "vitcoin_balance": float(wallet_map[u.id].vitcoin_balance) if u.id in wallet_map else 0.0,
                "created_at": u.created_at.isoformat() if u.created_at else None,
                "last_login": u.last_login.isoformat() if u.last_login else None,
            }
            for u in users
        ],
    }


@router.get("/users/{user_id}")
async def get_user(user_id: int):
    """Get a single user with wallet details."""
    async with AsyncSessionLocal() as db:
        user = (await db.execute(_select(_User).where(_User.id == user_id))).scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        wallet = (await db.execute(_select(_Wallet).where(_Wallet.user_id == user_id))).scalar_one_or_none()

    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "role": user.role,
        "admin_role": getattr(user, "admin_role", None),
        "subscription_tier": getattr(user, "subscription_tier", "viewer"),
        "is_active": user.is_active,
        "is_verified": user.is_verified,
        "is_banned": getattr(user, "is_banned", False),
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "vitcoin_balance": float(wallet.vitcoin_balance) if wallet else 0.0,
        "permissions": get_permissions_for_admin_role(getattr(user, "admin_role", "") or ""),
    }


@router.post("/users", status_code=201)
async def create_user(body: UserCreateBody, current_user: _User = Depends(get_current_admin)):
    """Create a new user account."""
    async with AsyncSessionLocal() as db:
        existing = (await db.execute(_select(_User).where(_User.email == body.email.lower()))).scalar_one_or_none()
        if existing:
            raise HTTPException(400, "Email already registered")
        user = _User(
            email=body.email.lower(),
            username=body.username,
            hashed_password=_hash_password(body.password),
            role=body.role,
            admin_role=body.admin_role,
            subscription_tier=body.subscription_tier,
            is_active=True,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        # Create wallet
        from app.modules.wallet.models import Wallet as _WalletModel
        db.add(_WalletModel(user_id=user.id, vitcoin_balance=0))
        await db.commit()
        await _log_audit(db, "user.create", current_user.email, "user", user.id,
                         {"email": body.email, "role": body.role})
    return {"id": user.id, "email": user.email, "message": "User created"}


@router.put("/users/{user_id}")
async def edit_user(user_id: int, body: UserEditBody, current_user: _User = Depends(get_current_admin)):
    """Edit user profile, role or tier."""
    async with AsyncSessionLocal() as db:
        user = (await db.execute(_select(_User).where(_User.id == user_id))).scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        changed = {}
        if body.username is not None:
            user.username = body.username; changed["username"] = body.username
        if body.email is not None:
            user.email = body.email.lower(); changed["email"] = body.email
        if body.role is not None:
            user.role = body.role; changed["role"] = body.role
        if body.admin_role is not None:
            user.admin_role = body.admin_role; changed["admin_role"] = body.admin_role
        if body.subscription_tier is not None:
            user.subscription_tier = body.subscription_tier; changed["tier"] = body.subscription_tier
        if body.is_active is not None:
            user.is_active = body.is_active; changed["is_active"] = body.is_active
        if body.is_verified is not None:
            user.is_verified = body.is_verified; changed["is_verified"] = body.is_verified
        await db.commit()
        await _log_audit(db, "user.edit", current_user.email, "user", user_id, changed)
    return {"message": "User updated", "changes": changed}


@router.delete("/users/{user_id}", dependencies=[Depends(get_current_admin)])
async def delete_user(user_id: int, current_user: _User = Depends(get_current_admin)):
    """Delete a user (super_admin only)."""
    admin_role = getattr(current_user, "admin_role", None)
    if admin_role != "super_admin":
        raise HTTPException(403, "Only super_admin can delete users")
    async with AsyncSessionLocal() as db:
        user = (await db.execute(_select(_User).where(_User.id == user_id))).scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        if user.id == current_user.id:
            raise HTTPException(400, "Cannot delete your own account")
        await db.execute(_delete(_User).where(_User.id == user_id))
        await db.commit()
        await _log_audit(db, "user.delete", current_user.email, "user", user_id, {"email": user.email})
    return {"message": "User deleted"}


@router.post("/users/{user_id}/ban")
async def ban_user(user_id: int, body: BanUserBody, current_user: _User = Depends(get_current_admin)):
    """Ban or unban a user."""
    async with AsyncSessionLocal() as db:
        user = (await db.execute(_select(_User).where(_User.id == user_id))).scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        if user.id == current_user.id:
            raise HTTPException(400, "Cannot ban your own account")
        user.is_banned = body.banned
        if body.banned:
            user.is_active = False
        await db.commit()
        action = "user.ban" if body.banned else "user.unban"
        await _log_audit(db, action, current_user.email, "user", user_id,
                         {"reason": body.reason, "email": user.email})
    return {"message": f"User {'banned' if body.banned else 'unbanned'}"}


@router.post("/users/{user_id}/subscription-override")
async def override_subscription(user_id: int, body: SubscriptionOverrideBody,
                                 current_user: _User = Depends(get_current_admin)):
    """Manually override a user's subscription tier."""
    async with AsyncSessionLocal() as db:
        user = (await db.execute(_select(_User).where(_User.id == user_id))).scalar_one_or_none()
        if not user:
            raise HTTPException(404, "User not found")
        user.subscription_tier = body.plan_name
        await db.commit()
        await _log_audit(db, "subscription.override", current_user.email, "user", user_id,
                         {"plan": body.plan_name, "reason": body.reason, "expires_at": body.expires_at})
    return {"message": f"Subscription set to {body.plan_name}"}


# ── 4. League Configuration ───────────────────────────────────────────

@router.get("/leagues")
async def list_leagues():
    """Return all 25+ league configurations."""
    async with AsyncSessionLocal() as db:
        stored = await _config_get(db, "leagues_config", None)
    return {"leagues": stored if stored else _DEFAULT_LEAGUES}


@router.put("/leagues/{league_id}")
async def update_league(league_id: str, body: LeagueUpdateBody,
                         current_user: _User = Depends(get_current_admin)):
    """Update status, weight, or data quality for a league."""
    async with AsyncSessionLocal() as db:
        leagues = await _config_get(db, "leagues_config", list(_DEFAULT_LEAGUES))
        updated = False
        for lg in leagues:
            if lg["id"] == league_id:
                if body.status is not None:     lg["status"] = body.status
                if body.weight is not None:     lg["weight"] = body.weight
                if body.data_quality is not None: lg["data_quality"] = body.data_quality
                updated = True
                break
        if not updated:
            raise HTTPException(404, "League not found")
        await _config_set(db, "leagues_config", leagues, current_user.id)
        await _log_audit(db, "league.update", current_user.email, "league", league_id,
                         body.model_dump(exclude_none=True))
    return {"message": "League updated"}


# ── 5. Market Configuration ───────────────────────────────────────────

@router.get("/markets")
async def list_markets():
    """Return all market configurations."""
    async with AsyncSessionLocal() as db:
        stored = await _config_get(db, "markets_config", None)
    return {"markets": stored if stored else _DEFAULT_MARKETS}


@router.put("/markets/{market_id}")
async def update_market(market_id: str, body: MarketUpdateBody,
                         current_user: _User = Depends(get_current_admin)):
    """Update a market's settings."""
    async with AsyncSessionLocal() as db:
        markets = await _config_get(db, "markets_config", list(_DEFAULT_MARKETS))
        updated = False
        for mk in markets:
            if mk["id"] == market_id:
                if body.status is not None:           mk["status"] = body.status
                if body.min_stake is not None:        mk["min_stake"] = body.min_stake
                if body.max_stake is not None:        mk["max_stake"] = body.max_stake
                if body.edge_threshold is not None:   mk["edge_threshold"] = body.edge_threshold
                if body.commission_rate is not None:  mk["commission_rate"] = body.commission_rate
                if body.available_tiers is not None:  mk["available_tiers"] = body.available_tiers
                updated = True
                break
        if not updated:
            raise HTTPException(404, "Market not found")
        await _config_set(db, "markets_config", markets, current_user.id)
        await _log_audit(db, "market.update", current_user.email, "market", market_id,
                         body.model_dump(exclude_none=True))
    return {"message": "Market updated"}


# ── 6. Currency & Rates ───────────────────────────────────────────────

@router.get("/currency")
async def get_currency():
    """Return currency rates, VIT pricing, and conversion fees."""
    async with AsyncSessionLocal() as db:
        currencies = await _config_get(db, "currencies_config", list(_DEFAULT_CURRENCIES))
        fees = await _config_get(db, "conversion_fees", {
            "fiat_to_vit": 1.5, "vit_to_fiat": 1.5, "cross_fiat": 0.5
        })
        vit_config = await _config_get(db, "vit_pricing", {
            "current_price_usd": 0.10,
            "circulating_supply": 128475,
            "rolling_revenue_usd": 12847.50,
        })
    return {
        "currencies": currencies,
        "conversion_fees": fees,
        "vit_pricing": vit_config,
    }


@router.put("/currency/{code}")
async def update_currency(code: str, body: CurrencyUpdateBody,
                           current_user: _User = Depends(get_current_admin)):
    """Update a fiat currency's rate or limits."""
    async with AsyncSessionLocal() as db:
        currencies = await _config_get(db, "currencies_config", list(_DEFAULT_CURRENCIES))
        updated = False
        for c in currencies:
            if c["code"] == code.upper():
                if body.rate_to_usd is not None: c["rate_to_usd"] = body.rate_to_usd
                if body.status is not None:       c["status"] = body.status
                if body.min_deposit is not None:  c["min_deposit"] = body.min_deposit
                if body.max_deposit is not None:  c["max_deposit"] = body.max_deposit
                updated = True
                break
        if not updated:
            raise HTTPException(404, "Currency not found")
        await _config_set(db, "currencies_config", currencies, current_user.id)
        await _log_audit(db, "currency.update", current_user.email, "currency", code,
                         body.model_dump(exclude_none=True))
    return {"message": "Currency updated"}


@router.post("/currency/recalculate-vit")
async def recalculate_vit(current_user: _User = Depends(get_current_admin)):
    """Recalculate VIT price based on revenue/supply formula."""
    async with AsyncSessionLocal() as db:
        vit_config = await _config_get(db, "vit_pricing", {
            "current_price_usd": 0.10,
            "circulating_supply": 128475,
            "rolling_revenue_usd": 12847.50,
        })
        revenue = vit_config.get("rolling_revenue_usd", 12847.50)
        supply  = vit_config.get("circulating_supply", 128475)
        new_price = round(revenue / supply, 8) if supply > 0 else 0.10
        vit_config["current_price_usd"] = new_price
        await _config_set(db, "vit_pricing", vit_config, current_user.id)
        await _log_audit(db, "currency.recalculate_vit", current_user.email,
                         details={"new_price": new_price})
    return {"new_price_usd": new_price, "message": "VIT price recalculated"}


# ── 7. Subscription Plans ─────────────────────────────────────────────

@router.get("/subscriptions")
async def list_subscription_plans():
    """List all subscription plans."""
    async with AsyncSessionLocal() as db:
        plans = (await db.execute(_select(_SubscriptionPlan).order_by(_SubscriptionPlan.price_monthly))).scalars().all()
    return {
        "plans": [
            {
                "id": p.id,
                "name": p.name,
                "display_name": p.display_name,
                "price_monthly": p.price_monthly,
                "price_yearly": p.price_yearly,
                "prediction_limit": p.prediction_limit,
                "features": p.features,
                "is_active": p.is_active,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in plans
        ]
    }


@router.put("/subscriptions/{plan_id}")
async def update_subscription_plan(plan_id: int, body: PlanUpdateBody,
                                    current_user: _User = Depends(get_current_admin)):
    """Edit a subscription plan."""
    async with AsyncSessionLocal() as db:
        plan = (await db.execute(_select(_SubscriptionPlan).where(_SubscriptionPlan.id == plan_id))).scalar_one_or_none()
        if not plan:
            raise HTTPException(404, "Plan not found")
        changed = {}
        if body.display_name is not None:    plan.display_name = body.display_name;    changed["display_name"] = body.display_name
        if body.price_monthly is not None:   plan.price_monthly = body.price_monthly;  changed["price_monthly"] = body.price_monthly
        if body.price_yearly is not None:    plan.price_yearly = body.price_yearly;    changed["price_yearly"] = body.price_yearly
        if body.prediction_limit is not None:plan.prediction_limit = body.prediction_limit; changed["prediction_limit"] = body.prediction_limit
        if body.features is not None:        plan.features = body.features;            changed["features"] = body.features
        if body.is_active is not None:       plan.is_active = body.is_active;          changed["is_active"] = body.is_active
        await db.commit()
        await _log_audit(db, "plan.update", current_user.email, "plan", plan_id, changed)
    return {"message": "Plan updated", "changes": changed}


# ── 8. Feature Flags ──────────────────────────────────────────────────

@router.get("/system/flags")
async def get_feature_flags():
    """Return all platform feature flags."""
    async with AsyncSessionLocal() as db:
        stored = await _config_get(db, "feature_flags", dict(_DEFAULT_FLAGS))
    return {"flags": stored if stored else _DEFAULT_FLAGS}


@router.put("/system/flags")
async def update_feature_flags(body: FlagsUpdateBody, current_user: _User = Depends(get_current_admin)):
    """Update one or more feature flags."""
    admin_role = getattr(current_user, "admin_role", "admin")
    if admin_role not in ("super_admin", "admin"):
        raise HTTPException(403, "Insufficient privileges to modify feature flags")
    async with AsyncSessionLocal() as db:
        current_flags = await _config_get(db, "feature_flags", dict(_DEFAULT_FLAGS))
        for key, val in body.flags.items():
            if key in current_flags:
                if isinstance(current_flags[key], dict):
                    current_flags[key]["value"] = val
                else:
                    current_flags[key] = val
        await _config_set(db, "feature_flags", current_flags, current_user.id)
        await _log_audit(db, "system.flags_update", current_user.email,
                         details={"updated": body.flags})
    return {"message": "Flags updated", "flags": current_flags}


# ── 9. System Actions ─────────────────────────────────────────────────

@router.post("/system/cache/clear")
async def clear_cache(current_user: _User = Depends(get_current_admin)):
    """Clear in-memory cache."""
    try:
        from app.core.cache import cache
        cache.clear()
        cleared = True
    except Exception:
        cleared = False
    async with AsyncSessionLocal() as db:
        await _log_audit(db, "system.cache_clear", current_user.email,
                         details={"cleared": cleared})
    return {"message": "Cache cleared" if cleared else "Cache clear attempted (no cache module found)"}


@router.post("/system/backup")
async def create_backup(current_user: _User = Depends(get_current_admin)):
    """Create a SQLite database backup (dev/SQLite only)."""
    admin_role = getattr(current_user, "admin_role", "admin")
    if admin_role not in ("super_admin",):
        raise HTTPException(403, "Only super_admin can create backups")
    import shutil, time
    db_path = "vit.db"
    if not os.path.exists(db_path):
        return {"message": "No SQLite database found (may be using PostgreSQL)", "backup": None}
    ts = int(time.time())
    backup_path = f"vit.db.backup_{ts}"
    shutil.copy2(db_path, backup_path)
    async with AsyncSessionLocal() as db:
        await _log_audit(db, "system.backup", current_user.email, details={"file": backup_path})
    return {"message": "Backup created", "backup": backup_path}


# ── 10. Audit Log ─────────────────────────────────────────────────────

@router.get("/audit")
async def get_audit_log(
    action: Optional[str] = None,
    actor: Optional[str] = None,
    resource: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
):
    """Filterable audit log."""
    async with AsyncSessionLocal() as db:
        q = _select(_AuditLog)
        if action:    q = q.where(_AuditLog.action.ilike(f"%{action}%"))
        if actor:     q = q.where(_AuditLog.actor.ilike(f"%{actor}%"))
        if resource:  q = q.where(_AuditLog.resource == resource)
        if date_from:
            try:
                from datetime import datetime
                df = datetime.fromisoformat(date_from)
                q = q.where(_AuditLog.timestamp >= df)
            except Exception:
                pass
        if date_to:
            try:
                from datetime import datetime
                dt = datetime.fromisoformat(date_to)
                q = q.where(_AuditLog.timestamp <= dt)
            except Exception:
                pass
        total = (await db.execute(_select(_func.count()).select_from(q.subquery()))).scalar() or 0
        logs = (await db.execute(q.order_by(_desc(_AuditLog.timestamp)).offset(offset).limit(limit))).scalars().all()

    return {
        "total": total,
        "logs": [
            {
                "id": lg.id,
                "action": lg.action,
                "actor": lg.actor,
                "resource": lg.resource,
                "resource_id": lg.resource_id,
                "details": lg.details,
                "ip_address": lg.ip_address,
                "status": lg.status,
                "timestamp": lg.timestamp.isoformat() if lg.timestamp else None,
            }
            for lg in logs
        ],
    }


# ── 11. Admin role + permissions for /auth/me enrichment ──────────────

@router.get("/me/permissions")
async def get_my_permissions(current_user: _User = Depends(get_current_admin)):
    """Return this admin's role and permission list."""
    admin_role = getattr(current_user, "admin_role", None) or "admin"
    return {
        "admin_role": admin_role,
        "permissions": get_permissions_for_admin_role(admin_role),
    }
