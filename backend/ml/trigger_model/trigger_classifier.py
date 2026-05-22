"""
InsureChain — XGBoost Trigger Classification Model
Core ML model that decides if a weather trigger (drought/flood/heatwave/frost) has fired.

Each trigger type has its own binary XGBoost classifier.
Models are loaded from saved joblib files in ml/saved_models/.
"""
import os
import logging
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import joblib

from app.services.nasa_power_service import fetch_current_weather, calculate_rolling_features
from app.services.ndvi_service import calculate_ndvi_delta

logger = logging.getLogger(__name__)

# Feature columns expected by the models
FEATURE_COLUMNS = [
    'rainfall_7d_avg', 'rainfall_14d_avg', 'rainfall_21d_avg',
    'temp_max_5d', 'temp_min_5d', 'humidity_pct',
    'consecutive_dry_days', 'consecutive_hot_days',
    '3d_rainfall_total', 'ndvi_delta', 'season_encoded',
    'district_drought_freq', 'month', 'day_of_year',
]

TRIGGER_TYPES = ['drought', 'flood', 'heatwave', 'frost']

# District drought frequencies (historical, from past 10 years analysis)
DISTRICT_DROUGHT_FREQ = {
    'nagpur': 0.35, 'amravati': 0.30, 'wardha': 0.25,
    'yavatmal': 0.45, 'akola': 0.20, 'buldhana': 0.15,
    'washim': 0.22, 'chandrapur': 0.12, 'gadchiroli': 0.10,
    'nanded': 0.28,
}

# Cached models
_models = {}

# Load models on initialization
def init_models():
    try:
        count = load_models()
        print(f"Intelligence Engine: Loaded {count}/4 ML models")
    except Exception as e:
        print(f"Intelligence Engine: Failed to load models: {e}")

init_models()


def _get_models_dir():
    """Get the path to the saved models directory."""
    return os.path.join(os.path.dirname(__file__), '..', 'saved_models')


def load_models():
    """Load all 4 XGBoost trigger classifiers from saved files."""
    global _models
    models_dir = _get_models_dir()

    for trigger in TRIGGER_TYPES:
        model_path = os.path.join(models_dir, f'{trigger}_classifier.joblib')
        if os.path.exists(model_path):
            _models[trigger] = joblib.load(model_path)
            logger.info(f"Loaded {trigger} classifier from {model_path}")
        else:
            logger.warning(f"Model file not found: {model_path}. Using rule-based fallback.")
            _models[trigger] = None

    return len([m for m in _models.values() if m is not None])


def models_loaded():
    """Check if models are loaded."""
    return len(_models) > 0 and any(m is not None for m in _models.values())


def _rule_based_trigger(row, trigger_type):
    """
    Rule-based fallback when ML models are not available.
    Returns (fired: bool, confidence: float).
    """
    if trigger_type == 'drought':
        if row.get('consecutive_dry_days', 0) >= 21 and row.get('rainfall_21d_avg', 999) < 2.0:
            confidence = min(0.95, 0.5 + row.get('consecutive_dry_days', 0) * 0.02)
            return True, confidence
        elif row.get('consecutive_dry_days', 0) >= 14:
            confidence = min(0.75, 0.3 + row.get('consecutive_dry_days', 0) * 0.015)
            return False, confidence
        return False, max(0.05, row.get('consecutive_dry_days', 0) * 0.01)

    elif trigger_type == 'flood':
        total_3d = row.get('3d_rainfall_total', 0)
        if total_3d > 150:
            confidence = min(0.95, 0.5 + total_3d * 0.002)
            return True, confidence
        elif total_3d > 80:
            return False, min(0.70, 0.2 + total_3d * 0.003)
        return False, max(0.05, total_3d * 0.002)

    elif trigger_type == 'heatwave':
        hot_days = row.get('consecutive_hot_days', 0)
        temp_max = row.get('temp_max_5d', 30)
        if hot_days >= 5:
            confidence = min(0.95, 0.6 + hot_days * 0.05)
            return True, confidence
        elif temp_max > 42:
            return False, min(0.65, 0.3 + (temp_max - 42) * 0.1)
        return False, max(0.05, (temp_max - 35) * 0.03 if temp_max > 35 else 0.02)

    elif trigger_type == 'frost':
        temp_min = row.get('temp_min_5d', 15)
        month = row.get('month', 6)
        if temp_min < 2 and month in [11, 12, 1, 2]:
            confidence = min(0.90, 0.6 + (2 - temp_min) * 0.1)
            return True, confidence
        elif temp_min < 5 and month in [11, 12, 1, 2]:
            return False, min(0.50, 0.2 + (5 - temp_min) * 0.05)
        return False, 0.02

    return False, 0.05


