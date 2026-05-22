"""
Tests for risk scoring engine.
"""
import pytest
from unittest.mock import patch, MagicMock

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from ml.risk_model.risk_scorer import (
    compute_district_risk_score,
    _get_risk_level,
    _get_risk_multiplier,
    _normalize_to_100,
)


class TestNormalize:
    def test_midpoint(self):
        assert _normalize_to_100(50, 0, 100) == 50

    def test_lower_bound(self):
        assert _normalize_to_100(0, 0, 100) == 0

    def test_upper_bound(self):
        assert _normalize_to_100(100, 0, 100) == 100

    def test_clamps_below(self):
        assert _normalize_to_100(-10, 0, 100) == 0

    def test_clamps_above(self):
        assert _normalize_to_100(110, 0, 100) == 100


class TestRiskLevel:
    def test_low(self):
        assert _get_risk_level(15) == 'Low'

    def test_moderate(self):
        assert _get_risk_level(40) == 'Moderate'

    def test_high(self):
        assert _get_risk_level(65) == 'High'

    def test_critical(self):
        assert _get_risk_level(85) == 'Critical'

    def test_boundary_25(self):
        assert _get_risk_level(25) == 'Low'

    def test_boundary_50(self):
        assert _get_risk_level(50) == 'Moderate'

    def test_boundary_75(self):
        assert _get_risk_level(75) == 'High'


class TestRiskMultiplier:
    def test_low_risk(self):
        assert _get_risk_multiplier(20) == 1.0

    def test_moderate_risk(self):
        assert _get_risk_multiplier(40) == 1.4

    def test_high_risk(self):
        assert _get_risk_multiplier(65) == 1.8

    def test_critical_risk(self):
        assert _get_risk_multiplier(85) == 2.5


class TestComputeDistrictRiskScore:
    @patch('ml.risk_model.risk_scorer.fetch_current_weather')
    @patch('ml.risk_model.risk_scorer.calculate_ndvi_delta')
    def test_returns_valid_score_range(self, mock_ndvi, mock_weather):
        import pandas as pd
        from datetime import datetime, timedelta

        dates = pd.date_range('2024-01-01', periods=30, freq='D')
        mock_weather.return_value = pd.DataFrame({
            'date': dates,
            'rainfall_mm': [2.0] * 30,
            'temperature_c': [25.0] * 30,
            'humidity_pct': [50.0] * 30,
        })
        mock_ndvi.return_value = {
            'current_ndvi': 0.5,
            'delta': -0.02,
            'trend': 'stable',
        }

        result = compute_district_risk_score('nagpur', 21.1458, 79.0882, 'Kharif')

        assert 'riskScore' in result
        assert 0 <= result['riskScore'] <= 100
        assert result['riskLevel'] in ['Low', 'Moderate', 'High', 'Critical']
        assert result['riskMultiplier'] in [1.0, 1.4, 1.8, 2.5]

    @patch('ml.risk_model.risk_scorer.fetch_current_weather')
    @patch('ml.risk_model.risk_scorer.calculate_ndvi_delta')
    def test_contains_required_fields(self, mock_ndvi, mock_weather):
        import pandas as pd

        mock_weather.return_value = pd.DataFrame({
            'date': pd.date_range('2024-01-01', periods=10, freq='D'),
            'rainfall_mm': [1.0] * 10,
            'temperature_c': [30.0] * 10,
            'humidity_pct': [60.0] * 10,
        })
        mock_ndvi.return_value = {
            'current_ndvi': 0.4,
            'delta': -0.05,
            'trend': 'degrading',
        }

        result = compute_district_risk_score('yavatmal', 20.3888, 78.1204)

        required_fields = [
            'district', 'districtId', 'lat', 'lon', 'riskScore', 'riskLevel', 'riskMultiplier',
            'transparency', 'details', 'computedAt',
        ]
        for field in required_fields:
            assert field in result, f"Missing field: {field}"
