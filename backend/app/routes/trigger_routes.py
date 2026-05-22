"""
InsureChain — Trigger Check Routes
POST /api/trigger-check — Run ML trigger analysis for a district
GET /api/trigger-history/<district> — Historical trigger results
"""
import logging
from flask import Blueprint, request, jsonify

from app.utils.security import require_api_key
from app import limiter

logger = logging.getLogger(__name__)

trigger_bp = Blueprint('triggers', __name__)


@trigger_bp.route('/api/trigger-check', methods=['POST'])
@require_api_key
@limiter.limit("100 per hour")
def trigger_check():
    """
    Run ML trigger analysis for a district.

    Request body:
    {
        "lat": 21.1458,
        "lon": 79.0882,
        "district": "nagpur",
        "date_range_days": 30
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required", "code": "BAD_REQUEST"}), 400

    lat = data.get('lat')
    lon = data.get('lon')
    district = data.get('district')
    date_range_days = data.get('date_range_days', 30)

    if not all([lat, lon, district]):
        return jsonify({
            "error": "Missing required fields: lat, lon, district",
            "code": "MISSING_FIELDS"
        }), 400

    try:
        from ml.trigger_model.trigger_classifier import check_triggers
        result = check_triggers(lat, lon, district, date_range_days)

        # Save result to Firestore for history
        try:
            from app.services.firestore_service import save_trigger_result
            save_trigger_result(district, result)
        except Exception as e:
            logger.warning(f"Failed to save trigger result to Firestore: {e}")

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Trigger check failed for {district}: {e}")
        return jsonify({
            "error": f"Trigger check failed: {str(e)}",
            "code": "TRIGGER_CHECK_ERROR"
        }), 500


@trigger_bp.route('/api/trigger-history/<district>', methods=['GET'])
@limiter.limit("100 per hour")
def trigger_history(district):
    """Get last 30 days of trigger check results for a district."""
    try:
        from app.services.firestore_service import get_trigger_history
        history = get_trigger_history(district)
        return jsonify({
            "district": district,
            "results": history,
            "count": len(history),
        }), 200
    except Exception as e:
        logger.error(f"Error fetching trigger history for {district}: {e}")
        return jsonify({
            "error": f"Failed to fetch trigger history: {str(e)}",
            "code": "HISTORY_ERROR"
        }), 500
