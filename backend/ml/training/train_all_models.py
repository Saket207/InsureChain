"""
InsureChain — Model Training Script
Trains all 4 XGBoost trigger classifiers and computes initial risk scores.

Usage: python -m ml.training.train_all_models
Takes 15-30 minutes due to NASA POWER API rate limits.
Pre-trained models are included in the repo so this does not need to run to start the backend.
"""
import os
import sys
import json
import logging

import numpy as np
import pandas as pd
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix
from xgboost import XGBClassifier

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from ml.training.prepare_training_data import prepare_training_data, DISTRICTS

logger = logging.getLogger(__name__)

FEATURE_COLUMNS = [
    'rainfall_7d_avg', 'rainfall_14d_avg', 'rainfall_21d_avg',
    'temp_max_5d', 'temp_min_5d', 'humidity_pct',
    'consecutive_dry_days', 'consecutive_hot_days',
    '3d_rainfall_total', 'ndvi_delta', 'season_encoded',
    'district_drought_freq', 'month', 'day_of_year',
]

TRIGGER_TYPES = ['drought', 'flood', 'heatwave', 'frost']


def train_trigger_model(df, trigger_type, save_dir):
    """
    Train a single XGBoost binary classifier for a trigger type.

    Args:
        df: Training DataFrame
        trigger_type: One of 'drought', 'flood', 'heatwave', 'frost'
        save_dir: Directory to save the trained model

    Returns:
        dict: Training metrics
    """
    label_col = f'{trigger_type}_label'

    if label_col not in df.columns:
        print(f"  ERROR: Label column '{label_col}' not found")
        return None

    # Prepare features and labels
    X = df[FEATURE_COLUMNS].copy()
    y = df[label_col].copy()

    # Handle any NaN values and ensure numeric types
    X = X.fillna(0).astype(float)

    # Check class distribution
    positive_count = y.sum()
    total_count = len(y)
    positive_ratio = positive_count / total_count if total_count > 0 else 0

    print(f"\n  {'-'*50}")
    print(f"  Training {trigger_type.upper()} classifier")
    print(f"  Positive samples: {positive_count}/{total_count} ({positive_ratio*100:.1f}%)")

    if positive_count < 5:
        print(f"  WARNING: Very few positive samples. Model may not be reliable.")
        # Add synthetic positive samples for extremely rare events
        if positive_count == 0:
            print(f"  Creating synthetic positive samples for training...")
            synthetic = _create_synthetic_positives(X, trigger_type, count=50)
            X = pd.concat([X, synthetic], ignore_index=True)
            y = pd.concat([y, pd.Series([1] * len(synthetic))], ignore_index=True)
            positive_count = y.sum()
            print(f"  After synthesis: {positive_count}/{len(y)}")

    # Train/test split with stratification
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
    except ValueError:
        # If stratification fails (too few samples in a class), split without it
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )

    # Calculate scale_pos_weight for imbalanced classes
    neg_count = (y_train == 0).sum()
    pos_count = (y_train == 1).sum()
    scale_pos_weight = neg_count / max(pos_count, 1)

    # Train XGBoost
    model = XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=min(scale_pos_weight, 20),  # Cap to prevent extreme values
        use_label_encoder=False,
        eval_metric='logloss',
        random_state=42,
        verbosity=0,
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )

    # Evaluate
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]

    print(f"\n  Classification Report:")
    report = classification_report(y_test, y_pred, output_dict=True, zero_division=0)
    print(classification_report(y_test, y_pred, zero_division=0))

    print(f"  Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"  {cm}")

    # Feature importance
    importances = model.feature_importances_
    top_features = sorted(
        zip(FEATURE_COLUMNS, importances),
        key=lambda x: x[1], reverse=True
    )[:5]
    print(f"\n  Top 5 Features:")
    for feat, imp in top_features:
        print(f"    {feat}: {imp:.4f}")

    # Save model
    os.makedirs(save_dir, exist_ok=True)
    model_path = os.path.join(save_dir, f'{trigger_type}_classifier.joblib')
    joblib.dump(model, model_path)
    print(f"\n  Model saved to {model_path}")

    return {
        'trigger_type': trigger_type,
        'accuracy': report.get('accuracy', 0),
        'f1_positive': report.get('1', {}).get('f1-score', 0),
        'samples': total_count,
        'positive_samples': int(positive_count),
    }


def _create_synthetic_positives(X, trigger_type, count=50):
    """Create synthetic positive samples for rare events efficiently."""
    rows = []
    rng = np.random.RandomState(42)

    for i in range(count):
        row = {}
        if trigger_type == 'drought':
            row = {
                'rainfall_7d_avg': rng.uniform(0, 0.5),
                'rainfall_14d_avg': rng.uniform(0, 0.8),
                'rainfall_21d_avg': rng.uniform(0, 1.0),
                'temp_max_5d': rng.uniform(38, 45),
                'temp_min_5d': rng.uniform(20, 28),
                'humidity_pct': rng.uniform(15, 35),
                'consecutive_dry_days': rng.randint(21, 45),
                'consecutive_hot_days': rng.randint(0, 8),
                '3d_rainfall_total': rng.uniform(0, 1),
                'ndvi_delta': rng.uniform(-0.15, -0.03),
                'season_encoded': rng.choice([0, 1]),
                'district_drought_freq': rng.uniform(0.25, 0.45),
                'month': rng.choice([3, 4, 5, 10, 11]),
                'day_of_year': rng.randint(60, 330),
            }
        elif trigger_type == 'flood':
            row = {
                'rainfall_7d_avg': rng.uniform(30, 80),
                'rainfall_14d_avg': rng.uniform(20, 50),
                'rainfall_21d_avg': rng.uniform(15, 40),
                'temp_max_5d': rng.uniform(28, 35),
                'temp_min_5d': rng.uniform(20, 26),
                'humidity_pct': rng.uniform(80, 98),
                'consecutive_dry_days': 0,
                'consecutive_hot_days': 0,
                '3d_rainfall_total': rng.uniform(100, 300),
                'ndvi_delta': rng.uniform(-0.05, 0.05),
                'season_encoded': 1,
                'district_drought_freq': rng.uniform(0.05, 0.20),
                'month': rng.choice([7, 8, 9]),
                'day_of_year': rng.randint(182, 273),
            }
        elif trigger_type == 'heatwave':
            row = {
                'rainfall_7d_avg': rng.uniform(0, 1),
                'rainfall_14d_avg': rng.uniform(0, 2),
                'rainfall_21d_avg': rng.uniform(0, 3),
                'temp_max_5d': rng.uniform(43, 48),
                'temp_min_5d': rng.uniform(28, 34),
                'humidity_pct': rng.uniform(10, 30),
                'consecutive_dry_days': rng.randint(10, 30),
                'consecutive_hot_days': rng.randint(5, 15),
                '3d_rainfall_total': rng.uniform(0, 0.5),
                'ndvi_delta': rng.uniform(-0.10, -0.02),
                'season_encoded': rng.choice([0, 1]),
                'district_drought_freq': rng.uniform(0.20, 0.40),
                'month': rng.choice([4, 5, 6]),
                'day_of_year': rng.randint(91, 181),
            }
        elif trigger_type == 'frost':
            row = {
                'rainfall_7d_avg': rng.uniform(0, 2),
                'rainfall_14d_avg': rng.uniform(0, 3),
                'rainfall_21d_avg': rng.uniform(0, 4),
                'temp_max_5d': rng.uniform(8, 15),
                'temp_min_5d': rng.uniform(-2, 2),
                'humidity_pct': rng.uniform(40, 70),
                'consecutive_dry_days': rng.randint(5, 20),
                'consecutive_hot_days': 0,
                '3d_rainfall_total': rng.uniform(0, 5),
                'ndvi_delta': rng.uniform(-0.08, 0.0),
                'season_encoded': 0,
                'district_drought_freq': rng.uniform(0.10, 0.25),
                'month': rng.choice([12, 1, 2]),
                'day_of_year': rng.choice(list(range(1, 60)) + list(range(335, 366))),
            }
        
        if row:
            rows.append(row)

    return pd.DataFrame(rows)


def compute_initial_risk_scores():
    """Compute and save initial risk scores for all districts."""
    from ml.risk_model.risk_scorer import compute_all_district_scores

    print(f"{'='*60}")

    scores = compute_all_district_scores('Kharif')

    output_dir = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'processed')
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, 'initial_risk_scores.json')

    with open(output_path, 'w') as f:
        json.dump(scores, f, indent=2, default=str)

    print(f"Saved initial risk scores to {output_path}")

    for s in scores:
        print(f"  {s.get('district', '?'):12s}  Score: {s.get('riskScore', '?'):3}  Level: {s.get('riskLevel', '?')}")

    return scores


