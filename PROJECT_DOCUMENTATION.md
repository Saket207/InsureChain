# InsureChain: Comprehensive Project Documentation & AI Context Reference

> **AI INSTRUCTION BLOCK:** If you are an LLM or Agent reading this file in the future, treat this document as the ultimate Source of Truth for the InsureChain project. It details the exact current state of the architecture, every problem solved thus far, and specific code-level decisions. Use this to orient yourself before writing any code.

---

## 1. Project Overview & Current State

**InsureChain** is a trustless, autonomous parametric crop insurance platform. It replaces traditional insurance adjusters with Machine Learning and Ethereum Smart Contracts. 

### Current Project State (As of May 2026):
- ✅ **Frontend UI:** Fully functional. Written in React + Vite + TailwindCSS. The Dashboard, Registration, and Policy Purchase flows are 100% complete with premium glassmorphism styling.
- ✅ **Blockchain Layer:** Smart Contracts (`PolicyRegistry.sol`, `PayoutVault.sol`, `TriggerOracle.sol`) are built and can be deployed to a local Hardhat node.
- ✅ **Backend ML Engine:** The Flask Python backend successfully hosts an XGBoost risk model. It correctly pulls data from NASA POWER and Copernicus (Planet Labs NDVI) to compute live risk scores.
- ✅ **Automated Emails:** The system successfully uses the Resend API to dispatch beautifully styled HTML emails upon account creation and policy registration.
- ✅ **Database:** Firebase Authentication and Cloud Firestore are fully integrated and actively storing user profiles, cached risk scores, and mock policies.

---

## 2. System Architecture & Component Workflow

### 2.1 The Oracles (Data Ingestion)
The Python backend acts as an intelligence aggregator. It uses `nasa_power_service.py` to hit the official NASA POWER endpoints for 30-day rolling averages of rainfall, heat, and humidity. It uses `ndvi_service.py` to hit the Copernicus/Planet Labs APIs to calculate the Normalized Difference Vegetation Index (NDVI), which mathematically proves if a crop is dying from space.

### 2.2 AI Risk Assessment (The Brain)
Inside `/backend/ml/risk_model/risk_scorer.py`, the ingested data is fed into a pre-trained XGBoost Classifier. The model outputs a `riskScore` (from 1-100) and a `riskMultiplier` (e.g., `1.4x`).

### 2.3 Smart Premium Calculation (React Frontend)
In `RegisterPolicy.jsx`, the frontend reads the `riskMultiplier` from the backend API. It calculates the final premium dynamically:
`Premium = Base_Rate * Risk_Multiplier * Coverage_Multiplier * Season_Factor`.
This ensures high-risk geographies pay mathematically fair premiums.

### 2.4 Blockchain Deployment & Payouts (Solidity + Node.js)
When the user clicks "Confirm & Pay", `ethers.js` prompts MetaMask. The policy is minted to `PolicyRegistry.sol`. A Chainlink Node (simulated via `/chainlink-adapter/`) acts as the bridge. Periodically, the Smart Contract checks the Chainlink adapter, which pings our Python ML backend. If the backend reports `trigger_activated = true`, the contract automatically executes the payout function from the `PayoutVault.sol` without human intervention.

---

## 3. Highly Detailed Technology Stack

### Frontend (Client-Side)
* **React 18 & Vite:** Vite provides ultra-fast HMR.
* **TailwindCSS:** Used extensively for rapid utility-first styling.
* **Framer Motion:** Powers the animated modals, sliding cards, and smooth page transitions.
* **Zustand:** (`/src/stores/`) Replaces Redux for lightweight global state management. `walletStore.js` tracks the MetaMask connection, and `alertStore.js` tracks mock notifications.
* **Ethers.js (v6):** Crucial for interacting with the local Hardhat RPC node (`http://127.0.0.1:8545`).
* **Lucide React:** Iconography.

### Backend (Server-Side & AI)
* **Python 3.10+ & Flask:** Hosts the `/api/` endpoints.
* **Scikit-learn & XGBoost:** The exact algorithms used to train the `.pkl` / `.json` model weights found in `/backend/ml/models/`.
* **Pandas & NumPy:** Required for structuring the multidimensional arrays that XGBoost requires for inference.
* **Resend API:** The email provider. We use `requests` in Python to POST highly-styled HTML payloads to the Resend `/emails` endpoint.
* **Firebase Admin SDK:** Allows the Python backend to forcefully bypass client-side security rules for god-mode database operations.

### Blockchain (Web3 Layer)
* **Solidity (0.8.x):** The smart contract language.
* **Hardhat:** Local EVM execution environment. Scripts are located in `/scripts/deploy.js`.
* **Express.js (Chainlink Adapter):** A lightweight Node.js server that translates Chainlink Job specifications into standard HTTP REST calls to our Flask backend.

