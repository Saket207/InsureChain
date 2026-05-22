import os
import sys
from dotenv import load_dotenv

# Add current dir to path
sys.path.insert(0, os.path.dirname(__file__))

# Load environment
load_dotenv()

import logging
logging.basicConfig(level=logging.DEBUG)

from app import create_app

print("Starting InsureChain Backend...")
print(f"PLANET_API_KEY: {'[SET]' if os.getenv('PLANET_API_KEY') else '[MISSING]'}")
print(f"FIREBASE_PATH: {os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON_PATH')}")

app = create_app()

if __name__ == '__main__':
    # Start on 5000
    app.run(host='0.0.0.0', port=5000, debug=False)
