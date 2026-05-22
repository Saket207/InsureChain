"""
InsureChain Backend — Flask Application Factory
Creates and configures the Flask app with all blueprints, CORS, rate limiting, and error handlers.
"""
import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from config import config_by_name

# Global limiter instance
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per hour"],
    storage_uri="memory://",
)


def create_app(config_name=None):
    """Application factory — creates and configures the Flask app."""
    if config_name is None:
        config_name = os.getenv('FLASK_ENV', 'development')

    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])

    # ── Logging ──
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    )
    app.logger.setLevel(logging.INFO)

    # ── CORS ──
    # Configure CORS - allow all for debugging
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # ── Rate Limiter ──
    limiter.init_app(app)

    # ── Register Blueprints ──
    from app.routes.health_routes import health_bp
    from app.routes.trigger_routes import trigger_bp
    from app.routes.risk_routes import risk_bp
    from app.routes.weather_routes import weather_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(trigger_bp)
    app.register_blueprint(risk_bp)
    app.register_blueprint(weather_bp)

    # ── Error Handlers ──
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"error": str(e), "code": "BAD_REQUEST"}), 400

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Resource not found", "code": "NOT_FOUND"}), 404

    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return jsonify({"error": "Rate limit exceeded", "code": "RATE_LIMITED"}), 429

    @app.errorhandler(500)
    def internal_error(e):
        app.logger.error(f"Internal error: {e}")
        return jsonify({"error": "Internal server error", "code": "INTERNAL_ERROR"}), 500

    app.logger.info(f"InsureChain Backend initialized [{config_name}]")
    return app
