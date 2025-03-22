import os
from fastapi import FastAPI
import uvicorn
from contextlib import asynccontextmanager
from firebase.firestore_admin_services import db, add_object_to_firestore

new_object = {
    "name": "Narkis Rosen",
    "email": "narkis@example.com",
    "age": 27
}

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        print("Starting lifespan context manager")
        users_ref = db.collection("users")
        docs = users_ref.where("email", "==", new_object["email"]).stream()
        if not any(docs):
            print("Adding new user to Firestore")
            await add_object_to_firestore("users", new_object)
        else:
            print("User already exists in Firestore")
        yield
    except Exception as e:
        print(f"Error during startup event: {e}")
        yield
    finally:
        print("Lifespan context manager completed")

app = FastAPI(lifespan=lifespan)

if __name__ == "__main__":
    print("Starting FastAPI application")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    print("FastAPI application has stopped")
