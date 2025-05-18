from .base import execute_query

# Purpose: Schema definition + course data CRUD + local caching logic.

def create_courses_table():
    query = """
    CREATE TABLE IF NOT EXISTS courses (
        courseId TEXT PRIMARY KEY,
        courseName TEXT,
        createdAt TEXT,
        description TEXT,
        subjectArea TEXT,
        teacherId TEXT
    )
    """
    execute_query(query)

def get_course_by_id(course_id):
    query = "SELECT * FROM courses WHERE courseId = ?"
    result = execute_query(query, (course_id,), fetch=True)
    return result[0] if result else None

def get_all_courses():
    query = "SELECT * FROM courses"
    return execute_query(query, fetch=True)

def cache_course(course):
    query = """
    INSERT OR REPLACE INTO courses (courseId, courseName, createdAt, description, subjectArea, teacherId)
    VALUES (?, ?, ?, ?, ?, ?)  
    """
    execute_query(query, (
        course.get("courseId"),
        course.get("courseName"),
        course.get("createdAt"),
        course.get("description"),
        course.get("subjectArea"),
        course.get("teacherId")
    ))

def cache_all_courses(courses):
    print("Inside cache_all_courses")
    print(f"Caching {len(courses)} courses into SQLite...")
    query = """
    INSERT OR REPLACE INTO courses(courseId, courseName, createdAt, description, subjectArea, teacherId)
    VALUES (?, ?, ?, ?, ?, ?)
    """
    data = [
        (c.get("courseId"), c.get("courseName"), c.get("createdAt"), c.get("description"), c.get("subjectArea"), c.get("teacherId"))
        for c in courses
    ]
    execute_query(query, data, many=True)
    print("Inserted data:", data)

def get_courses_by_teacher(teacher_id):
    query = "SELECT * FROM courses WHERE teacherId = ?"
    return execute_query(query, (teacher_id,), fetch=True)