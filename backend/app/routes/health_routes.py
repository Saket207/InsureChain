"""
InsureChain — Health Check Routes
GET /api/health — API status, ML model status, last cron run
"""
import logging
from datetime import datetime, timezone
from flask import Blueprint, jsonify

logger = logging.getLogger(__name__)

health_bp = Blueprint('health', __name__)

# Track last cron run (updated by cron jobs)
_last_cron_run = None


def set_last_cron_run():
    global _last_cron_run
    _last_cron_run = datetime.now(timezone.utc).isoformat()


@health_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint — returns API status and diagnostics."""
    # Check ML models
    try:
        from ml.trigger_model.trigger_classifier import models_loaded, load_models
        ml_status = models_loaded()
        if not ml_status:
            load_models()
            ml_status = models_loaded()
    except Exception as e:
        logger.error(f"ML status check failed: {e}")
        ml_status = False

    # Check Firebase
    try:
        from app.services.firebase_init import get_db
        db = get_db()
        firebase_status = db is not None
    except Exception as e:
        logger.error(f"Firebase status check failed: {e}")
        firebase_status = False

    return jsonify({
        "status": "online",
        "service": "InsureChain Backend",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "diagnostics": {
            "ml_models_loaded": ml_status,
            "firebase_connected": firebase_status,
            "last_cron_run": _last_cron_run,
        },
    }), 200
