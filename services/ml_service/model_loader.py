"""
ModelLoader — loads trained .pkl files from backend/models/trained/

Caches models in memory so they are only read from disk once.
Returns None if the file is missing or fails to load, allowing
the orchestrator to fall back to its algorithmic models.
"""
import logging
import os
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

_MODEL_CACHE: Dict[str, Any] = {}

_TRAINED_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "backend", "models", "trained",
)


def load_model(model_key: str, cache_enabled: bool = True) -> Optional[Dict[str, Any]]:
    """
    Load a trained model payload from backend/models/trained/<model_key>.pkl.

    Returns the payload dict (with 'model', 'scaler', etc.) or None.
    """
    if cache_enabled and model_key in _MODEL_CACHE:
        return _MODEL_CACHE[model_key]

    pkl_path = os.path.join(_TRAINED_DIR, f"{model_key}.pkl")
    if not os.path.exists(pkl_path):
        logger.debug(f"No trained pkl found for {model_key} at {pkl_path}")
        return None

    try:
        import joblib
        payload = joblib.load(pkl_path)
        if not isinstance(payload, dict) or "model" not in payload:
            logger.warning(f"Unexpected pkl format for {model_key} — skipping")
            return None

        if cache_enabled:
            _MODEL_CACHE[model_key] = payload

        logger.info(
            f"✅ ModelLoader: loaded {model_key} "
            f"(acc={payload.get('metrics', {}).get('accuracy', '?')}, "
            f"samples={payload.get('training_samples', '?')})"
        )
        return payload
    except Exception as exc:
        logger.warning(f"ModelLoader: failed to load {model_key}.pkl: {exc}")
        return None


def clear_cache() -> None:
    """Clear the in-memory model cache (e.g. after uploading new weights)."""
    _MODEL_CACHE.clear()
    logger.info("ModelLoader cache cleared")


def list_available_models() -> list:
    """Return the list of model keys that have trained pkl files available."""
    if not os.path.isdir(_TRAINED_DIR):
        return []
    return [
        f[:-4]
        for f in os.listdir(_TRAINED_DIR)
        if f.endswith(".pkl")
    ]
