# 🌾 InsureChain: Decentralized Parametric Crop Insurance

InsureChain is a state-of-the-art Web3 Agritech platform that provides trustless, autonomous parametric crop insurance to farmers. 

By leveraging **Ethereum Smart Contracts**, **Machine Learning Risk Models (XGBoost)**, **Chainlink Oracles**, and **Real-Time Satellite Data (NDVI / NASA POWER)**, InsureChain eliminates the need for middlemen, claims adjusters, and lengthy paperwork. When severe weather or drought hits, the smart contract verifies the satellite data and instantly dispatches payouts to the farmer's wallet.

---

## ✨ Key Features
- **🤖 Autonomous Payouts:** Smart contracts hold locked premiums and automatically release funds when weather conditions breach predetermined thresholds.
- **🛰️ AI-Powered Risk Modeling:** A Python Flask backend uses XGBoost to analyze historical NASA weather data and Copernicus satellite imagery (NDVI) to calculate dynamic district-level risk scores.
- **⛓️ Fully Decentralized:** Built on the Ethereum blockchain using Hardhat and Solidity.
- **🌐 Chainlink Oracle Integration:** Uses a custom Node.js External Adapter to pull real-world off-chain data onto the blockchain.
- **📧 Automated Welcome & Receipt Emails:** Beautifully styled, interactive HTML emails dispatched instantly upon farmer registration and policy deployment using the Resend API.
- **🗺️ Interactive Dashboard:** Real-time visual tracking of farm locations, wallet connection via MetaMask, and active policy monitoring.

---

## 🛠️ Technology Stack
- **Frontend:** React, Vite, TailwindCSS, Ethers.js, Zustand (State Management), Framer Motion (Animations).
- **Backend:** Python, Flask, Scikit-learn (ML), Pandas.
- **Blockchain:** Solidity, Hardhat, Chainlink AnyAPI.
- **Database / Auth:** Firebase Authentication, Cloud Firestore.
- **APIs & Data Sources:** NASA POWER, Planet Labs / Copernicus (Satellite Imagery), Resend (Email Automation).

---

## 🏗️ System Workflow

1. **Risk Profiling:** The Python ML backend continuously models the geographical risk of Indian districts using historical and live weather/satellite data.
2. **Policy Creation:** A farmer logs into the React frontend, connects their MetaMask wallet, and selects their farm location and desired calamity coverage (e.g., Drought, Flood).
3. **Smart Contract Deployment:** The frontend calculates the AI-adjusted premium and deploys an autonomous `PolicyRegistry` smart contract to the blockchain. The premium is transferred to the `PayoutVault`.
4. **Oracle Monitoring:** The `TriggerOracle` periodically checks weather conditions. It calls the Chainlink External Adapter, which pings the Python backend.
5. **Instant Payout:** If the ML backend confirms a severe weather event, the Oracle returns a `true` signal to the blockchain, triggering the `PayoutVault` to instantly transfer the coverage amount to the farmer.

---

## 🚀 How to Run the Project Locally

To run the full end-to-end InsureChain application, you will need to open **4 separate terminal windows** and run them simultaneously.

### 📋 Prerequisites
Make sure you have installed:
- **Node.js** (v18+) & `npm`
- **Python** (3.10+)
- **MetaMask** Browser Extension
- A **Firebase Account** (with Firestore Database enabled)

First, clone the repository and navigate into it:
```bash
git clone https://github.com/your-username/InsureChain.git
cd InsureChain
```

---

### ⛓️ Terminal 1: Local Blockchain (Hardhat)
This terminal runs your local Ethereum blockchain and handles smart contract deployment.

1. Install root dependencies:
```bash
npm install
```
2. Start the local Ethereum Node:
```bash
npx hardhat node
```
*(Keep this terminal running. It will print 20 test wallets with private keys. Import one of these private keys into MetaMask so you have fake ETH to buy policies).*

3. **Deploy Contracts:** Open a temporary terminal, deploy the smart contracts, and then you can close the temporary terminal:
```bash
npx hardhat run scripts/deploy.js --network localhost
```

---

### 🧠 Terminal 2: Python AI & ML Backend (Flask)
This terminal runs the AI engine that calculates risk scores and sends the automated emails.

1. Navigate to the backend folder:
```bash
cd backend
```
2. Create and activate a Virtual Environment:
```bash
# On Windows
python -m venv venv
.\venv\Scripts\activate

# On Mac/Linux
python3 -m venv venv
source venv/bin/activate
```
3. Install Python dependencies:
```bash
pip install -r requirements.txt
```
4. Start the Flask Server:
```bash
python run.py
```
*(Keep this terminal running. It will host the API at `http://127.0.0.1:5000`)*

5. Train the AI Risk Models (First Run Only):
Open a new terminal, activate the virtual environment, and run the training script:
```bash
cd backend
.\venv\Scripts\activate
python -m ml.training.train_all_models
```
*(This generates the required `.pkl` files for ML Intelligence)*

---

### 📡 Terminal 3: Chainlink External Adapter
This terminal runs the bridge that connects the blockchain smart contracts to your Python backend.

1. Navigate to the adapter folder:
```bash
cd chainlink-adapter
```
2. Install dependencies:
```bash
npm install
```
3. Start the Adapter:
```bash
npm start
```
*(Keep this terminal running. It will host the adapter at `http://localhost:8080`)*

---

### 💻 Terminal 4: React Web Dashboard
This terminal runs the interactive user interface.

1. Make sure you are in the root directory (`InsureChain`).
2. Start the Vite development server:
```bash
npm run dev
```
*(Keep this terminal running. Open your browser to `http://localhost:5173` to view the app!)*

---

## 🔑 Environment Variables (.env)
You will need to set up API keys for the app to function fully. 

**Backend (`backend/.env`):**
```env
# Email Automation
RESEND_API_KEY=your_resend_key
FALLBACK_RECIPIENT_EMAIL=your_email@gmail.com

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_PATH=serviceAccountKey.json
```

**Frontend (`.env`):**
```env
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project
```

---
Built for Hackathons & Agritech Innovations. 🌾
