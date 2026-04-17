import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple


ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
INSIGHTS_DIR = os.path.join(ROOT_DIR, "data", "insights")

PROVIDERS = ("gemini", "claude", "grok")
PROVIDER_LABELS = {
    "gemini": "Google Gemini",
    "claude": "Anthropic Claude",
    "grok":   "xAI Grok",
}


def _safe_match_id(match_id: int) -> str:
    return re.sub(r"[^0-9]", "", str(match_id))


def _path_for(match_id: int) -> str:
    return os.path.join(INSIGHTS_DIR, f"match_{_safe_match_id(match_id)}.json")


def _as_probability(value: Any, fallback: Optional[float] = None) -> Optional[float]:
    if value is None:
        return fallback
    try:
        numeric = float(value)
        if numeric > 1:
            numeric = numeric / 100
        return max(0.0, min(1.0, numeric))
    except Exception:
        return fallback


def normalize_provider_insight(
    source: str,
    payload: Dict[str, Any],
    defaults: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    defaults = defaults or {}
    source = str(source).lower().strip()
    home_prob  = _as_probability(payload.get("home_prob",  payload.get("home")),  defaults.get("home_prob"))
    draw_prob  = _as_probability(payload.get("draw_prob",  payload.get("draw")),  defaults.get("draw_prob"))
    away_prob  = _as_probability(payload.get("away_prob",  payload.get("away")),  defaults.get("away_prob"))
    confidence = _as_probability(payload.get("confidence"),                        defaults.get("confidence", 0.7))
    risk_level = str(payload.get("risk_level") or payload.get("risk") or "MEDIUM").upper()
    if risk_level not in {"LOW", "MEDIUM", "HIGH"}:
        risk_level = "MEDIUM"

    return {
        "available":        True,
        "source":           source,
        "label":            payload.get("label") or PROVIDER_LABELS.get(source, source.title()),
        "home_prob":        home_prob,
        "draw_prob":        draw_prob,
        "away_prob":        away_prob,
        "confidence":       confidence,
        "summary":          payload.get("summary")          or payload.get("analysis") or "",
        "key_factors":      payload.get("key_factors")      or payload.get("factors")  or [],
        "value_assessment": payload.get("value_assessment") or payload.get("value")    or "",
        "risk_level":       risk_level,
        "insight_tags":     payload.get("insight_tags")     or payload.get("tags")     or [],
        "error":            None,
        "from_cache":       True,
    }


def _extract_insights(raw: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    candidates = (
        raw.get("insights")
        or raw.get("agents")
        or raw.get("results")
        or raw.get("providers")
        or raw
    )
    if not isinstance(candidates, dict):
        return {}
    return {
        source: candidates[source]
        for source in PROVIDERS
        if isinstance(candidates.get(source), dict)
    }


# ── File I/O ──────────────────────────────────────────────────────────────────

def _load_raw(match_id: int) -> Dict[str, Any]:
    path = _path_for(match_id)
    if not os.path.exists(path):
        return {}
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def _write_raw(match_id: int, payload: Dict[str, Any]) -> None:
    os.makedirs(INSIGHTS_DIR, exist_ok=True)
    with open(_path_for(match_id), "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)


# ── Public API ────────────────────────────────────────────────────────────────

def save_match_insights(match_id: int, raw: Dict[str, Any]) -> Dict[str, Any]:
    """
    Save (or overwrite) ALL provider insights for a match from a combined JSON.
    Accepts: {"insights": {"gemini": {...}, "claude": {...}, "grok": {...}}}
    """
    insights = _extract_insights(raw)
    if not insights:
        raise ValueError(
            "JSON must include insights for at least one provider: gemini, claude, or grok"
        )

    payload = {
        "match_id":    match_id,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "insights":    insights,
    }
    _write_raw(match_id, payload)
    return {
        "match_id": match_id,
        "sources":  sorted(insights.keys()),
        "count":    len(insights),
    }


def save_provider_insight(
    match_id: int,
    provider: str,
    payload: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Save or update insights for a SINGLE provider, merging with any existing data.
    The existing insights for the other providers are preserved.
    """
    provider = provider.lower().strip()
    if provider not in PROVIDERS:
        raise ValueError(f"Unknown provider '{provider}'. Must be one of: {', '.join(PROVIDERS)}")

    raw = _load_raw(match_id)
    existing_insights: Dict[str, Any] = raw.get("insights", {})

    # Extract provider data from the payload (support wrapped or flat format)
    provider_data: Dict[str, Any] = {}
    if "insights" in payload and isinstance(payload["insights"], dict):
        provider_data = payload["insights"].get(provider, {})
    if not provider_data:
        provider_data = payload.get(provider, payload)

    if not isinstance(provider_data, dict):
        raise ValueError(f"No valid insight data found for provider '{provider}'")

    existing_insights[provider] = provider_data

    updated_payload = {
        "match_id":    match_id,
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
        "insights":    existing_insights,
    }
    _write_raw(match_id, updated_payload)

    return {
        "match_id":  match_id,
        "provider":  provider,
        "sources":   sorted(existing_insights.keys()),
        "count":     len(existing_insights),
    }


def get_insight_status(match_id: int) -> Dict[str, Any]:
    """
    Return which providers have insight files for a match, and when they were uploaded.
    """
    raw = _load_raw(match_id)
    insights = raw.get("insights", {})
    uploaded_at = raw.get("uploaded_at")

    providers_status = {}
    for p in PROVIDERS:
        data = insights.get(p)
        providers_status[p] = {
            "has_insight": isinstance(data, dict) and bool(data),
            "label":       PROVIDER_LABELS[p],
            "summary_preview": (
                (data.get("summary") or "")[:120] + "…"
                if data and data.get("summary") and len(data.get("summary", "")) > 120
                else (data.get("summary") or "") if data else ""
            ),
        }

    providers_with_data = [p for p in PROVIDERS if providers_status[p]["has_insight"]]
    return {
        "match_id":    match_id,
        "has_any":     bool(providers_with_data),
        "providers":   providers_status,
        "uploaded_at": uploaded_at,
        "count":       len(providers_with_data),
    }


def validate_insight_consistency(match_id: int) -> Dict[str, Any]:
    """
    Cross-validate probability claims across uploaded providers.
    Flags large disagreements (>25 percentage points) between any two providers.
    """
    raw = _load_raw(match_id)
    insights = raw.get("insights", {})

    probs_by_provider: Dict[str, Dict[str, Optional[float]]] = {}
    for p in PROVIDERS:
        data = insights.get(p)
        if not isinstance(data, dict):
            continue
        probs_by_provider[p] = {
            "home": _as_probability(data.get("home_prob", data.get("home"))),
            "draw": _as_probability(data.get("draw_prob", data.get("draw"))),
            "away": _as_probability(data.get("away_prob", data.get("away"))),
        }

    if len(probs_by_provider) < 2:
        return {
            "consistent":   True,
            "warnings":     [],
            "provider_probs": probs_by_provider,
        }

    warnings: List[str] = []
    provider_list = list(probs_by_provider.keys())
    THRESHOLD = 0.25

    for i in range(len(provider_list)):
        for j in range(i + 1, len(provider_list)):
            pa, pb = provider_list[i], provider_list[j]
            probs_a = probs_by_provider[pa]
            probs_b = probs_by_provider[pb]
            for outcome in ("home", "draw", "away"):
                va = probs_a.get(outcome)
                vb = probs_b.get(outcome)
                if va is not None and vb is not None:
                    diff = abs(va - vb)
                    if diff > THRESHOLD:
                        warnings.append(
                            f"{PROVIDER_LABELS[pa]} vs {PROVIDER_LABELS[pb]}: "
                            f"{outcome.upper()} probability differs by "
                            f"{diff*100:.1f}% ({va*100:.1f}% vs {vb*100:.1f}%)"
                        )

    # Also check: do the major-signal providers agree on the favoured outcome?
    favourite_by_provider: Dict[str, Optional[str]] = {}
    for p, probs in probs_by_provider.items():
        valid = {k: v for k, v in probs.items() if v is not None}
        favourite_by_provider[p] = max(valid, key=valid.get) if valid else None

    favourites = [f for f in favourite_by_provider.values() if f]
    if len(set(favourites)) > 1 and len(favourites) >= 2:
        details = ", ".join(
            f"{PROVIDER_LABELS[p]}→{f.upper()}"
            for p, f in favourite_by_provider.items()
            if f
        )
        warnings.append(f"Providers disagree on the favoured outcome: {details}")

    return {
        "consistent":     len(warnings) == 0,
        "warnings":       warnings,
        "provider_probs": probs_by_provider,
    }


def load_match_insights(
    match_id: int,
    defaults: Optional[Dict[str, float]] = None,
) -> Dict[str, Dict[str, Any]]:
    raw = _load_raw(match_id)
    insights = _extract_insights(raw)
    return {
        source: normalize_provider_insight(source, payload, defaults=defaults)
        for source, payload in insights.items()
    }


def infer_match_id(raw: Dict[str, Any]) -> Optional[int]:
    value = raw.get("match_id") or raw.get("id")
    try:
        return int(value) if value is not None else None
    except Exception:
        return None
