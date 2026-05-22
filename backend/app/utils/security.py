"""
InsureChain — Security Utilities
API key middleware, rate limiting helpers, and consistent error responses.
"""
import os
import logging
from functools import wraps
from flask import request, jsonify

logger = logging.getLogger(__name__)


def require_api_key(f):
    """
    Decorator to require an API key in the Authorization header.
    Expects: Authorization: Bearer <API_KEY>
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')

        if not auth_header:
            # In development/testing, allow requests without API key
            if os.getenv('FLASK_ENV') in ('development', 'testing'):
                return f(*args, **kwargs)
            return jsonify({
                "error": "Authorization header required",
                "code": "UNAUTHORIZED",
            }), 401

        # Parse "Bearer <token>" format
        parts = auth_header.split(' ')
        if len(parts) != 2 or parts[0].lower() != 'bearer':
            return jsonify({
                "error": "Invalid authorization format. Use: Bearer <API_KEY>",
                "code": "INVALID_AUTH_FORMAT",
            }), 401

        token = parts[1]
        expected_key = os.getenv('API_KEY', 'insurechain-api-key-2026')

        if token != expected_key:
            # In development/testing, log but allow
            if os.getenv('FLASK_ENV') in ('development', 'testing'):
                logger.warning(f"Invalid API key provided, but allowing in dev/test mode")
                return f(*args, **kwargs)
            return jsonify({
                "error": "Invalid API key",
                "code": "FORBIDDEN",
            }), 403

        return f(*args, **kwargs)

    return decorated


def error_response(message, code, status=400):
    """Create a consistent error response."""
    return jsonify({
        "error": message,
        "code": code,
    }), status
