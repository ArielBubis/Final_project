import sqlite3  
from pathlib import Path
from .courses import create_courses_table

# Purpose: Creates SQLite DB file and course table.

def create_database():
    db_path = Path(__file__).resolve().parent.parent / "local_cache.db"
    conn = sqlite3.connect(db_path)
    conn.close()
    return db_path

# Update init_sqlite to create the database

def init_sqlite():
    db_path = create_database()
    create_courses_table()

if __name__ == "__main__":
    create_database()
    create_courses_table()