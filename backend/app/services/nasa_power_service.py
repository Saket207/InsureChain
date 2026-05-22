"""
InsureChain — NASA POWER Weather Data Service
Fetches real satellite weather data from NASA's POWER API.
Free, no authentication required.

API Docs: https://power.larc.nasa.gov/docs/services/api/
"""
import os
import time
import logging
from datetime import datetime, timedelta

import requests
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

NASA_POWER_BASE_URL = os.getenv(
    'NASA_POWER_BASE_URL',
    'https://power.larc.nasa.gov/api/temporal/daily/point'
)


def fetch_weather_data(lat, lon, start_date, end_date):
    """
    Fetch daily weather data from NASA POWER API.

    Parameters:
        lat (float): Latitude
        lon (float): Longitude
        start_date (str): Start date as YYYYMMDD
        end_date (str): End date as YYYYMMDD

    Returns:
        pd.DataFrame with columns: date, rainfall_mm, temperature_c, humidity_pct
        Returns empty DataFrame on error.
    """
    params = {
        'parameters': 'PRECTOTCORR,T2M,RH2M',
        'community': 'AG',
        'longitude': lon,
        'latitude': lat,
        'start': start_date,
        'end': end_date,
        'format': 'JSON',
    }

    try:
        logger.info(f"Fetching NASA POWER data: lat={lat}, lon={lon}, {start_date}–{end_date}")
        response = requests.get(NASA_POWER_BASE_URL, params=params, timeout=60)
        response.raise_for_status()

        data = response.json()
        properties = data.get('properties', {}).get('parameter', {})

        rainfall = properties.get('PRECTOTCORR', {})
        temperature = properties.get('T2M', {})
        humidity = properties.get('RH2M', {})

        rows = []
        for date_str in rainfall.keys():
            r = rainfall.get(date_str, -999)
            t = temperature.get(date_str, -999)
            h = humidity.get(date_str, -999)

            # NASA POWER uses -999 for missing data
            if r == -999 or t == -999 or h == -999:
                continue

            rows.append({
                'date': pd.to_datetime(date_str, format='%Y%m%d'),
                'rainfall_mm': float(r),
                'temperature_c': float(t),
                'humidity_pct': float(h),
            })

        df = pd.DataFrame(rows)
        if not df.empty:
            df = df.sort_values('date').reset_index(drop=True)
            logger.info(f"Fetched {len(df)} days of weather data")
        else:
            logger.warning("No valid weather data returned from NASA POWER")

        return df

    except requests.exceptions.Timeout:
        logger.error("NASA POWER API request timed out")
        return pd.DataFrame()
    except requests.exceptions.RequestException as e:
        logger.error(f"NASA POWER API request failed: {e}")
        return pd.DataFrame()
    except (KeyError, ValueError) as e:
        logger.error(f"Error parsing NASA POWER response: {e}")
        return pd.DataFrame()


def fetch_current_weather(lat, lon, days=30):
    """
    Fetch the last N days of weather data for a location.
    Default: last 30 days.
    """
    end = datetime.now()
    start = end - timedelta(days=days)
    return fetch_weather_data(
        lat, lon,
        start.strftime('%Y%m%d'),
        end.strftime('%Y%m%d')
    )


def fetch_historical_weather(lat, lon, years=10, district_id='unknown'):
    """
    Fetch N years of historical weather data, year by year with rate limiting.
    Saves raw CSV to data/raw/ directory.

    Returns:
        pd.DataFrame with all historical data combined.
    """
    all_data = []
    current_year = datetime.now().year

    for year_offset in range(years):
        year = current_year - year_offset
        start_date = f"{year}0101"
        end_date = f"{year}1231"

        # Don't fetch future dates
        if year == current_year:
            end_date = datetime.now().strftime('%Y%m%d')

        logger.info(f"Fetching historical data: {district_id} year={year} ({year_offset + 1}/{years})")
        df = fetch_weather_data(lat, lon, start_date, end_date)

        if not df.empty:
            all_data.append(df)

        # Rate limit: 2 second pause between yearly requests
        if year_offset < years - 1:
            time.sleep(2)

    if not all_data:
        logger.warning(f"No historical data retrieved for {district_id}")
        return pd.DataFrame()

    combined = pd.concat(all_data, ignore_index=True)
    combined = combined.sort_values('date').reset_index(drop=True)
    combined = combined.drop_duplicates(subset=['date'])

    # Save raw data
    raw_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'raw')
    os.makedirs(raw_dir, exist_ok=True)
    filepath = os.path.join(raw_dir, f"{district_id}_{lat}_{lon}_historical.csv")
    combined.to_csv(filepath, index=False)
    logger.info(f"Saved {len(combined)} rows of historical data to {filepath}")

    return combined


def calculate_rolling_features(df):
    """
    Add engineered rolling features to a weather DataFrame.

    Features added:
        - rainfall_7d_avg: 7-day rolling average of rainfall
        - rainfall_14d_avg: 14-day rolling average
        - rainfall_21d_avg: 21-day rolling average
        - temp_max_5d: 5-day rolling max temperature
        - temp_min_5d: 5-day rolling min temperature
        - consecutive_dry_days: consecutive days with rainfall < 1mm
        - consecutive_hot_days: consecutive days with temp > 42°C
        - 3d_rainfall_total: 3-day rolling sum of rainfall
    """
    if df.empty:
        return df

    df = df.copy()
    df = df.sort_values('date').reset_index(drop=True)

    # Rolling averages
    df['rainfall_7d_avg'] = df['rainfall_mm'].rolling(window=7, min_periods=1).mean()
    df['rainfall_14d_avg'] = df['rainfall_mm'].rolling(window=14, min_periods=1).mean()
    df['rainfall_21d_avg'] = df['rainfall_mm'].rolling(window=21, min_periods=1).mean()

    # Rolling temperature extremes
    df['temp_max_5d'] = df['temperature_c'].rolling(window=5, min_periods=1).max()
    df['temp_min_5d'] = df['temperature_c'].rolling(window=5, min_periods=1).min()

    # 3-day rainfall total
    df['3d_rainfall_total'] = df['rainfall_mm'].rolling(window=3, min_periods=1).sum()

    # Consecutive dry days (rainfall < 1mm)
    dry = (df['rainfall_mm'] < 1.0).astype(int)
    groups = dry.ne(dry.shift()).cumsum()
    df['consecutive_dry_days'] = dry.groupby(groups).cumsum()

    # Consecutive hot days (temp > 42°C)
    hot = (df['temperature_c'] > 42.0).astype(int)
    groups_hot = hot.ne(hot.shift()).cumsum()
    df['consecutive_hot_days'] = hot.groupby(groups_hot).cumsum()

    # Fill NaN from rolling operations
    df = df.fillna(0)

    logger.info(f"Added rolling features to {len(df)} rows")
    return df
