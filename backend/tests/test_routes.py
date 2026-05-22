"""
Tests for Flask API routes.
"""
import pytest
import json
from unittest.mock import patch, MagicMock

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ['FLASK_ENV'] = 'testing'

from app import create_app


@pytest.fixture
def client():
    app = create_app('testing')
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


class TestHealthRoute:
    def test_health_returns_200(self, client):
        response = client.get('/api/health')
        assert response.status_code == 200

        data = response.get_json()
        assert data['status'] == 'online'
        assert data['service'] == 'InsureChain Backend'
        assert 'diagnostics' in data

    def test_health_has_diagnostics(self, client):
        response = client.get('/api/health')
        data = response.get_json()

        assert 'ml_models_loaded' in data['diagnostics']
        assert 'firebase_connected' in data['diagnostics']


class TestTriggerRoutes:
    @patch('ml.trigger_model.trigger_classifier.check_triggers')
    @patch('app.services.firestore_service.save_trigger_result')
    def test_trigger_check_success(self, mock_save, mock_check, client):
        mock_check.return_value = {
            "district": "nagpur",
            "triggers": {
                "drought": {"fired": False, "confidence": 0.35},
                "flood": {"fired": False, "confidence": 0.10},
                "heatwave": {"fired": False, "confidence": 0.45},
                "frost": {"fired": False, "confidence": 0.02},
            },
            "ndvi": 0.42,
            "weather_summary": {"rainfall_7d_avg": 2.1, "temp_max": 38.5},
            "data_timestamp": "2024-05-12T06:00:00Z",
        }
        mock_save.return_value = 'mock-id'

        response = client.post('/api/trigger-check',
            data=json.dumps({
                "lat": 21.1458,
                "lon": 79.0882,
                "district": "nagpur",
            }),
            content_type='application/json',
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['district'] == 'nagpur'
        assert 'triggers' in data
        assert 'drought' in data['triggers']

    def test_trigger_check_missing_fields(self, client):
        response = client.post('/api/trigger-check',
            data=json.dumps({"lat": 21.0}),
            content_type='application/json',
        )
        assert response.status_code == 400


class TestRiskRoutes:
    @patch('app.services.firestore_service.get_all_district_risk_scores')
    def test_get_all_risk_scores(self, mock_scores, client):
        mock_scores.return_value = [
            {"district": "Nagpur", "riskScore": 72, "riskLevel": "High"},
            {"district": "Yavatmal", "riskScore": 81, "riskLevel": "Critical"},
        ]

        response = client.get('/api/risk-scores')
        assert response.status_code == 200
        data = response.get_json()
        assert 'scores' in data
        assert data['count'] == 2

    def test_premium_calculate_missing_district(self, client):
        response = client.get('/api/premium-calculate')
        assert response.status_code == 400


class TestWeatherRoutes:
    @patch('app.services.nasa_power_service.fetch_current_weather')
    def test_weather_valid_district(self, mock_fetch, client):
        import pandas as pd
        mock_fetch.return_value = pd.DataFrame({
            'date': pd.date_range('2024-01-01', periods=5, freq='D'),
            'rainfall_mm': [1.0, 2.0, 0.0, 3.0, 1.5],
            'temperature_c': [25.0, 26.0, 27.0, 25.5, 24.0],
            'humidity_pct': [60.0, 55.0, 50.0, 65.0, 70.0],
        })

        response = client.get('/api/weather/nagpur?days=5')
        assert response.status_code == 200
        data = response.get_json()
        assert data['district'] == 'nagpur'
        assert len(data['data']) == 5

    def test_weather_invalid_district(self, client):
        response = client.get('/api/weather/nonexistent')
        assert response.status_code == 404
