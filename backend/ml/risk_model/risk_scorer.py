"""
InsureChain — Risk Scoring Engine
Computes composite risk scores per district for premium pricing and the heatmap.

Risk Score = weighted combination of:
    - Historical drought frequency (30%)
    - Historical flood frequency (20%)
    - Recent NDVI degradation trend (25%)
    - Current rainfall deficit vs normal (25%)
"""
import os
import logging
from datetime import datetime, timezone

import numpy as np

from app.services.nasa_power_service import fetch_current_weather, calculate_rolling_features
from app.services.ndvi_service import calculate_ndvi_delta

logger = logging.getLogger(__name__)

# Historical normals per district (mm/day average rainfall)
# These represent 30-year climatological normals for Maharashtra's Vidarbha region
DISTRICT_NORMALS = {
    'nagpur':     {'rainfall_daily_avg': 3.8, 'drought_freq': 0.35, 'flood_freq': 0.08},
    'amravati':   {'rainfall_daily_avg': 3.5, 'drought_freq': 0.30, 'flood_freq': 0.10},
    'wardha':     {'rainfall_daily_avg': 3.2, 'drought_freq': 0.25, 'flood_freq': 0.07},
    'yavatmal':   {'rainfall_daily_avg': 2.8, 'drought_freq': 0.45, 'flood_freq': 0.05},
    'akola':      {'rainfall_daily_avg': 3.0, 'drought_freq': 0.20, 'flood_freq': 0.12},
    'buldhana':   {'rainfall_daily_avg': 3.4, 'drought_freq': 0.15, 'flood_freq': 0.15},
    'washim':     {'rainfall_daily_avg': 2.9, 'drought_freq': 0.22, 'flood_freq': 0.09},
    'chandrapur': {'rainfall_daily_avg': 4.5, 'drought_freq': 0.12, 'flood_freq': 0.18},
    'gadchiroli': {'rainfall_daily_avg': 5.2, 'drought_freq': 0.10, 'flood_freq': 0.22},
    'nanded':     {'rainfall_daily_avg': 3.1, 'drought_freq': 0.28, 'flood_freq': 0.11},
}


def _normalize_to_100(value, low, high):
    """Normalize a value to a 0-100 scale given expected bounds."""
    if high == low:
        return 50
    score = ((value - low) / (high - low)) * 100
    return max(0, min(100, score))


def _get_risk_level(score):
    """Map numeric risk score to a risk level label."""
    if score <= 25:
        return 'Low'
    elif score <= 50:
        return 'Moderate'
    elif score <= 75:
        return 'High'
    else:
        return 'Critical'


def _get_risk_multiplier(score):
    """Map risk score to premium multiplier."""
    if score <= 25:
        return 1.0
    elif score <= 50:
        return 1.4
    elif score <= 75:
        return 1.8
    else:
        return 2.5


def compute_district_risk_score(district, lat, lon, season='Kharif'):
    """
    Compute composite risk score for ANY location in India.
    """
    district_key = district.lower()
    # If not in our historical database, use regional averages
    normals = DISTRICT_NORMALS.get(district_key, {
        'rainfall_daily_avg': 3.5, 'drought_freq': 0.25, 'flood_freq': 0.12
    })

    # ── Component 1: Historical Drought Frequency (weight: 30%) ──
    drought_freq = normals['drought_freq']
    drought_score = _normalize_to_100(drought_freq, 0.0, 0.50)

    # ── Component 2: Historical Flood Frequency (weight: 20%) ──
    flood_freq = normals['flood_freq']
    flood_score = _normalize_to_100(flood_freq, 0.0, 0.30)

    # ── Component 3: Recent NDVI (Satellite) Degradation (weight: 25%) ──
    try:
        ndvi_data = calculate_ndvi_delta(district, lat, lon)
        ndvi_delta = ndvi_data['delta']
        ndvi_score = _normalize_to_100(-ndvi_delta, -0.3, 0.3)
    except Exception:
        ndvi_score = 50
        ndvi_data = {'current_ndvi': 0.5, 'delta': 0, 'trend': 'stable'}

    # ── Component 4: Current Weather Deficit (weight: 25%) ──
    try:
        # Fetch 30 days of weather for the SPECIFIC coordinates
        df = fetch_current_weather(lat, lon, days=30)
        if not df.empty:
            df = calculate_rolling_features(df)
            actual_avg = df['rainfall_mm'].mean()
            expected_avg = normals['rainfall_daily_avg']
            deficit_ratio = actual_avg / max(expected_avg, 0.1)
            
            # Drought risk if low, Flood risk if high
            if deficit_ratio < 1.0:
                rainfall_score = _normalize_to_100(1.0 - deficit_ratio, 0.0, 0.7) * 0.8
            else:
                rainfall_score = _normalize_to_100(deficit_ratio - 1.0, 0.0, 2.0) * 0.6
            
            # Soil Moisture (Proxy for "Sand Data")
            soil_moisture = df['soil_moisture'].mean() if 'soil_moisture' in df.columns else 0.25
        else:
            rainfall_score = 50
            actual_avg = 0
            soil_moisture = 0.25
    except Exception:
        rainfall_score = 50
        actual_avg = 0
        soil_moisture = 0.25

    # ── Composite Score ──
    composite = (
        drought_score * 0.30 +
        flood_score * 0.20 +
        ndvi_score * 0.25 +
        rainfall_score * 0.25
    )
    composite = round(max(0, min(100, composite)))

    result = {
        'district': district.capitalize(),
        'districtId': district_key,
        'lat': lat,
        'lon': lon,
        'riskScore': composite,
        'riskLevel': _get_risk_level(composite),
        'riskMultiplier': _get_risk_multiplier(composite),
        'transparency': {
            'drought_impact': f"{round(drought_score * 0.30)}%",
            'flood_impact': f"{round(flood_score * 0.20)}%",
            'satellite_impact': f"{round(ndvi_score * 0.25)}%",
            'weather_impact': f"{round(rainfall_score * 0.25)}%"
        },
        'details': {
            'rainfall_30d_avg': round(actual_avg, 2),
            'soil_moisture_index': round(soil_moisture, 3),
            'ndvi_health': ndvi_data.get('current_ndvi', 0.5),
            'consecutive_dry_days': df['consecutive_dry_days'].iloc[-1] if not df.empty else 0
        },
        'computedAt': datetime.now(timezone.utc).isoformat(),
    }
    logger.info(f"Risk score computed for {district}: {composite}")
    return result


def compute_all_district_scores(season='Kharif'):
    """
    Compute risk scores for all 10 districts.
    Called by the nightly cron job.

    Returns:
        list[dict]: Risk score dicts for all districts
    """
    from config import Config
    districts = Config.DISTRICTS

    results = []
    for d in districts:
        try:
            score = compute_district_risk_score(
                d['id'], d['lat'], d['lon'], season
            )
            results.append(score)
        except Exception as e:
            logger.error(f"Error computing risk score for {d['id']}: {e}")
            # Return a safe fallback
            results.append({
                'district': d['name'],
                'districtId': d['id'],
                'lat': d['lat'],
                'lon': d['lon'],
                'riskScore': 50,
                'riskLevel': 'Moderate',
                'riskMultiplier': 1.4,
                'error': str(e),
            })

    logger.info(f"Computed risk scores for {len(results)} districts")
    return results
