import asyncio
from fastapi import FastAPI, HTTPException
from google.cloud import firestore
from google.oauth2 import service_account
from firebase_admin import credentials

# Path to the service account key file
key_path = "src/admin-sdk.json"

# Explicitly set the credentials
credentials = service_account.Credentials.from_service_account_file(key_path)
db = firestore.Client(credentials=credentials, project="revoducate-finalproject")

app = FastAPI()

# Async wrapper for Firestore's synchronous methods
async def add_to_firestore_sync(collection_name: str, object: dict):
    return await asyncio.to_thread(lambda: db.collection(collection_name).add(object))

@app.post("/add_object_to_firestore/")
async def add_object_to_firestore(collection_name: str, object: dict):
    try:
        doc_ref = db.collection(collection_name).add(object)
        return {"message": f"{collection_name} document written with ID: {doc_ref.id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error adding {collection_name} document: {str(e)}")