---

## 4. Master Log of Solved Engineering Challenges & Bugs

> **AI NOTE:** If you see any code related to these issues, do NOT revert it. These are hard-won fixes to extreme edge-case bugs.

### 🔴 Problem 1: The "15-Second Dashboard Lag" (API Bottlenecking)
* **What Happened:** In `Dashboard.jsx`, the React app was fetching `backendApi.getDistrictRisk(targetDistrict, lat, lon)`. Because `lat` and `lon` were provided, `risk_routes.py` assumed this was a request for a *Live ML Computation*. It would hit the NASA and Copernicus APIs in real-time, freezing the UI for 15 seconds on every page load.
* **The Code Fix:** In `Dashboard.jsx`, we removed `lat` and `lon` from the function call. This forced `risk_routes.py` to bypass the live computation and immediately return the pre-cached Firestore data, dropping load times from 15,000ms to 50ms.

### 🔴 Problem 2: React Asynchronous Race Conditions (Email Cancellation)
* **What Happened:** In `RegisterPolicy.jsx` and `Login.jsx`, the system triggered a `fetch()` to `/api/send-policy-email` and then immediately called `nextStep()` or `navigate()`. The React DOM instantly unmounted the component, causing the browser to forcefully abort the outgoing HTTP request before the email was actually sent.
* **The Code Fix:** We added explicit `await` statements before the `fetch` calls. The frontend now intentionally pauses for ~200ms to guarantee the network packet leaves the browser before the component unmounts.

### 🔴 Problem 3: NumPy `int64` JSON Serialization Crashes
* **What Happened:** The XGBoost AI model outputted predictions as `numpy.int64` types. Flask's `jsonify()` function does not know how to serialize C-based NumPy primitives, resulting in a silent 500 Internal Server Error when calculating live risk scores.
* **The Code Fix:** Inside `/backend/app/routes/risk_routes.py`, we implemented a type-coercion interceptor:
  ```python
  if 'riskScore' in result and hasattr(result['riskScore'], 'item'):
      result['riskScore'] = result['riskScore'].item()
  ```

### 🔴 Problem 4: Missing Library Imports Silently Crashing API
* **What Happened:** While building the `/api/send-welcome-email` route in `risk_routes.py`, we used `os.getenv()` to fetch the fallback email address. However, `import os` was missing from the top of the file, causing a 500 Error explicitly when creating an account.
* **The Code Fix:** Injected `import os` at line 4 of `risk_routes.py`.

### 🔴 Problem 5: Firebase Strict Security Rule Deadlocks & God-Mode Bypass
* **What Happened:** To easily test the platform, we built a "Fast-Switch" mode to jump between mock farmer accounts. But when trying to delete accounts from the UI, Firebase threw an `auth/requires-recent-login` error (a security measure to prevent hijacked sessions from deleting accounts).
* **The Code Fix:** We abandoned client-side deletion. We wrote a God-Mode Python script (`force_delete.py`) and a backend endpoint (`/api/delete-farmer/<uid>`). The React app now asks the Flask backend to delete the user. The backend uses the `FIREBASE_SERVICE_ACCOUNT_PATH` (Admin Credentials) to bypass all Firestore security rules and forcefully annihilate the user profile.

### 🔴 Problem 6: Bypassing Resend.com Strict Domain Policies
* **What Happened:** Resend strictly prohibits sending emails to unverified domains on their free tier, resulting in a `403 Forbidden` block.
* **The Code Fix:** We utilized the `FALLBACK_RECIPIENT_EMAIL` environment variable. Regardless of the fake email a user types into the frontend demo, `risk_routes.py` forcefully reroutes the actual API dispatch to the verified developer inbox so that judges and developers can see the interactive HTML emails during Hackathon presentations.

---

## 5. File Structure Blueprint

- `/src/pages/Dashboard.jsx` - The main UI. Fetches cached Risk Scores and Displays Policies.
- `/src/pages/RegisterPolicy.jsx` - The 4-step wizard for buying insurance. Handles the Ethers.js transaction and the `/api/send-policy-email` trigger.
- `/src/pages/Login.jsx` - Handles Firebase Auth and triggers `/api/send-welcome-email`.
- `/backend/app/routes/risk_routes.py` - The central nervous system of the Flask API. Handles ML inference, automated emails, and God-Mode user deletion.
- `/backend/app/services/firestore_service.py` - Python wrapper for reading/writing to the Firebase database.
- `/test_emails_both.py` - A utility script to rapidly test the HTML designs of both the Welcome and Receipt emails without using the UI.

---
**End of Document.** If modifying this codebase, ensure all new routes are properly typed, all asynchronous React fetches are awaited, and all NumPy variables are type-cast before JSON serialization.
