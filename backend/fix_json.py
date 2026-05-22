import json

data = {
  "type": "service_account",
  "project_id": "insurechain-2d763",
  "private_key_id": "b33236fc227512c33eda5f32dc2710996615e9df",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC6A6s2t4TTEyxF\nvNpHjC4vRfC4Ta8D4ORfAnYJGW1To/NARCfnOSclcJBLDJTSDR+NUB7xeghSYwqZ\nGyk6SG1+stjMZ4V2GjFWvVTReWUtBkY91BR4wODJdv8AbzFaoktrVQob2fUdWlEE\npTpOJFbj6V2lfC0WY4/Xpy9PnXFM2xR8F1JboPQ3YV6aF+4/8WpLeA+abf5fRcfH\nvogVWQh/ACNSDXA7IEtDMdcYb2LSt3U8jIgBdyEITjtp7m4kdtjDMpdwFmS8Z/cu\nL5+nx/HBo3U28cO5lvEGO6lgbZVmBcuy6ACNMimU1n+caUugiIjwKJKkQIBNcWp+\nk76kbc1BAgMBAAECgf8h6nlVSLDXK4UZp2LFQ4dIPKBfel/m0nfROvRP7xWX99S/\nwFg7je2Co2YryOd5mnBI+8rTN0Tn1gHLWMBzorEUNi0sAn67F0YtDT23KUM2qmY0\nRRmryr8xp0NneN6u1S3wgVjj1cxzcFGatJBPnyCYqFGC0tlbCQbjyH/qgZ0e6KOH\nfhrMY+/LrS3XaaAXKzz6OSEnsS63XFaH4jUTQ+m6+QpkqSVOOZY5fr8PLypD+to0\nlLufS82Ub2/zm+y7N1ibI1/+lKB5udRywHm/vnWfWuY30Jo7yc76jEt56FOaVYyH\nl9P+4ScYTmn05TpWDNt1T8px6Lbc9Fviws/hXmECgYEA24JsIGzgIthFzDEptULh\Ie255ODZIBXmpJRcghxMAMfVD6t5l/OGw37O+SNYwIl64bEczsH6KpnHGiZ7bKsG\nYyfSSkr3Zi7nt+xiMX6aRrghfGEZhA7gnm+wjjCZ1UAONFWNg1azzpvT0K8WZtKa\nx9F/ZJg6CWa559uDXagQBqECgYEA2O/Ork78xZxqfkJD0GxlX/VK3PQIXMLSagI8\nNhLLn5dYNXa9rdhywgfr96czdB1dhayYOXnUjYkoQdHKotQEdXCAHOKjCtBZ1nB8\njUrENIn7bOw1Nm6U9NvFplZO+fbPZWFCXEbHlRmSJUlvXGv3xuaL7zl9gc5PdVgx\nvk3QYqECgYEAuN3cZmqLUY1HKzL0Z13N8R8fAe2DrwwC1PTF/CYMtFOX0rydiSVl\nh9uSQCxOoMioHs9k7ZRcNeiQ0Cs8o0Zd+MAe0MbWGM7EBBgmknyHPavxN6knLhrB\nfW2fCgFQbVKnI9gxeD1a7VQ7TXNHsI0KIeMEIRo7NpO3Wdd7iTLzXEECgYAzMq15\nj+SyEo9DiwoMJ3jpY6+uY92RXt1f7XUeYeMyn/pOa96qJ7o1tr7m7MwE7GVFBg3L\CsiyOpuIpSWItjbzLIDf0FEgXTnGlTef9PRHXgU7mKeaWBDJlRCZiCcNcUVTLNgH\nhSDXPHi0WhdxHX4VsBV4eP3446L3E8BxpFW44QKBgQCZyHaOWMMsM4ZDFQqfv24g\n7T0kW9j7BgDwCPEQDc36jVtgYLPKlnZI6SvJDO07d8SldjmOA5PVLlqpsHUs4Hhg\nM29DXpBZecHm2BclmwKxd5kQ22xZSNDzDoorcF+le3n9jHLr0w2etTxnSCd/XATc\nXCIbiCU0UsXquk+Z5OmHUw==\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@insurechain-2d763.iam.gserviceaccount.com",
  "client_id": "113023958920804237135",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40insurechain-2d763.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}

with open('serviceAccountKey.json', 'w') as f:
    json.dump(data, f, indent=2)

print("serviceAccountKey.json has been correctly written.")
