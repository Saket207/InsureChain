"""
InsureChain — Full Database Reset Script
Deletes ALL documents from ALL Firestore collections to reset the system to a clean state.

Usage:
    cd backend
    python reset_all_data.py
"""
import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore


# ── All known collections in InsureChain ──
COLLECTIONS_TO_CLEAR = [
    'policies',
    'farmers',
    'alerts',
    'districtRiskScores',
    'adminLogs',
    'triggerHistory',
    'governance_proposals',
    'governance_votes',
]


def get_firestore_client():
    """Initialize Firebase Admin and return Firestore client."""
    service_account_path = os.getenv(
        'FIREBASE_SERVICE_ACCOUNT_JSON_PATH',
        './serviceAccountKey.json'
    )

    if not os.path.exists(service_account_path):
        print(f"[ERROR] Service account key not found at: {service_account_path}")
        sys.exit(1)

    try:
        firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)

    return firestore.client()


def delete_collection(db, collection_name, batch_size=100):
    """Delete all documents in a Firestore collection."""
    col_ref = db.collection(collection_name)
    deleted_count = 0

    while True:
        docs = col_ref.limit(batch_size).stream()
        batch = db.batch()
        doc_count = 0

        for doc in docs:
            batch.delete(doc.reference)
            doc_count += 1

        if doc_count == 0:
            break

        batch.commit()
        deleted_count += doc_count
        print(f"   Deleted {deleted_count} documents from '{collection_name}' so far...")

    return deleted_count


def main():
    print("=" * 60)
    print("  InsureChain — FULL DATABASE RESET")
    print("=" * 60)
    print()
    print("This will DELETE ALL data from the following collections:")
    for col in COLLECTIONS_TO_CLEAR:
        print(f"  • {col}")
    print()

    confirm = input("Are you sure you want to proceed? Type 'YES' to confirm: ")
    if confirm.strip() != 'YES':
        print("\n[CANCELLED] No data was deleted.")
        sys.exit(0)

    print("\n[CONNECTING] Initializing Firebase...")
    db = get_firestore_client()
    print("[CONNECTED] Firestore client ready.\n")

    total_deleted = 0

    for collection_name in COLLECTIONS_TO_CLEAR:
        print(f"[DELETE] Clearing collection: '{collection_name}'...")
        count = delete_collection(db, collection_name)
        total_deleted += count
        if count > 0:
            print(f"   [OK] Deleted {count} documents from '{collection_name}'")
        else:
            print(f"   [EMPTY] Collection '{collection_name}' was already empty")

    print()
    print("=" * 60)
    print(f"  [DONE] DATABASE RESET COMPLETE - {total_deleted} total documents deleted")
    print("=" * 60)


if __name__ == '__main__':
    main()
