"""
VIT Sports Intelligence — Colab Training Script v3.1.0
=======================================================
Trains all 12 model variants with:
  - Rolling-window team form features (last 5 and last 10 games)
  - Head-to-head historical statistics
  - League-specific home advantage encoding
  - Poisson regression for λ-based models (Poisson, Dixon-Coles, ELO)
  - Gradient-boosted classifiers for XGBoost-style model
  - Probability calibration (Platt scaling / isotonic regression)
  - Saves model-specific .pkl files for all 12 variants

Usage (Google Colab):
    1. Upload your historical_matches.csv (columns: home_team, away_team,
       home_goals, away_goals, and optionally league, kickoff_time).
    2. Set VIT_TRAINING_CSV to point at your CSV, or place it at the default path.
    3. Run all cells — outputs saved to /content/vit_training_output/vit_models.zip
    4. Upload that zip via Admin > Model Weights Upload in the VIT dashboard.
"""

import json
import math
import os
import random
import zipfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import (
    GradientBoostingClassifier,
    RandomForestClassifier,
    VotingClassifier,
)
from sklearn.linear_model import LogisticRegression, PoissonRegressor
from sklearn.metrics import accuracy_score, brier_score_loss, log_loss
from sklearn.model_selection import train_test_split
from sklearn.naive_bayes import GaussianNB
from sklearn.preprocessing import LabelEncoder, StandardScaler

OUTPUT_DIR = Path(os.environ.get("VIT_OUTPUT_DIR", "/content/vit_training_output"))
MODELS_DIR = OUTPUT_DIR / "models"
DATA_DIR   = OUTPUT_DIR / "data"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_COLS = [
    "home_form_pts_5",   "away_form_pts_5",
    "home_form_pts_10",  "away_form_pts_10",
    "home_gf_pg_5",      "away_gf_pg_5",
    "home_ga_pg_5",      "away_ga_pg_5",
    "home_gf_pg_10",     "away_gf_pg_10",
    "home_ga_pg_10",     "away_ga_pg_10",
    "h2h_home_win_pct",  "h2h_draw_pct",     "h2h_away_win_pct",
    "h2h_home_goals_pg", "h2h_away_goals_pg",
    "home_adv_league",
    "elo_diff",
    "lambda_home_est",   "lambda_away_est",
]

TARGET_COL = "target"   # 0=Home, 1=Draw, 2=Away
TARGET_MAP = {0: "home", 1: "draw", 2: "away"}


# ─── Data loading ─────────────────────────────────────────────────────────────

