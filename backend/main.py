# import os
# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# import uvicorn
# from contextlib import asynccontextmanager
# from pydantic import BaseModel
# from typing import Dict, Any, List, Optional
# from firebase.firestore_admin_services import (
#     db, 
#     add_object_to_firestore, 
#     get_document_by_id,
#     query_collection,
#     format_document_data
# )

# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     try:
#         print("Starting lifespan context manager")
#         # Add any startup logic here
#         yield
#     except Exception as e:
#         print(f"Error during startup event: {e}")
#         yield
#     finally:
#         print("Lifespan context manager completed")

# app = FastAPI(lifespan=lifespan)

# # Add CORS middleware to allow frontend requests
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:3000"],  # Your React app URL
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Models
# class FirestoreDocument(BaseModel):
#     data: Dict[str, Any]
    
# class QueryFilter(BaseModel):
#     field: str
#     op: str
#     value: Any
    
# class CollectionQuery(BaseModel):
#     filters: Optional[List[QueryFilter]] = None

# # Routes
# @app.post("/api/collections/{collection_name}")
# async def create_document(collection_name: str, document: FirestoreDocument):
#     """Create a new document in the specified collection"""
#     try:
#         doc_id = await add_object_to_firestore(collection_name, document.data)
#         return {"id": doc_id, "message": f"Document added to {collection_name}"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @app.get("/api/collections/{collection_name}/{document_id}")
# async def get_document(collection_name: str, document_id: str):
#     """Get a document by ID from the specified collection"""
#     try:
#         doc = await get_document_by_id(collection_name, document_id)
#         if not doc:
#             raise HTTPException(status_code=404, detail=f"Document not found")
#         return doc
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @app.post("/api/collections/{collection_name}/query")
# async def query_documents(collection_name: str, query: CollectionQuery):
#     """Query documents in a collection with optional filters"""
#     try:
#         filters = None
#         if query.filters:
#             filters = [
#                 {"field": f.field, "op": f.op, "value": f.value} 
#                 for f in query.filters
#             ]
            
#         results = await query_collection(collection_name, filters)
#         return results
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# @app.get("/health")
# async def health_check():
#     """Simple health check endpoint"""
#     return {"status": "ok", "message": "API is running"}

# if __name__ == "__main__":
#     print("Starting FastAPI application")
#     uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
#     print("FastAPI application has stopped")
