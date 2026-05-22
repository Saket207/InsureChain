import os
import sys

# Add backend to path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from firebase_admin import credentials, firestore, auth, initialize_app

def force_delete_by_email(email):
    print(f"Attempting to permanently delete {email}...")
    
    # Initialize Firebase Admin using the service account key in the backend folder
    cred_path = os.path.join('backend', 'serviceAccountKey.json')
    if not os.path.exists(cred_path):
        print(f"Error: Could not find {cred_path}")
        return
        
    cred = credentials.Certificate(cred_path)
    # Only initialize if not already initialized
    try:
        initialize_app(cred)
    except ValueError:
        pass

    db = firestore.client()
    
    # 1. Find in Firestore
    farmers_ref = db.collection('farmers')
    query = farmers_ref.where('email', '==', email).stream()
    
    deleted_count = 0
    for doc in query:
        uid = doc.id
        print(f"Found Firestore profile for {email} with UID: {uid}. Deleting...")
        doc.reference.delete()
        
        # 2. Delete from Auth
        try:
            auth.delete_user(uid)
            print(f"Successfully deleted {uid} from Firebase Authentication.")
        except Exception as e:
            print(f"Auth deletion skipped/failed: {e}")
            
        deleted_count += 1
        
    if deleted_count == 0:
        print(f"No profile found in Firestore with email: {email}")

if __name__ == "__main__":
    force_delete_by_email("saketk207@gmail.com")
