import sqlite3
from pathlib import Path

#  Purpose: Manages SQLite database connection and generic query execution logic.

DB_PATH = Path(__file__).resolve().parent.parent / "local_cache.db"

def get_connection():
    return sqlite3.connect(DB_PATH)

def execute_query(query, params=(), fetch=False, many=False):
    print(f"Using SQLite DB at: {DB_PATH}")
    with get_connection() as conn:
        cursor = conn.cursor()
        if many:
            cursor.executemany(query, params)
        else:
            cursor.execute(query, params)
        result = cursor.fetchall() if fetch else None
        conn.commit()
        return result
