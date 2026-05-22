# InsureChain Backend — Phase 4

> ML-powered Flask backend for weather monitoring, trigger classification, risk scoring, and farmer alerts.

## Architecture

```
backend/
├── app/                    # Flask application
│   ├── routes/             # API endpoints
│   ├── services/           # Firebase, NASA POWER, NDVI, Twilio
│   └── utils/              # Security, helpers
├── ml/                     # Machine Learning
│   ├── trigger_model/      # XGBoost trigger classifiers
│   ├── risk_model/         # Risk scoring engine
│   ├── training/           # Data prep & training pipeline
│   └── saved_models/       # Trained model files (.joblib)
├── data/                   # Raw & processed datasets
├── scripts/cron/           # Scheduled jobs (APScheduler)
└── tests/                  # Pytest test suite
```

## Quick Start

```bash
# 1. Create virtual environment
cd backend
python -m venv venv
venv\Scripts\activate    # Windows
# source venv/bin/activate  # Linux/Mac

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
# Edit .env with your Firebase service account path

# 4. Start the server
python run.py
# → Server runs on http://localhost:5000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | API status & diagnostics |
| POST | `/api/trigger-check` | Run ML trigger analysis |
| GET | `/api/trigger-history/<district>` | Historical trigger results |
| GET | `/api/risk-scores` | All district risk scores |
| GET | `/api/risk-scores/<district>` | Single district risk score |
| GET | `/api/premium-calculate` | Dynamic premium calculation |
| GET | `/api/weather/<district>` | Recent weather time series |
| GET | `/api/ndvi/<district>` | NDVI value & 30-day trend |

## ML Models

Four XGBoost binary classifiers for trigger detection:
- **Drought**: 21-day rainfall deficit analysis
- **Flood**: 3-day rainfall surge detection
- **Heatwave**: Extended high-temperature monitoring
- **Frost**: Winter cold snap detection

### Training

```bash
# WARNING: Takes 15-30 minutes (NASA POWER API rate limits)
python -m ml.training.train_all_models
```

Pre-trained models are included in `ml/saved_models/` so the server can start immediately.

## Cron Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Risk Score Update | 2:00 AM | Recomputes all district risk scores |
| Trigger Monitoring | 6:00 AM | Checks triggers for active policies |
| Expiry Check | 8:00 AM | Alerts for policies expiring within 7 days |

## Testing

```bash
python -m pytest tests/ -v
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_SERVICE_ACCOUNT_JSON_PATH` | Yes | Path to Firebase Admin SDK key |
| `NASA_POWER_BASE_URL` | No | NASA POWER API URL (default provided) |
| `TWILIO_ACCOUNT_SID` | No | Twilio SMS (log-only without) |
| `TWILIO_AUTH_TOKEN` | No | Twilio auth |
| `COPERNICUS_USER` | No | Satellite NDVI (mock without) |
| `FLASK_ENV` | No | `development` / `production` |
| `API_KEY` | No | API key for protected endpoints |
