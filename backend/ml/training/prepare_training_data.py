"""
InsureChain — Training Data Preparation Pipeline
Loads historical NASA POWER data, creates labels using rule-based logic,
and engineers features for the XGBoost trigger classifiers.
"""
import os
import sys
import logging
import json

import numpy as np
import pandas as pd

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from app.services.nasa_power_service import fetch_historical_weather, calculate_rolling_features
from app.services.ndvi_service import _generate_mock_ndvi

logger = logging.getLogger(__name__)

# District normals for labeling (30-year climatological baselines)
DISTRICT_NORMALS = {
    'nagpur':     {'rainfall_daily_normal': 3.8, 'drought_freq': 0.35},
    'amravati':   {'rainfall_daily_normal': 3.5, 'drought_freq': 0.30},
    'wardha':     {'rainfall_daily_normal': 3.2, 'drought_freq': 0.25},
    'yavatmal':   {'rainfall_daily_normal': 2.8, 'drought_freq': 0.45},
    'akola':      {'rainfall_daily_normal': 3.0, 'drought_freq': 0.20},
    'buldhana':   {'rainfall_daily_normal': 3.4, 'drought_freq': 0.15},
    'washim':     {'rainfall_daily_normal': 2.9, 'drought_freq': 0.22},
    'chandrapur': {'rainfall_daily_normal': 4.5, 'drought_freq': 0.12},
    'gadchiroli': {'rainfall_daily_normal': 5.2, 'drought_freq': 0.10},
    'nanded':     {'rainfall_daily_normal': 3.1, 'drought_freq': 0.28},
}

DISTRICTS = [
    {"id": "nagpur",     "lat": 21.1458, "lon": 79.0882},
    {"id": "amravati",   "lat": 20.9320, "lon": 77.7523},
    {"id": "wardha",     "lat": 20.7453, "lon": 78.6022},
    {"id": "yavatmal",   "lat": 20.3888, "lon": 78.1204},
    {"id": "akola",      "lat": 20.7002, "lon": 77.0082},
    {"id": "buldhana",   "lat": 20.5293, "lon": 76.1842},
    {"id": "washim",     "lat": 20.1041, "lon": 77.1340},
    {"id": "chandrapur", "lat": 19.9500, "lon": 79.2961},
    {"id": "gadchiroli", "lat": 20.1826, "lon": 80.0096},
    {"id": "nanded",     "lat": 19.1383, "lon": 77.3210},
]


def label_events(df, district_id):
    """
    Apply rule-based labeling to create ground truth for training.

    Labels:
        drought_label: 1 if rainfall_21d_avg < 40% of district normal
        flood_label: 1 if 3d_rainfall_total > 300% of district 3-day normal
        heatwave_label: 1 if consecutive_hot_days >= 5
        frost_label: 1 if temperature_c < 2 and month in (11, 12, 1, 2)
    """
    normals = DISTRICT_NORMALS.get(district_id, {'rainfall_daily_normal': 3.0})
    daily_normal = normals['rainfall_daily_normal']
    three_day_normal = daily_normal * 3

    df = df.copy()

    # Drought: rainfall_21d_avg < 40% of normal
    drought_threshold = daily_normal * 0.4
    df['drought_label'] = (df['rainfall_21d_avg'] < drought_threshold).astype(int)

    # Flood: 3d_rainfall_total > 300% of 3-day normal
    flood_threshold = three_day_normal * 3.0
    df['flood_label'] = (df['3d_rainfall_total'] > flood_threshold).astype(int)

    # Heatwave: consecutive_hot_days >= 5
    df['heatwave_label'] = (df['consecutive_hot_days'] >= 5).astype(int)

    # Frost: temperature < 2°C in winter months
    df['month'] = df['date'].dt.month
    df['frost_label'] = (
        (df['temperature_c'] < 2) &
        (df['month'].isin([11, 12, 1, 2]))
    ).astype(int)

    return df


def add_extra_features(df, district_id, lat, lon):
    """Add NDVI delta, season encoding, and district-level features."""
    df = df.copy()

    # Season encoding: Kharif months (Jun-Oct) = 1, Rabi = 0
    if 'month' not in df.columns:
        df['month'] = df['date'].dt.month
    df['season_encoded'] = df['month'].apply(lambda m: 1 if m in [6, 7, 8, 9, 10] else 0)

    # Day of year
    df['day_of_year'] = df['date'].dt.dayofyear

    # District drought frequency (static)
    normals = DISTRICT_NORMALS.get(district_id, {'drought_freq': 0.20})
    df['district_drought_freq'] = normals['drought_freq']

    # NDVI delta (simulated based on consecutive dry days)
    df['ndvi_delta'] = df['consecutive_dry_days'].apply(
        lambda d: round(-0.002 * d + np.random.uniform(-0.02, 0.02), 3)
    )

    return df


def prepare_training_data(years=5, save=True):
    """
    Full pipeline: fetch historical data, engineer features, label events.

    Args:
        years (int): Number of years of historical data to fetch
        save (bool): Whether to save the prepared dataset

    Returns:
        pd.DataFrame: Training data with features and labels
    """
    all_data = []

    for district in DISTRICTS:
        district_id = district['id']
        lat = district['lat']
        lon = district['lon']

        print(f"\n{'='*60}")
        print(f"Processing {district_id.upper()} ({lat}, {lon})")
        print(f"{'='*60}")

        # Check for cached raw data first
        raw_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'raw')
        cached_path = os.path.join(raw_dir, f"{district_id}_{lat}_{lon}_historical.csv")

        if os.path.exists(cached_path):
            print(f"  Loading cached data from {cached_path}")
            df = pd.read_csv(cached_path, parse_dates=['date'])
        else:
            print(f"  Fetching {years} years of historical data from NASA POWER...")
            df = fetch_historical_weather(lat, lon, years=years, district_id=district_id)

        if df.empty:
            print(f"  WARNING: No data for {district_id}, skipping")
            continue

        print(f"  Raw data: {len(df)} rows ({df['date'].min()} to {df['date'].max()})")

        # Calculate rolling features
        df = calculate_rolling_features(df)
        print(f"  Rolling features calculated")

        # Label events
        df = label_events(df, district_id)

        # Add extra features
        df = add_extra_features(df, district_id, lat, lon)

        # Add district identifier
        df['district'] = district_id

        all_data.append(df)

        # Print label distribution
        for label in ['drought_label', 'flood_label', 'heatwave_label', 'frost_label']:
            if label in df.columns:
                positive = df[label].sum()
                print(f"  {label}: {positive}/{len(df)} ({positive/len(df)*100:.1f}%)")

    if not all_data:
        print("\nERROR: No training data prepared")
        return pd.DataFrame()

    combined = pd.concat(all_data, ignore_index=True)
    print(f"\n{'='*60}")
    print(f"TOTAL: {len(combined)} training samples from {len(all_data)} districts")
    print(f"{'='*60}")

    if save:
        processed_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'processed')
        os.makedirs(processed_dir, exist_ok=True)
        output_path = os.path.join(processed_dir, 'training_data.csv')
        combined.to_csv(output_path, index=False)
        print(f"\nSaved training data to {output_path}")

    return combined


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    prepare_training_data(years=5)
