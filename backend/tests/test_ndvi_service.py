"""
Tests for NDVI satellite data service.
"""
import pytest
from datetime import datetime
from unittest.mock import patch

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.services.ndvi_service import (
    get_district_ndvi,
    calculate_ndvi_delta,
    _generate_mock_ndvi,
)


class TestMockNDVI:
    def test_returns_float_in_valid_range(self):
        ndvi = _generate_mock_ndvi(21.0, 79.0, datetime(2024, 8, 15))
        assert isinstance(ndvi, float)
        assert -0.1 <= ndvi <= 0.9

    def test_kharif_higher_than_rabi(self):
        # Average over multiple samples to account for randomness
        kharif_values = [_generate_mock_ndvi(21.0, 79.0, datetime(2024, 8, 15)) for _ in range(100)]
        rabi_values = [_generate_mock_ndvi(21.0, 79.0, datetime(2024, 1, 15)) for _ in range(100)]

        assert sum(kharif_values) / len(kharif_values) > sum(rabi_values) / len(rabi_values)

    def test_drought_degradation(self):
        normal = _generate_mock_ndvi(21.0, 79.0, datetime(2024, 8, 15), consecutive_dry_days=0)
        drought = _generate_mock_ndvi(21.0, 79.0, datetime(2024, 8, 15), consecutive_dry_days=20)
        # Drought should generally produce lower NDVI (with some randomness margin)
        # Test over averages
        normals = [_generate_mock_ndvi(21.0, 79.0, datetime(2024, 8, 15), consecutive_dry_days=0) for _ in range(50)]
        droughts = [_generate_mock_ndvi(21.0, 79.0, datetime(2024, 8, 15), consecutive_dry_days=20) for _ in range(50)]
        assert sum(normals) / len(normals) > sum(droughts) / len(droughts)


class TestGetDistrictNDVI:
    def test_returns_correct_structure(self):
        result = get_district_ndvi('nagpur', 21.1458, 79.0882)

        assert 'ndvi_value' in result
        assert 'data_source' in result
        assert 'date' in result
        assert 'district' in result
        assert result['data_source'] == 'simulated'  # No Copernicus creds in test

    def test_ndvi_value_is_float(self):
        result = get_district_ndvi('nagpur', 21.1458, 79.0882)
        assert isinstance(result['ndvi_value'], float)


class TestNDVIDelta:
    def test_returns_correct_structure(self):
        result = calculate_ndvi_delta('nagpur', 21.1458, 79.0882)

        assert 'current_ndvi' in result
        assert 'previous_ndvi' in result
        assert 'delta' in result
        assert 'trend' in result
        assert result['trend'] in ['improving', 'stable', 'degrading']

    def test_delta_is_difference(self):
        result = calculate_ndvi_delta('nagpur', 21.1458, 79.0882)
        expected_delta = round(result['current_ndvi'] - result['previous_ndvi'], 3)
        assert result['delta'] == expected_delta
