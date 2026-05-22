# InsureChain Chainlink External Adapter

This adapter serves as a bridge between a Chainlink Node (running on the Sepolia testnet) and the InsureChain Flask ML API. It receives requests containing trigger parameters (like latitude, longitude, and trigger type), fetches real-time predictions from the ML model, and returns the formatted data back to the Chainlink node to be submitted on-chain.

## How It Works

1. The `TriggerOracle.sol` smart contract emits a `TriggerRequested` event.
2. A Chainlink Node picks up this event and executes the job defined in `job-spec.toml`.
3. The Chainlink Node makes an HTTP POST request to this External Adapter.
4. The Adapter validates the input and calls the Flask ML API (`/api/trigger-check`).
5. The Adapter processes the response (converting decimals to integers since Solidity doesn't support floating-point numbers).
6. The Adapter returns the result to the Chainlink Node.
7. The Chainlink Node submits an on-chain transaction calling `fulfillTriggerRequest`.

## Prerequisites

- Node.js v18+
- Docker (optional, for containerized deployment)
- A running instance of the InsureChain Flask ML API

## Setup and Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file (see `.env.example` if applicable) or set environment variables:
   - `FLASK_API_URL`: URL of the Flask API (e.g., `http://localhost:5000/api`)
   - `ADAPTER_PORT`: Port to run the adapter on (default: `8080`)
   - `CHAINLINK_NODE_OUTGOING_TOKEN`: (Optional) Auth token that the Chainlink node sends in the `x-chainlink-ea-token` header.

3. Start the adapter:
   ```bash
   node src/index.js
   ```
   Or using Docker:
   ```bash
   docker-compose up -d
   ```

## Testing

Run the test suite using Jest:
```bash
npm test
```

## Manual Testing with cURL

```bash
curl -X POST -H "Content-Type: application/json" -d '{
  "id": "278c97ffadb54a5bbb93cfec5f7b5503",
  "data": {
    "policyId": "INS-123",
    "district": "Pune",
    "lat": 18.5204,
    "lon": 73.8567,
    "triggerType": "drought"
  }
}' http://localhost:8080/
```

## Chainlink Node Setup (Sepolia)

1. Set up a Chainlink node connected to the Sepolia testnet.
2. In the Chainlink Node UI, go to **Bridges** -> **New Bridge**.
3. Set the name to `insurechain-trigger-adapter` and provide the URL where this adapter is hosted.
4. Copy the contents of `job-spec.toml` and create a **New Job** in the Node UI. Make sure to replace `YOUR_TRIGGER_ORACLE_CONTRACT_ADDRESS` with your deployed contract address.
5. Fund the `TriggerOracle` contract with testnet LINK tokens from https://faucets.chain.link/.

## Production Deployment

This adapter can be deployed to services like Railway, Render, or Heroku. Ensure you expose the correct port and provide the necessary environment variables.
