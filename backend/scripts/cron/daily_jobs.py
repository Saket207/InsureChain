"""
InsureChain — Daily Cron Jobs
Scheduled tasks using Flask-APScheduler:
    Job 1: Nightly risk score update (2 AM)
    Job 2: Daily trigger monitoring (6 AM)
    Job 3: Policy expiry check (8 AM)
"""
import logging
from datetime import datetime, timezone, timedelta

logger = logging.getLogger(__name__)


def register_cron_jobs(scheduler):
    """Register all scheduled jobs with the Flask-APScheduler."""

    @scheduler.task('cron', id='nightly_risk_update', hour=2, minute=0)
    def nightly_risk_update():
        """Job 1 — Recompute risk scores for all districts and update Firestore."""
        logger.info("=" * 50)
        logger.info("[CRON] Starting nightly risk score update")
        logger.info("=" * 50)

        try:
            from ml.risk_model.risk_scorer import compute_all_district_scores
            from app.services.firestore_service import save_district_risk_score

            # Determine current season
            month = datetime.now().month
            season = 'Kharif' if month in [6, 7, 8, 9, 10] else 'Rabi'

            scores = compute_all_district_scores(season)

            saved_count = 0
            for score in scores:
                district_id = score.get('districtId', score.get('district', '')).lower()
                if district_id:
                    success = save_district_risk_score(district_id, score)
                    if success:
                        saved_count += 1

            logger.info(f"[CRON] Risk scores updated: {saved_count}/{len(scores)} districts")

            # Update last cron run timestamp
            from app.routes.health_routes import set_last_cron_run
            set_last_cron_run()

        except Exception as e:
            logger.error(f"[CRON] Nightly risk update failed: {e}")

    @scheduler.task('cron', id='daily_trigger_monitoring', hour=6, minute=0)
    def daily_trigger_monitoring():
        """Job 2 — Check triggers via Chainlink Smart Contract Oracle."""
        logger.info("=" * 50)
        logger.info("[CRON] Starting daily trigger monitoring (Chainlink Oracle Pipeline)")
        logger.info("=" * 50)

        try:
            from scripts.cron.trigger_scheduler import run_trigger_checks
            run_trigger_checks()

            logger.info("[CRON] Trigger monitoring requests submitted on-chain")

            from app.routes.health_routes import set_last_cron_run
            set_last_cron_run()

        except Exception as e:
            logger.error(f"[CRON] Daily trigger monitoring failed: {e}")

    @scheduler.task('cron', id='policy_expiry_check', hour=8, minute=0)
    def policy_expiry_check():
        """Job 3 — Check for policies expiring within 7 days."""
        logger.info("=" * 50)
        logger.info("[CRON] Starting policy expiry check")
        logger.info("=" * 50)

        try:
            from app.services.firestore_service import get_active_policies
            from app.services.alert_service import send_alert

            policies = get_active_policies()
            now = datetime.now(timezone.utc)
            expiry_threshold = now + timedelta(days=7)

            expiring_count = 0
            for policy in policies:
                end_date = policy.get('endDate')
                if not end_date:
                    continue

                # Handle Firestore timestamp
                if hasattr(end_date, 'timestamp'):
                    end_dt = datetime.fromtimestamp(end_date.timestamp(), tz=timezone.utc)
                elif isinstance(end_date, str):
                    try:
                        end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                    except ValueError:
                        continue
                elif isinstance(end_date, datetime):
                    end_dt = end_date if end_date.tzinfo else end_date.replace(tzinfo=timezone.utc)
                else:
                    continue

                if now < end_dt <= expiry_threshold:
                    days_remaining = (end_dt - now).days
                    farmer_uid = policy.get('farmerUid')

                    if farmer_uid:
                        send_alert(farmer_uid, 'policy_expiry', {
                            'days': str(days_remaining),
                            'policyId': policy.get('policyId'),
                        })
                        expiring_count += 1

            logger.info(f"[CRON] Found {expiring_count} policies expiring within 7 days")

            from app.routes.health_routes import set_last_cron_run
            set_last_cron_run()

        except Exception as e:
            logger.error(f"[CRON] Policy expiry check failed: {e}")
