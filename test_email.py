import requests
response = requests.post(
    'http://127.0.0.1:5000/api/send-welcome-email',
    json={'email': 'saketk207@gmail.com'},
    headers={'Authorization': 'Bearer insurechain-api-key-2026'}
)
print("Response:", response.status_code, response.text)
