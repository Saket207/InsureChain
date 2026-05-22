"""
InsureChain — Server-Side Firestore Service
All database operations for the backend, mirroring the frontend's firestoreService.js.
"""
import logging
from datetime import datetime, timezone
from google.cloud.firestore_v1 import FieldFilter

from app.services.firebase_init import get_db

logger = logging.getLogger(__name__)


# ── Farmer Profiles ──

def get_farmer_profile(uid):
    """Fetch a farmer profile by UID."""
    db = get_db()
    if not db:
        return None
    try:
        doc = db.collection('farmers').document(uid).get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        return None
    except Exception as e:
        logger.error(f"Error fetching farmer profile {uid}: {e}")
        return None


def get_farmer_mobile(farmer_uid):
    """Extract mobile number from a farmer's profile."""
    profile = get_farmer_profile(farmer_uid)
    if profile and profile.get('mobile'):
        return profile['mobile']
    return None


# ── Policies ──

def get_active_policies():
    """Return all policies with status 'Active'."""
    db = get_db()
    if not db:
        return []
    try:
        docs = (
            db.collection('policies')
            .where(filter=FieldFilter('status', '==', 'Active'))
            .stream()
        )
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        logger.error(f"Error fetching active policies: {e}")
        return []


def get_policies_by_district(district):
    """Return all policies for a given district."""
    db = get_db()
    if not db:
        return []
    try:
        docs = (
            db.collection('policies')
            .where(filter=FieldFilter('district', '==', district))
            .stream()
        )
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        logger.error(f"Error fetching policies for district {district}: {e}")
        return []


def update_policy_status(policy_id, status, tx_hash=None):
    """Update a policy's status. Searches by document ID first, then by policyId field."""
    db = get_db()
    if not db:
        return False
    try:
        # Try direct document ID first
        doc_ref = db.collection('policies').document(policy_id)
        doc = doc_ref.get()

        if not doc.exists:
            # Try searching by policyId field
            docs = (
                db.collection('policies')
                .where(filter=FieldFilter('policyId', '==', policy_id))
                .limit(1)
                .stream()
            )
            doc_list = list(docs)
            if doc_list:
                doc_ref = db.collection('policies').document(doc_list[0].id)
            else:
                logger.warning(f"Policy {policy_id} not found")
                return False

        updates = {
            'status': status,
            'updatedAt': datetime.now(timezone.utc),
        }
        if tx_hash:
            updates['txHash'] = tx_hash

        doc_ref.update(updates)
        logger.info(f"Policy {policy_id} status updated to {status}")
        return True
    except Exception as e:
        logger.error(f"Error updating policy {policy_id}: {e}")
        return False


# ── District Risk Scores ──

def save_district_risk_score(district, score_data):
    """Upsert a district's risk score data."""
    db = get_db()
    if not db:
        return False
    try:
        doc_ref = db.collection('districtRiskScores').document(district.lower())
        doc_ref.set({
            **score_data,
            'lastUpdated': datetime.now(timezone.utc),
        }, merge=True)
        logger.info(f"Risk score saved for {district}")
        return True
    except Exception as e:
        logger.error(f"Error saving risk score for {district}: {e}")
        return False


def get_district_risk_score(district):
    """Fetch risk score for a single district."""
    db = get_db()
    if not db:
        return None
    try:
        doc = db.collection('districtRiskScores').document(district.lower()).get()
        if doc.exists:
            return {"id": doc.id, **doc.to_dict()}
        return None
    except Exception as e:
        logger.error(f"Error fetching risk score for {district}: {e}")
        return None


def get_all_district_risk_scores():
    """Fetch risk scores for all districts."""
    db = get_db()
    if not db:
        return []
    try:
        docs = db.collection('districtRiskScores').stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        logger.error(f"Error fetching all risk scores: {e}")
        return []


# ── Alerts ──

def create_alert(alert_data):
    """Create a new alert in Firestore."""
    db = get_db()
    if not db:
        return None
    try:
        alert_data['createdAt'] = datetime.now(timezone.utc)
        alert_data['isRead'] = False
        doc_ref = db.collection('alerts').add(alert_data)
        logger.info(f"Alert created: {alert_data.get('type', 'unknown')} for {alert_data.get('farmerUid', 'unknown')}")
        return doc_ref[1].id
    except Exception as e:
        logger.error(f"Error creating alert: {e}")
        return None


def get_trigger_history(district, limit=30):
    """Get recent trigger check results for a district."""
    db = get_db()
    if not db:
        return []
    try:
        docs = (
            db.collection('triggerHistory')
            .where(filter=FieldFilter('district', '==', district.lower()))
            .order_by('timestamp', direction='DESCENDING')
            .limit(limit)
            .stream()
        )
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]
    except Exception as e:
        logger.error(f"Error fetching trigger history for {district}: {e}")
        return []


def save_trigger_result(district, result_data):
    """Save a trigger check result to Firestore."""
    db = get_db()
    if not db:
        return None
    try:
        result_data['district'] = district.lower()
        result_data['timestamp'] = datetime.now(timezone.utc)
        doc_ref = db.collection('triggerHistory').add(result_data)
        return doc_ref[1].id
    except Exception as e:
        logger.error(f"Error saving trigger result for {district}: {e}")
        return None