def train_all_models():
    """
    Master training pipeline:
    1. Fetch/load historical data for all 10 districts
    2. Prepare training data with labels and features
    3. Train all 4 XGBoost classifiers
    4. Compute initial risk scores
    """
    print("=" * 60)
    print("InsureChain — Model Training Pipeline")
    print("=" * 60)
    print("This will fetch historical weather data and train ML models.")
    print("Estimated time: 15-30 minutes (NASA POWER API rate limits)")
    print("=" * 60)

    # Step 1: Prepare training data
    print("\n[STEP 1/3] Preparing training data...")
    df = prepare_training_data(years=5, save=True)

    if df.empty:
        print("ERROR: No training data available. Aborting.")
        return

    # Step 2: Train all 4 models
    print(f"\n[STEP 2/3] Training 4 trigger classifiers...")
    save_dir = os.path.join(os.path.dirname(__file__), '..', 'saved_models')
    results = []

    for trigger in TRIGGER_TYPES:
        metrics = train_trigger_model(df, trigger, save_dir)
        if metrics:
            results.append(metrics)

    # Print summary
    print(f"\n{'='*60}")
    print("TRAINING SUMMARY")
    print(f"{'='*60}")
    for r in results:
        print(f"  {r['trigger_type']:12s}  Accuracy: {r['accuracy']:.3f}  F1(+): {r['f1_positive']:.3f}  Samples: {r['samples']}")

    # Step 3: Compute initial risk scores
    print(f"\n[STEP 3/3] Computing initial risk scores...")
    try:
        compute_initial_risk_scores()
    except Exception as e:
        print(f"  WARNING: Risk score computation failed: {e}")

    print(f"{'='*60}")


if __name__ == '__main__':
    logging.basicConfig(level=logging.INFO)
    train_all_models()