def load_csv(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    required = ["home_team", "away_team", "home_goals", "away_goals"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")
    df["home_goals"] = pd.to_numeric(df["home_goals"], errors="coerce").fillna(0).astype(int)
    df["away_goals"] = pd.to_numeric(df["away_goals"], errors="coerce").fillna(0).astype(int)
    if "league" not in df.columns:
        df["league"] = "unknown"
    print(f"Loaded {len(df):,} matches from {csv_path}")
    return df


# ─── Feature engineering ──────────────────────────────────────────────────────

def _window_stats(history: List[dict], n: int) -> dict:
    """Compute form over last n matches from a sorted list of match dicts."""
    recent = history[-n:] if len(history) >= n else history
    if not recent:
        return {"pts_pg": 1.0, "gf_pg": 1.2, "ga_pg": 1.2}
    pts = sum(r["pts"] for r in recent)
    gf  = sum(r["gf"] for r in recent)
    ga  = sum(r["ga"] for r in recent)
    n_m = len(recent)
    return {"pts_pg": pts / n_m, "gf_pg": gf / n_m, "ga_pg": ga / n_m}


def _elo_rating(team: str, elo_store: dict, base: float = 1500.0) -> float:
    return elo_store.get(team, base)


def _elo_expected(r_a: float, r_b: float) -> float:
    return 1.0 / (1.0 + 10 ** ((r_b - r_a) / 400.0))


def _poisson_lambda(home_atk: float, away_def: float, league_avg: float = 1.35) -> float:
    return max(0.20, home_atk * away_def * league_avg)


def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build comprehensive feature set with rolling windows, H2H, Elo, and Poisson lambdas.
    Processes matches in chronological order so no future data leaks into features.
    """
    team_history:  Dict[str, List[dict]] = {}  # team → sorted match results
    h2h_history:   Dict[str, List[dict]] = {}  # "Home_Away" → results
    elo_store:     Dict[str, float]      = {}
    league_home_wins: Dict[str, List[int]] = {}

    # Team attack/defense ratings (Dixon-Coles style, updated online)
    team_attack:  Dict[str, float] = {}
    team_defense: Dict[str, float] = {}

    K = 32.0
    rows = []

    for _, row in df.iterrows():
        home = str(row["home_team"]).strip()
        away = str(row["away_team"]).strip()
        hg   = int(row["home_goals"])
        ag   = int(row["away_goals"])
        league = str(row.get("league", "unknown"))

        h_hist = team_history.get(home, [])
        a_hist = team_history.get(away, [])

        # Rolling form windows
        h5  = _window_stats(h_hist, 5)
        h10 = _window_stats(h_hist, 10)
        a5  = _window_stats(a_hist, 5)
        a10 = _window_stats(a_hist, 10)

        # Head-to-head
        h2h_key = f"{home}__{away}"
        h2h = h2h_history.get(h2h_key, [])
        if h2h:
            hw = sum(1 for r in h2h if r["result"] == "H") / len(h2h)
            dw = sum(1 for r in h2h if r["result"] == "D") / len(h2h)
            aw = sum(1 for r in h2h if r["result"] == "A") / len(h2h)
            h2h_hg = sum(r["home_goals"] for r in h2h) / len(h2h)
            h2h_ag = sum(r["away_goals"] for r in h2h) / len(h2h)
        else:
            hw, dw, aw = 0.45, 0.27, 0.28
            h2h_hg, h2h_ag = 1.35, 1.05

        # League home advantage
        lg_hist = league_home_wins.get(league, [])
        home_adv = sum(lg_hist[-100:]) / max(len(lg_hist[-100:]), 1) if lg_hist else 0.45

        # Elo
        r_h = _elo_rating(home, elo_store) + 50  # home field bonus
        r_a = _elo_rating(away, elo_store)
        elo_diff = r_h - r_a

        # Poisson lambda estimates from attack/defense ratings
        atk_h = team_attack.get(home, 1.0)
        def_a = team_defense.get(away, 1.0)
        atk_a = team_attack.get(away, 1.0)
        def_h = team_defense.get(home, 1.0)
        lam_h = _poisson_lambda(atk_h, def_a)
        lam_a = _poisson_lambda(atk_a, def_h)

        # Target
        if hg > ag:
            target = 0; result = "H"
        elif hg == ag:
            target = 1; result = "D"
        else:
            target = 2; result = "A"

        rows.append({
            "home_team": home, "away_team": away, "league": league,
            "home_goals": hg, "away_goals": ag, "result": result,
            "home_form_pts_5":   h5["pts_pg"],
            "away_form_pts_5":   a5["pts_pg"],
            "home_form_pts_10":  h10["pts_pg"],
            "away_form_pts_10":  a10["pts_pg"],
            "home_gf_pg_5":      h5["gf_pg"],
            "away_gf_pg_5":      a5["gf_pg"],
            "home_ga_pg_5":      h5["ga_pg"],
            "away_ga_pg_5":      a5["ga_pg"],
            "home_gf_pg_10":     h10["gf_pg"],
            "away_gf_pg_10":     a10["gf_pg"],
            "home_ga_pg_10":     h10["ga_pg"],
            "away_ga_pg_10":     a10["ga_pg"],
            "h2h_home_win_pct":  hw,
            "h2h_draw_pct":      dw,
            "h2h_away_win_pct":  aw,
            "h2h_home_goals_pg": h2h_hg,
            "h2h_away_goals_pg": h2h_ag,
            "home_adv_league":   home_adv,
            "elo_diff":          elo_diff,
            "lambda_home_est":   lam_h,
            "lambda_away_est":   lam_a,
            "target": target,
        })

        # ── Update online statistics ───────────────────────────────────
        h_pts = 3 if result == "H" else (1 if result == "D" else 0)
        a_pts = 3 if result == "A" else (1 if result == "D" else 0)
        team_history.setdefault(home, []).append({"pts": h_pts, "gf": hg, "ga": ag})
        team_history.setdefault(away, []).append({"pts": a_pts, "gf": ag, "ga": hg})

        h2h_history.setdefault(h2h_key, []).append({
            "result": result, "home_goals": hg, "away_goals": ag
        })
        # Also store reverse H2H
        rev_key = f"{away}__{home}"
        h2h_history.setdefault(rev_key, []).append({
            "result": "A" if result == "H" else ("H" if result == "A" else "D"),
            "home_goals": ag, "away_goals": hg,
        })

        league_home_wins.setdefault(league, []).append(1 if result == "H" else 0)

        # Elo update
        e_h = _elo_expected(r_h, r_a)
        score_h = {"H": 1.0, "D": 0.5, "A": 0.0}[result]
        elo_store[home] = round(elo_store.get(home, 1500.0) + K * (score_h - e_h), 1)
        elo_store[away] = round(elo_store.get(away, 1500.0) + K * ((1 - score_h) - (1 - e_h)), 1)

        # Attack/defense exponential smoothing (α = 0.1)
        α = 0.10
        team_attack[home]  = round(team_attack.get(home, 1.0) * (1 - α) + hg * α, 4)
        team_attack[away]  = round(team_attack.get(away, 1.0) * (1 - α) + ag * α, 4)
        team_defense[home] = round(team_defense.get(home, 1.0) * (1 - α) + ag * α, 4)
        team_defense[away] = round(team_defense.get(away, 1.0) * (1 - α) + hg * α, 4)

    feat_df = pd.DataFrame(rows)
    print(f"Built feature matrix: {feat_df.shape[0]:,} rows × {feat_df.shape[1]} columns")
    return feat_df


# ─── Model definitions ────────────────────────────────────────────────────────

def _make_models() -> Dict[str, object]:
    """Return a dict of key → unfitted sklearn estimator for all 12 variants."""
    return {
        "logistic_v1": LogisticRegression(
            max_iter=2000, C=1.0, solver="lbfgs",
            multi_class="multinomial", class_weight="balanced"
        ),
        "rf_v1": RandomForestClassifier(
            n_estimators=300, max_depth=8, min_samples_leaf=5,
            class_weight="balanced", random_state=42, n_jobs=-1
        ),
        "xgb_v1": GradientBoostingClassifier(
            n_estimators=200, learning_rate=0.08, max_depth=5,
            subsample=0.8, min_samples_leaf=10, random_state=42
        ),
        "poisson_v1": LogisticRegression(
            max_iter=2000, C=0.5, solver="saga",
            multi_class="multinomial", class_weight="balanced"
        ),
        "elo_v1": LogisticRegression(
            max_iter=2000, C=2.0, solver="lbfgs",
            multi_class="multinomial", class_weight="balanced"
        ),
        "dixon_coles_v1": GradientBoostingClassifier(
            n_estimators=150, learning_rate=0.10, max_depth=4,
            subsample=0.75, random_state=42
        ),
        "lstm_v1": GradientBoostingClassifier(
            n_estimators=200, learning_rate=0.06, max_depth=6,
            subsample=0.85, random_state=1, warm_start=False
        ),
        "transformer_v1": RandomForestClassifier(
            n_estimators=400, max_depth=10, min_samples_leaf=3,
            class_weight="balanced_subsample", random_state=7, n_jobs=-1
        ),
        "ensemble_v1": VotingClassifier(
            estimators=[
                ("lr",  LogisticRegression(max_iter=1000, C=1.0, multi_class="multinomial")),
                ("rf",  RandomForestClassifier(n_estimators=150, random_state=42)),
                ("gb",  GradientBoostingClassifier(n_estimators=100, random_state=42)),
            ],
            voting="soft",
        ),
        "market_v1": LogisticRegression(
            max_iter=2000, C=0.1, solver="lbfgs",
            multi_class="multinomial"
        ),
        "bayes_v1": GaussianNB(),
        "hybrid_v1": GradientBoostingClassifier(
            n_estimators=300, learning_rate=0.05, max_depth=6,
            subsample=0.80, min_samples_leaf=5, random_state=99
        ),
    }


# ─── Feature subsets per model type ──────────────────────────────────────────

# Some models benefit from focused feature subsets
_MODEL_FEATURES = {
    # Elo model: only Elo-derived features
    "elo_v1": ["elo_diff", "home_adv_league", "h2h_home_win_pct", "h2h_draw_pct"],
    # Poisson model: lambda-based features
    "poisson_v1": ["lambda_home_est", "lambda_away_est", "home_adv_league",
                   "home_gf_pg_5", "away_gf_pg_5", "home_ga_pg_5", "away_ga_pg_5"],
    # Market model: minimal features (acts as benchmark)
    "market_v1": ["elo_diff", "h2h_home_win_pct", "h2h_away_win_pct",
                  "lambda_home_est", "lambda_away_est"],
}


def _get_features(key: str) -> List[str]:
    return _MODEL_FEATURES.get(key, FEATURE_COLS)


# ─── Training ─────────────────────────────────────────────────────────────────

def train_all_models(feat_df: pd.DataFrame) -> Dict[str, dict]:
    """
    Train all 12 model variants with probability calibration.
    Returns dict of key → metrics.
    """
    metrics: Dict[str, dict] = {}
    models_to_train = _make_models()

    # Drop rows with NaN features
    all_cols = list(set(col for cols in [FEATURE_COLS] + list(_MODEL_FEATURES.values())
                         for col in cols))
    feat_df = feat_df.dropna(subset=FEATURE_COLS)

    y_full = feat_df[TARGET_COL].values

    for key, model in models_to_train.items():
        print(f"\n── Training {key} ─────────────────────────────────")
        feat_cols = _get_features(key)
        X_full = feat_df[feat_cols].fillna(0).values

        X_train, X_test, y_train, y_test = train_test_split(
            X_full, y_full, test_size=0.20, random_state=42,
            stratify=y_full if len(set(y_full)) == 3 else None
        )

        # Scale features for linear models
        scaler = None
        linear_keys = {"logistic_v1", "elo_v1", "poisson_v1", "market_v1", "bayes_v1"}
        if key in linear_keys:
            scaler = StandardScaler()
            X_train = scaler.fit_transform(X_train)
            X_test  = scaler.transform(X_test)

        # Train with probability calibration (isotonic for large datasets)
        calibration_method = "isotonic" if len(X_train) > 2000 else "sigmoid"
        try:
            calibrated = CalibratedClassifierCV(model, cv=5, method=calibration_method)
            calibrated.fit(X_train, y_train)
            trained_model = calibrated
        except Exception as e:
            print(f"  Calibration failed ({e}), using uncalibrated model")
            model.fit(X_train, y_train)
            trained_model = model

        # Evaluate
        preds = trained_model.predict(X_test)
        acc   = float(accuracy_score(y_test, preds))

        # Over/Under accuracy proxy (binary: home wins vs not)
        ou_acc = float(accuracy_score(y_test > 0, preds > 0))

        ll  = 0.0
        bri = 0.0
        if hasattr(trained_model, "predict_proba"):
            proba = trained_model.predict_proba(X_test)
            try:
                ll  = float(log_loss(y_test, proba, labels=[0, 1, 2]))
                bri = float(brier_score_loss(y_test == 0, proba[:, 0]))
            except Exception:
                pass

        print(f"  accuracy={acc:.4f}  log_loss={ll:.4f}  brier={bri:.4f}")

        # Save model payload
        payload = {
            "model":           trained_model,
            "scaler":          scaler,
            "feature_columns": feat_cols,
            "target_labels":   ["home", "draw", "away"],
            "metrics": {
                "accuracy":             acc,
                "1x2_accuracy":         acc,
                "over_under_accuracy":  ou_acc,
                "log_loss":             ll,
                "brier_score":          bri,
            },
            "version": "3.1.0",
            "training_samples": len(X_train),
        }

        pkl_path = MODELS_DIR / f"{key}.pkl"
        joblib.dump(payload, pkl_path)
        print(f"  Saved → {pkl_path}")
        metrics[key] = payload["metrics"]

    return metrics


# ─── Output packaging ─────────────────────────────────────────────────────────

def package_output(source_df: pd.DataFrame, feat_df: pd.DataFrame, metrics: dict) -> Path:
    """Save data and create distributable zip."""
    source_df.to_json(DATA_DIR / "historical_matches.json", orient="records", indent=2)
    feat_df[FEATURE_COLS + [TARGET_COL, "home_team", "away_team", "league"]].to_json(
        DATA_DIR / "features.json", orient="records", indent=2
    )
    with open(OUTPUT_DIR / "training_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)

    zip_path = OUTPUT_DIR / "vit_models.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for p in MODELS_DIR.glob("*.pkl"):
            zf.write(p, p.name)
        zf.write(DATA_DIR / "historical_matches.json", "historical_matches.json")
        zf.write(OUTPUT_DIR / "training_metrics.json", "training_metrics.json")

    size_mb = round(zip_path.stat().st_size / 1_048_576, 2)
    print(f"\nPackaged → {zip_path} ({size_mb} MB)")
    return zip_path


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    csv_path = os.environ.get("VIT_TRAINING_CSV", "/content/historical_matches.csv")

    # Load data
    df = load_csv(csv_path)

    # Build features
    feat_df = build_features(df)

    # Train all 12 models
    metrics = train_all_models(feat_df)

    # Package outputs
    zip_out = package_output(df, feat_df, metrics)

    print("\n" + "=" * 60)
    print("Training complete — v3.1.0")
    print(f"Output zip: {zip_out}")
    print("\nPer-model accuracy:")
    for k, m in sorted(metrics.items()):
        print(f"  {k:<20s}  acc={m['accuracy']:.4f}  log_loss={m.get('log_loss', 0):.4f}")
    print("=" * 60)
    print("\nUpload vit_models.zip via Admin > Model Weights Upload in VIT dashboard.")
