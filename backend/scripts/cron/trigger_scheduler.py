from web3 import Web3
from eth_account import Account
import json
import os
import time
from app.services.firestore_service import get_active_policies

def run_trigger_checks():
    rpc_url = os.getenv('SEPOLIA_RPC_URL', 'http://127.0.0.1:8545')
    w3 = Web3(Web3.HTTPProvider(rpc_url))
    
    artifact_path = os.path.join(os.path.dirname(__file__), '../../../contracts/artifacts/contracts/TriggerOracle.sol/TriggerOracle.json')
    try:
        with open(artifact_path) as f:
            abi = json.load(f)['abi']
    except FileNotFoundError:
        print(f"Contract artifact not found at {artifact_path}. Skipping trigger checks.")
        return
    
    contract_address = os.getenv('TRIGGER_ORACLE_ADDRESS')
    private_key = os.getenv('SCHEDULER_PRIVATE_KEY')
    
    if not contract_address or not private_key:
        print("Missing TRIGGER_ORACLE_ADDRESS or SCHEDULER_PRIVATE_KEY in environment. Skipping trigger checks.")
        return

    account = Account.from_key(private_key)
    oracle_contract = w3.eth.contract(address=contract_address, abi=abi)
    
    active_policies = get_active_policies()
    
    if not active_policies:
        print("No active policies found for trigger checks.")
        return

    print(f"Found {len(active_policies)} active policies. Initiating Chainlink trigger checks...")
    
    for policy in active_policies:
        triggers = policy.get('triggersSelected', [])
        for trigger_type in triggers:
            try:
                nonce = w3.eth.get_transaction_count(account.address)
                
                # Multiply lat/lon by 1,000,000 to convert float to integer for the smart contract (6 decimals)
                # Example: 18.5204 becomes 18520400
                lat_int = int(float(policy.get('districtLat', 0)) * 1000000)
                lon_int = int(float(policy.get('districtLon', 0)) * 1000000)
                
                tx = oracle_contract.functions.requestTriggerCheck(
                    policy['policyId'],
                    policy.get('district', 'unknown'),
                    lat_int,
                    lon_int,
                    trigger_type
                ).build_transaction({
                    'from': account.address,
                    'nonce': nonce,
                    'gas': 300000,
                    'gasPrice': w3.to_wei('20', 'gwei')
                })
                
                signed_tx = w3.eth.account.sign_transaction(tx, private_key)
                tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
                
                print(f"Trigger check requested for {policy['policyId']} - {trigger_type}: {tx_hash.hex()}")
                
                # Sleep briefly to avoid nonce collisions or rate limits
                time.sleep(2)
                
            except Exception as e:
                print(f"Error requesting trigger for {policy['policyId']} ({trigger_type}): {str(e)}")

if __name__ == "__main__":
    run_trigger_checks()
