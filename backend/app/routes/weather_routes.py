"""
InsureChain — Weather & NDVI Data Routes
GET /api/weather/<district> — Recent weather time series
GET /api/ndvi/<district> — Current NDVI and 30-day trend
"""
import logging
from flask import Blueprint, request, jsonify

from app import limiter

logger = logging.getLogger(__name__)

weather_bp = Blueprint('weather', __name__)

# District coordinate lookup
DISTRICT_COORDS = {
    'nagpur':     (21.1458, 79.0882),
    'amravati':   (20.9320, 77.7523),
    'wardha':     (20.7453, 78.6022),
    'yavatmal':   (20.3888, 78.1204),
    'akola':      (20.7002, 77.0082),
    'buldhana':   (20.5293, 76.1842),
    'washim':     (20.1041, 77.1340),
    'chandrapur': (19.9500, 79.2961),
    'gadchiroli': (20.1826, 80.0096),
    'nanded':     (19.1383, 77.3210),
}


@weather_bp.route('/api/weather/<district>', methods=['GET'])
@limiter.limit("100 per hour")
def get_weather(district):
    """
    Get recent weather data for a district as a time series.
    Query param: days (default 30)
    """
    # Try query params first, then hardcoded list
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    
    if lat and lon:
        coords = (lat, lon)
    else:
        district_key = district.lower()
        coords = DISTRICT_COORDS.get(district_key)

    if not coords:
        # Final fallback: If unknown and no coords, return 404 Not Found
        return jsonify({"error": f"District '{district}' coordinates missing. Provide lat/lon.", "code": "DISTRICT_NOT_FOUND"}), 404

    days = request.args.get('days', 30, type=int)
    days = min(days, 365)  # Cap at 1 year

    try:
        from app.services.nasa_power_service import fetch_current_weather, calculate_rolling_features

        lat, lon = coords
        df = fetch_current_weather(lat, lon, days=days)

        if df.empty:
            return jsonify({
                "district": district,
                "data": [],
                "count": 0,
                "error": "No weather data available from NASA POWER",
            }), 200

        # Add rolling features
        df = calculate_rolling_features(df)

        # Convert to JSON-serializable format
        records = []
        for _, row in df.iterrows():
            records.append({
                "date": row['date'].isoformat() if hasattr(row['date'], 'isoformat') else str(row['date']),
                "rainfall_mm": round(float(row['rainfall_mm']), 2),
                "temperature_c": round(float(row['temperature_c']), 1),
                "humidity_pct": round(float(row['humidity_pct']), 1),
                "rainfall_7d_avg": round(float(row.get('rainfall_7d_avg', 0)), 2),
                "temp_max_5d": round(float(row.get('temp_max_5d', 0)), 1),
                "consecutive_dry_days": int(row.get('consecutive_dry_days', 0)),
            })

        return jsonify({
            "district": district,
            "lat": lat,
            "lon": lon,
            "data": records,
            "count": len(records),
            "days_requested": days,
        }), 200

    except Exception as e:
        logger.error(f"Weather data fetch failed for {district}: {e}")
        return jsonify({"error": str(e), "code": "WEATHER_ERROR"}), 500


@weather_bp.route('/api/ndvi/<district>', methods=['GET'])
@limiter.limit("100 per hour")
def get_ndvi(district):
    """Get current NDVI value and 30-day trend for a district."""
    # Try query params first
    lat = request.args.get('lat', type=float)
    lon = request.args.get('lon', type=float)
    
    if lat and lon:
        coords = (lat, lon)
    else:
        district_key = district.lower()
        coords = DISTRICT_COORDS.get(district_key)

    if not coords:
        return jsonify({"error": f"District '{district}' coordinates missing.", "code": "COORDS_MISSING"}), 400

    try:
        from app.services.ndvi_service import get_district_ndvi, calculate_ndvi_delta

        lat, lon = coords

        # Current NDVI
        current = get_district_ndvi(district, lat, lon)

        # 30-day delta
        delta = calculate_ndvi_delta(district, lat, lon)

        return jsonify({
            "district": district,
            "current": current,
            "trend": delta,
        }), 200

    except Exception as e:
        logger.error(f"NDVI fetch failed for {district}: {e}")
        return jsonify({"error": str(e), "code": "NDVI_ERROR"}), 500
