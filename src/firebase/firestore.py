from fastapi import FastAPI
import firebase_admin
from firebase_admin import credentials, firestore

app = FastAPI()

# Firebase configuration
firebaseConfig = {
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

# Initialize Firebase
cred = credentials.Certificate(firebaseConfig)
firebase_admin.initialize_app(cred)
db = firestore.client()

@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI with Firebase Firestore"}

@app.get("/data")
def get_data():
    # Example function to get data from Firestore
    docs = db.collection('your-collection').stream()
    data = {doc.id: doc.to_dict() for doc in docs}
    return data