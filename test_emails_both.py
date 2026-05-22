import requests

# Test Welcome
response1 = requests.post(
    'http://127.0.0.1:5000/api/send-welcome-email',
    json={'email': 'saketk207@gmail.com'},
    headers={'Authorization': 'Bearer insurechain-api-key-2026'}
)
print("Welcome Response:", response1.status_code, response1.text)

# Test Policy
response2 = requests.post(
    'http://127.0.0.1:5000/api/send-policy-email',
    json={
        'email': 'saketk207@gmail.com',
        'policyId': 'POL-12345',
        'fullName': 'Saket',
        'district': 'Nagpur',
        'state': 'Maharashtra',
        'season': 'Kharif',
        'triggers': ['drought', 'flood'],
        'premiumINR': 5000,
        'premiumETH': 0.015,
        'coverageINR': 50000,
        'txHash': '0xabcd1234efgh5678',
        'walletAddress': '0xSaketWallet'
    },
    headers={'Authorization': 'Bearer insurechain-api-key-2026'}
)
print("Policy Response:", response2.status_code, response2.text)
