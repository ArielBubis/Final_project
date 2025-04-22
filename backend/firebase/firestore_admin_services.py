import os
import firebase_admin
from firebase_admin import credentials, firestore
from typing import Dict, Any, List, Optional
import asyncio
from datetime import datetime

# Initialize Firebase Admin SDK
cred_path = os.environ.get('FIREBASE_CREDENTIALS', 'serviceAccountKey.json')
if not firebase_admin._apps:
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)

db = firestore.client()

async def add_object_to_firestore(collection_name: str, data: Dict[str, Any]) -> str:
    """
    Add an object to a Firestore collection
    
    Args:
        collection_name: Name of the collection
        data: Dictionary of data to add
    
    Returns:
        Document ID of the added object
    """
    try:
        # Process any timestamp fields to ensure they're Firestore timestamps
        processed_data = process_timestamp_fields(data)
        
        # Add the document to Firestore
        doc_ref = db.collection(collection_name).document()
        doc_ref.set(processed_data)
        return doc_ref.id
    except Exception as e:
        print(f"Error adding object to {collection_name}: {e}")
        raise

def process_timestamp_fields(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process any date/datetime fields to convert them to Firestore timestamps
    
    Args:
        data: Dictionary containing data fields
    
    Returns:
        Dictionary with datetime fields converted to Firestore timestamps
    """
    processed = {}
    for key, value in data.items():
        if isinstance(value, datetime):
            processed[key] = firestore.Timestamp.from_datetime(value)
        elif isinstance(value, dict):
            processed[key] = process_timestamp_fields(value)
        elif isinstance(value, list):
            processed[key] = [
                process_timestamp_fields(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            processed[key] = value
    return processed

async def get_document_by_id(collection_name: str, doc_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a document by ID
    
    Args:
        collection_name: Name of the collection
        doc_id: Document ID
        
    Returns:
        Document data or None if not found
    """
    try:
        doc_ref = db.collection(collection_name).document(doc_id)
        doc = doc_ref.get()
        if doc.exists:
            return format_document_data(doc.to_dict(), doc.id)
        return None
    except Exception as e:
        print(f"Error getting document {doc_id} from {collection_name}: {e}")
        raise

def format_document_data(data: Dict[str, Any], doc_id: str) -> Dict[str, Any]:
    """
    Format document data, converting Firestore timestamps to ISO format strings
    
    Args:
        data: Document data dictionary
        doc_id: Document ID
        
    Returns:
        Formatted document data with timestamps as strings
    """
    result = {"id": doc_id} if doc_id else {}
    
    for key, value in data.items():
        if isinstance(value, firestore.Timestamp):
            # Convert Firestore timestamp to ISO format string
            result[key] = value.todate().isoformat()
        elif isinstance(value, dict):
            # Process nested dictionaries
            result[key] = format_document_data(value, "")
        elif isinstance(value, list):
            # Process lists
            result[key] = [
                format_document_data(item, "") if isinstance(item, dict) else 
                item.todate().isoformat() if isinstance(item, firestore.Timestamp) else item
                for item in value
            ]
        else:
            result[key] = value
            
    return result

async def query_collection(
    collection_name: str, 
    field_filters: List[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Query a collection with optional field filters
    
    Args:
        collection_name: Name of the collection
        field_filters: List of filter dictionaries with 'field', 'op', and 'value' keys
        
    Returns:
        List of matching documents with formatted data (timestamps as strings)
    """
    try:
        query = db.collection(collection_name)
        
        if field_filters:
            for filter_dict in field_filters:
                query = query.where(
                    filter_dict['field'], 
                    filter_dict['op'], 
                    filter_dict['value']
                )
                
        docs = query.stream()
        results = []
        
        for doc in docs:
            doc_data = doc.to_dict()
            formatted_data = format_document_data(doc_data, doc.id)
            results.append(formatted_data)
            
        return results
    except Exception as e:
        print(f"Error querying collection {collection_name}: {e}")
        raise