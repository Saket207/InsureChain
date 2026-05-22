"""
Tests for NASA POWER weather data service.
"""
import pytest
import pandas as pd
from unittest.mock import patch, MagicMock

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.nasa_power_service import (
    fetch_weather_data,
    fetch_current_weather,
    calculate_rolling_features,
)


# Mock NASA POWER API response
MOCK_NASA_RESPONSE = {
    "properties": {
        "parameter": {
            "PRECTOTCORR": {
                "20240101": 2.5, "20240102": 0.0, "20240103": 5.1,
                "20240104": 0.0, "20240105": 0.0, "20240106": 1.2,
                "20240107": 0.0, "20240108": 3.8, "20240109": 0.0,
                "20240110": 0.0,
            },
            "T2M": {
                "20240101": 25.3, "20240102": 26.1, "20240103": 24.8,
                "20240104": 27.5, "20240105": 28.2, "20240106": 26.9,
                "20240107": 43.1, "20240108": 43.5, "20240109": 44.0,
                "20240110": 42.8,
            },
            "RH2M": {
                "20240101": 65.2, "20240102": 58.1, "20240103": 72.5,
                "20240104": 45.3, "20240105": 42.1, "20240106": 55.8,
                "20240107": 30.2, "20240108": 28.5, "20240109": 25.1,
                "20240110": 32.4,
            },
        }
    }
}


class TestFetchWeatherData:
    @patch('app.services.nasa_power_service.requests.get')
    def test_returns_dataframe_with_correct_columns(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = MOCK_NASA_RESPONSE
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        df = fetch_weather_data(21.1458, 79.0882, '20240101', '20240110')

        assert isinstance(df, pd.DataFrame)
        assert 'date' in df.columns
        assert 'rainfall_mm' in df.columns
        assert 'temperature_c' in df.columns
        assert 'humidity_pct' in df.columns
        assert len(df) == 10

    @patch('app.services.nasa_power_service.requests.get')
    def test_handles_missing_data(self, mock_get):
        response = {
            "properties": {
                "parameter": {
                    "PRECTOTCORR": {"20240101": -999, "20240102": 1.5},
                    "T2M": {"20240101": 25, "20240102": 26},
                    "RH2M": {"20240101": 50, "20240102": 55},
                }
            }
        }
        mock_resp = MagicMock()
        mock_resp.json.return_value = response
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        df = fetch_weather_data(21.0, 79.0, '20240101', '20240102')
        assert len(df) == 1  # -999 row should be excluded

    @patch('app.services.nasa_power_service.requests.get')
    def test_handles_api_timeout(self, mock_get):
        import requests
        mock_get.side_effect = requests.exceptions.Timeout()

        df = fetch_weather_data(21.0, 79.0, '20240101', '20240110')
        assert isinstance(df, pd.DataFrame)
        assert df.empty


class TestRollingFeatures:
    def test_calculates_all_features(self):
        dates = pd.date_range('2024-01-01', periods=30, freq='D')
        df = pd.DataFrame({
            'date': dates,
            'rainfall_mm': [0.0] * 25 + [50.0, 60.0, 70.0, 10.0, 5.0],
            'temperature_c': [25.0] * 20 + [43.0] * 5 + [25.0] * 5,
            'humidity_pct': [50.0] * 30,
        })

        result = calculate_rolling_features(df)

        assert 'rainfall_7d_avg' in result.columns
        assert 'rainfall_14d_avg' in result.columns
        assert 'rainfall_21d_avg' in result.columns
        assert 'temp_max_5d' in result.columns
        assert 'temp_min_5d' in result.columns
        assert 'consecutive_dry_days' in result.columns
        assert 'consecutive_hot_days' in result.columns
        assert '3d_rainfall_total' in result.columns

    def test_consecutive_dry_days(self):
        dates = pd.date_range('2024-01-01', periods=10, freq='D')
        df = pd.DataFrame({
            'date': dates,
            'rainfall_mm': [0.0, 0.0, 0.0, 5.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
            'temperature_c': [25.0] * 10,
            'humidity_pct': [50.0] * 10,
        })

        result = calculate_rolling_features(df)
        # After the rain on day 4, consecutive dry days should restart
        assert result.iloc[-1]['consecutive_dry_days'] == 6

    def test_empty_dataframe(self):
        df = pd.DataFrame()
        result = calculate_rolling_features(df)
        assert result.empty