def _prepare_features(df, district, ndvi_delta=0.0):
    """Prepare the feature vector from the latest weather data."""
    if df.empty:
        return None

    # Take the last row (most recent data)
    latest = df.iloc[-1].to_dict()

    # Determine season encoding
    month = latest['date'].month if hasattr(latest.get('date'), 'month') else datetime.now().month
    season_encoded = 1 if month in [6, 7, 8, 9, 10] else 0

    features = {
        'rainfall_7d_avg': latest.get('rainfall_7d_avg', 0),
        'rainfall_14d_avg': latest.get('rainfall_14d_avg', 0),
        'rainfall_21d_avg': latest.get('rainfall_21d_avg', 0),
        'temp_max_5d': latest.get('temp_max_5d', 30),
        'temp_min_5d': latest.get('temp_min_5d', 15),
        'humidity_pct': latest.get('humidity_pct', 50),
        'consecutive_dry_days': latest.get('consecutive_dry_days', 0),
        'consecutive_hot_days': latest.get('consecutive_hot_days', 0),
        '3d_rainfall_total': latest.get('3d_rainfall_total', 0),
        'ndvi_delta': ndvi_delta,
        'season_encoded': season_encoded,
        'district_drought_freq': DISTRICT_DROUGHT_FREQ.get(district.lower(), 0.20),
        'month': month,
        'day_of_year': latest['date'].timetuple().tm_yday if hasattr(latest.get('date'), 'timetuple') else datetime.now().timetuple().tm_yday,
    }

    return features


def check_triggers(lat, lon, district, date_range_days=30):
    """
    Run all 4 trigger models for a district.

    Args:
        lat (float): District latitude
        lon (float): District longitude
        district (str): District identifier
        date_range_days (int): Number of days of recent data to analyze

    Returns:
        dict: {
            "district": str,
            "triggers": {
                "drought": {"fired": bool, "confidence": float},
                "flood": {"fired": bool, "confidence": float},
                "heatwave": {"fired": bool, "confidence": float},
                "frost": {"fired": bool, "confidence": float},
            },
            "ndvi": float,
            "ndvi_trend": str,
            "weather_summary": {...},
            "data_timestamp": str (ISO)
        }
    """
    # Fetch current weather data
    df = fetch_current_weather(lat, lon, days=date_range_days)

    if df.empty:
        logger.warning(f"No weather data available for {district}. Using synthetic fallback.")
        return _synthetic_fallback(district)

    # Calculate rolling features
    df = calculate_rolling_features(df)

    # Get NDVI delta
    consecutive_dry = int(df.iloc[-1].get('consecutive_dry_days', 0))
    ndvi_data = calculate_ndvi_delta(district, lat, lon, consecutive_dry_days=consecutive_dry)
    ndvi_delta = ndvi_data['delta']

    # Prepare features
    features = _prepare_features(df, district, ndvi_delta)
    if features is None:
        return _synthetic_fallback(district)

    # Run each trigger model
    triggers = {}
    for trigger_type in TRIGGER_TYPES:
        model = _models.get(trigger_type)

        if model is not None:
            # ML model prediction
            feature_vector = pd.DataFrame([features])[FEATURE_COLUMNS]
            try:
                proba = model.predict_proba(feature_vector)[0]
                confidence = float(proba[1])  # Probability of class 1 (triggered)
                fired = confidence >= 0.80  # 80% threshold for firing
                triggers[trigger_type] = {
                    "fired": fired,
                    "confidence": round(confidence, 3),
                }
            except Exception as e:
                logger.error(f"ML prediction error for {trigger_type}: {e}")
                fired, confidence = _rule_based_trigger(features, trigger_type)
                triggers[trigger_type] = {"fired": fired, "confidence": round(confidence, 3)}
        else:
            # Rule-based fallback
            fired, confidence = _rule_based_trigger(features, trigger_type)
            triggers[trigger_type] = {"fired": fired, "confidence": round(confidence, 3)}

    # Weather summary from latest data
    latest = df.iloc[-1]
    weather_summary = {
        "rainfall_7d_avg": round(float(latest.get('rainfall_7d_avg', 0)), 2),
        "temp_max": round(float(latest.get('temp_max_5d', 0)), 1),
        "temp_min": round(float(latest.get('temp_min_5d', 0)), 1),
        "humidity": round(float(latest.get('humidity_pct', 0)), 1),
        "consecutive_dry_days": int(latest.get('consecutive_dry_days', 0)),
        "3d_rainfall_total": round(float(latest.get('3d_rainfall_total', 0)), 2),
    }

    return {
        "district": district,
        "triggers": triggers,
        "ndvi": ndvi_data['current_ndvi'],
        "ndvi_trend": ndvi_data['trend'],
        "weather_summary": weather_summary,
        "data_timestamp": datetime.now(timezone.utc).isoformat(),
    }


def _synthetic_fallback(district):
    """Return a safe fallback when no real data is available."""
    return {
        "district": district,
        "triggers": {
            "drought": {"fired": False, "confidence": 0.0},
            "flood": {"fired": False, "confidence": 0.0},
            "heatwave": {"fired": False, "confidence": 0.0},
            "frost": {"fired": False, "confidence": 0.0},
        },
        "ndvi": 0.5,
        "ndvi_trend": "stable",
        "weather_summary": {
            "rainfall_7d_avg": 0, "temp_max": 0, "temp_min": 0,
            "humidity": 0, "consecutive_dry_days": 0, "3d_rainfall_total": 0,
        },
        "data_timestamp": datetime.now(timezone.utc).isoformat(),
        "error": "No weather data available — using synthetic fallback",
    }
