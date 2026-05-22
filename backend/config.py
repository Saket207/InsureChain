"""
InsureChain Backend — Centralized Configuration
Loads from .env with sensible defaults.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""
    SECRET_KEY = os.getenv('SECRET_KEY', 'insurechain-dev-secret')
    API_KEY = os.getenv('API_KEY', 'insurechain-api-key-2026')

    # NASA POWER
    NASA_POWER_BASE_URL = os.getenv(
        'NASA_POWER_BASE_URL',
        'https://power.larc.nasa.gov/api/temporal/daily/point'
    )

    # Copernicus (optional)
    COPERNICUS_USER = os.getenv('COPERNICUS_USER', '')
    COPERNICUS_PASSWORD = os.getenv('COPERNICUS_PASSWORD', '')

    # Twilio (optional)
    TWILIO_ACCOUNT_SID = os.getenv('TWILIO_ACCOUNT_SID', '')
    TWILIO_AUTH_TOKEN = os.getenv('TWILIO_AUTH_TOKEN', '')
    TWILIO_PHONE_NUMBER = os.getenv('TWILIO_PHONE_NUMBER', '')
    TWILIO_WHATSAPP_NUMBER = os.getenv('TWILIO_WHATSAPP_NUMBER', '')

    # Firebase
    FIREBASE_SERVICE_ACCOUNT_JSON_PATH = os.getenv(
        'FIREBASE_SERVICE_ACCOUNT_JSON_PATH',
        './serviceAccountKey.json'
    )

    # CORS
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5175')

    # CoinGecko
    COINGECKO_API_URL = os.getenv(
        'COINGECKO_API_URL',
        'https://api.coingecko.com/api/v3'
    )

    # APScheduler
    SCHEDULER_API_ENABLED = True

    # Districts (Maharashtra — Vidarbha region)
    DISTRICTS = [
        {"id": "nagpur",     "name": "Nagpur",     "lat": 21.1458, "lon": 79.0882},
        {"id": "amravati",   "name": "Amravati",   "lat": 20.9320, "lon": 77.7523},
        {"id": "wardha",     "name": "Wardha",     "lat": 20.7453, "lon": 78.6022},
        {"id": "yavatmal",   "name": "Yavatmal",   "lat": 20.3888, "lon": 78.1204},
        {"id": "akola",      "name": "Akola",      "lat": 20.7002, "lon": 77.0082},
        {"id": "buldhana",   "name": "Buldhana",   "lat": 20.5293, "lon": 76.1842},
        {"id": "washim",     "name": "Washim",     "lat": 20.1041, "lon": 77.1340},
        {"id": "chandrapur", "name": "Chandrapur", "lat": 19.9500, "lon": 79.2961},
        {"id": "gadchiroli", "name": "Gadchiroli", "lat": 20.1826, "lon": 80.0096},
        {"id": "nanded",     "name": "Nanded",     "lat": 19.1383, "lon": 77.3210},
    ]


class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False


class ProductionConfig(Config):
    DEBUG = False
    TESTING = False


class TestingConfig(Config):
    TESTING = True
    DEBUG = True


config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
}
