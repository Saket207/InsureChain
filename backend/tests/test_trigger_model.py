"""
Tests for trigger classification model.
"""
import pytest
from unittest.mock import patch, MagicMock
import pandas as pd
from datetime import datetime

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from ml.trigger_model.trigger_classifier import (
    check_triggers,
    _rule_based_trigger,
    _prepare_features,
    FEATURE_COLUMNS,
    TRIGGER_TYPES,
)


class TestRuleBasedTrigger:
    def test_drought_fires_on_dry_conditions(self):
        row = {
            'consecutive_dry_days': 25,
            'rainfall_21d_avg': 0.5,
        }
        fired, confidence = _rule_based_trigger(row, 'drought')
        assert fired is True
        assert confidence > 0.5

    def test_flood_fires_on_heavy_rain(self):
        row = {'3d_rainfall_total': 200}
        fired, confidence = _rule_based_trigger(row, 'flood')
        assert fired is True
        assert confidence > 0.5

    def test_heatwave_fires_on_extended_heat(self):
        row = {
            'consecutive_hot_days': 7,
            'temp_max_5d': 45,
        }
        fired, confidence = _rule_based_trigger(row, 'heatwave')
        assert fired is True
        assert confidence > 0.5

    def test_frost_fires_on_cold_winter(self):
        row = {
            'temp_min_5d': 0.5,
            'month': 1,
        }
        fired, confidence = _rule_based_trigger(row, 'frost')
        assert fired is True
        assert confidence > 0.5

    def test_normal_conditions_no_triggers(self):
        row = {
            'consecutive_dry_days': 3,
            'rainfall_21d_avg': 5.0,
            '3d_rainfall_total': 15,
            'consecutive_hot_days': 0,
            'temp_max_5d': 32,
            'temp_min_5d': 18,
            'month': 8,
        }
        for trigger in TRIGGER_TYPES:
            fired, _ = _rule_based_trigger(row, trigger)
            assert fired is False


class TestCheckTriggers:
    @patch('ml.trigger_model.trigger_classifier.fetch_current_weather')
    @patch('ml.trigger_model.trigger_classifier.calculate_ndvi_delta')
    def test_returns_correct_structure(self, mock_ndvi, mock_weather):
        # Setup mock weather data
        dates = pd.date_range('2024-01-01', periods=30, freq='D')
        mock_weather.return_value = pd.DataFrame({
            'date': dates,
            'rainfall_mm': [2.0] * 30,
            'temperature_c': [25.0] * 30,
            'humidity_pct': [50.0] * 30,
        })

        mock_ndvi.return_value = {
            'current_ndvi': 0.5,
            'previous_ndvi': 0.52,
            'delta': -0.02,
            'trend': 'stable',
        }

        result = check_triggers(21.0, 79.0, 'nagpur')

        assert 'district' in result
        assert 'triggers' in result
        assert 'ndvi' in result
        assert 'weather_summary' in result
        assert 'data_timestamp' in result

        for trigger in TRIGGER_TYPES:
            assert trigger in result['triggers']
            assert 'fired' in result['triggers'][trigger]
            assert 'confidence' in result['triggers'][trigger]
            assert isinstance(result['triggers'][trigger]['fired'], bool)
            assert isinstance(result['triggers'][trigger]['confidence'], float)

    @patch('ml.trigger_model.trigger_classifier.fetch_current_weather')
    def test_handles_empty_weather_data(self, mock_weather):
        mock_weather.return_value = pd.DataFrame()

        result = check_triggers(21.0, 79.0, 'nagpur')

        assert 'error' in result or all(
            t['confidence'] == 0.0 for t in result['triggers'].values()
        )
