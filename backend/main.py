import os
from backend.services.sqlite import init as sqlite_init
from backend.services.sqlite import courses as sqlite_courses
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from backend.firebase.firestore_admin_services import (
    db,
    add_object_to_firestore,
    get_document_by_id,
    query_collection,
    format_document_data
)

# Purpose: FastAPI entry point + Initializes SQLite + Preloads Firestore data into local cache on startup.


async def preload_courses():
    try:
        courses = await query_collection("courses")
        print(f"Fetched {len(courses)} courses from Firestore")
        sqlite_courses.cache_all_courses(courses)
        print(f"✅ Cached {len(courses)} courses in SQLite")
    except Exception as e:
        print(f"Failed to preload courses from Firestore: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        print("Starting lifespan context manager")
        sqlite_init.init_sqlite()  # Initialize SQLite database
        await preload_courses()
        print("Preloading courses from Firestore...")
    
        # Add any startup logic here
        yield
    except Exception as e:
        print(f"Error during startup event: {e}")
        yield
    finally:
        print("Lifespan context manager completed")

app = FastAPI(lifespan=lifespan)

# Add CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Your React app URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models


class FirestoreDocument(BaseModel):
    data: Dict[str, Any]


class QueryFilter(BaseModel):
    field: str
    op: str
    value: Any


class CollectionQuery(BaseModel):
    filters: Optional[List[QueryFilter]] = None
    

# Routes


@app.post("/api/collections/{collection_name}")
async def create_document(collection_name: str, document: FirestoreDocument):
    """Create a new document in the specified collection"""
    try:
        doc_id = await add_object_to_firestore(collection_name, document.data)
        return {"id": doc_id, "message": f"Document added to {collection_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/collections/{collection_name}/{document_id}")
async def get_document(collection_name: str, document_id: str):
    """Get a document by ID from the specified collection"""
    # try:
    #     doc = await get_document_by_id(collection_name, document_id)
    #     if not doc:
    #         raise HTTPException(status_code=404, detail=f"Document not found")
    #     return doc
    # except Exception as e:
    #     raise HTTPException(status_code=500, detail=str(e))
    try:
        # ✅ Use cache if collection is 'students'
        if collection_name == "courses":
            print(f"📦 Querying SQLite courses with filters: {query.filters}")
            cached = sqlite_courses.get_course_by_id(document_id)
            if cached:
                return {
                    "courseId": cached[0],
                    "courseName": cached[1],
                    "createdAt": cached[2],
                    "description": cached[3],
                    "subjectArea": cached[4],
                    "teacherId": cached[5]
                }
            raise HTTPException(status_code=404, detail="Course not found in local cache") 

         # Fallback for other collections
        doc = await get_document_by_id(collection_name, document_id)
        if not doc:
            raise HTTPException(status_code=404, detail=f"Document not found")
        return doc
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/collections/{collection_name}/query")
async def query_documents(collection_name: str, query: CollectionQuery):
    """Query documents in a collection with optional filters"""

    try:
        if collection_name == "courses":
            filters = query.filters or []

            # ✅ Allow filter by teacherId only
            if len(filters) == 1 and filters[0].field == "teacherId" and filters[0].op == "==":
                teacher_id = filters[0].value
                teacher_courses = sqlite_courses.get_courses_by_teacher(teacher_id)
                return {
                    "data": [
                        {
                            "courseId": c[0],
                            "courseName": c[1],
                            "createdAt": c[2],
                            "description": c[3],
                            "subjectArea": c[4],
                            "teacherId": c[5]
                        } for c in teacher_courses
                    ]
                }
            
            if filters:
                raise HTTPException(status_code=400, detail="Only filter by teacherId is supported")

            # default: return all cached
            cached_courses = sqlite_courses.get_all_courses()
            return {
                "data": [
                    {
                        "courseId": c[0],
                        "courseName": c[1],
                        "createdAt": c[2],
                        "description": c[3],
                        "subjectArea": c[4],
                        "teacherId": c[5]
                    } for c in cached_courses
                ]
            }
            
        # filters = query.filters or []

        # if collection_name == "courses":
        #     # 🔒 Only support filter-less queries for now
        #     if filters:
        #         raise HTTPException(
        #             status_code=400, detail="Filtering not supported on SQLite cache")

        #     cached_courses = sqlite_courses.get_all_courses()
        #     if cached_courses:
        #         return [
        #             {
        #                 "courseId": c[0],
        #                 "courseName": c[1],
        #                 "createdAt": c[2],
        #                 "description": c[3],
        #                 "subjectArea": c[4],
        #                 "teacherId": c[5]
        #             } for c in cached_courses
        #         ]
        #     raise HTTPException(
        #         status_code=404, detail="No courses cached locally")

        # # Fallback for other collections
        # structured_filters = [
        #     {"field": f.field, "op": f.op, "value": f.value}
        #     for f in filters
        # ]
        
        results = await query_collection(collection_name, structured_filters)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "ok", "message": "API is running"}

if __name__ == "__main__":
    print("Starting FastAPI application")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
    print("FastAPI application has stopped")
