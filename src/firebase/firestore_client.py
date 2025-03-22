import firebase_admin
from firebase_admin import credentials, firestore

# Firebase client configuration
firebase_config = {
    "type": "service_account",
    "project_id": "revoducate-finalproject",
    "private_key_id": "your-private-key-id",
    "private_key": "your-private-key",
    "client_email": "your-client-email",
    "client_id": "your-client-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "your-client-x509-cert-url"
}

# Initialize Firebase client
cred = credentials.Certificate(firebase_config)
firebase_admin.initialize_app(cred)
db = firestore.client()

# Export db
__all__ = ['db']