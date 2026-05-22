"""
InsureChain — Firebase Admin SDK Initialization
Initializes Firebase Admin for server-side Firestore access.
"""
import os
import logging
import firebase_admin
from firebase_admin import credentials, firestore

logger = logging.getLogger(__name__)

_db = None


def get_db():
    """
    Returns a Firestore client. Initializes Firebase Admin SDK on first call.
    Handles the case where the SDK is already initialized (e.g., in tests).
    """
    global _db

    if _db is not None:
        return _db

    try:
        # Check if already initialized
        firebase_admin.get_app()
        logger.info("Firebase Admin SDK already initialized")
    except ValueError:
        # Not initialized yet — do it now
        service_account_path = os.getenv(
            'FIREBASE_SERVICE_ACCOUNT_JSON_PATH',
            './serviceAccountKey.json'
        )

        if os.path.exists(service_account_path):
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred)
            logger.info(f"Firebase Admin SDK initialized with service account: {service_account_path}")
        else:
            # Initialize without credentials (works in GCP environments with default creds)
            logger.warning(
                f"Service account file not found at '{service_account_path}'. "
                "Attempting initialization with default credentials. "
                "Firestore operations will fail if not running in a GCP environment."
            )
            try:
                firebase_admin.initialize_app()
            except Exception as e:
                logger.error(f"Firebase Admin SDK initialization failed: {e}")
                return None

    try:
        _db = firestore.client()
        logger.info("Firestore client created successfully")
        print("   [SUCCESS] Firebase Firestore client connected")
        return _db
    except Exception as e:
        logger.error(f"Failed to create Firestore client: {e}")
        print(f"   [ERROR] Firebase Connection Failed: {e}")
        return None


def reset_db():
    """Reset the cached db client (useful for testing)."""
    global _db
    _db = None
