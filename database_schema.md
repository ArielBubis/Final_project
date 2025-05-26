Based on the Firebase import script, here's the database schema visualization with clear distinction between **Collections** and **Subcollections**:

```mermaid
erDiagram
    %% ROOT COLLECTIONS (Top-level Firestore collections)
    SCHOOLS {
        string id PK "Document ID"
        string name
        string location
        float ranking
        string specialization
        int studentCapacity
        int foundingYear
        string website
    }

    USERS {
        string id PK "Document ID (teacher.id or student.id)"
        string uid "Firebase Auth UID"
        string userId "Original ID reference"
        string firstName
        string lastName
        string email
        string gender
        string role "student|teacher"
        object roles "student/teacher/admin flags"
        string schoolId FK
        timestamp registrationDate
        int gradeLevel "students only"
        int entryYear "students only"
        timestamp createdAt
    }

    COURSES {
        string id PK "Document ID"
        string courseName
        string description
        string schoolId FK
        array teacherIds "Array of teacher IDs"
        array studentIds "Array of student IDs"
        string subjectArea
        timestamp startDate
        timestamp endDate
        int durationWeeks
        boolean published
        string activeCode
        int moduleCount
        int assignmentCount
        timestamp createdAt
    }

    %% SUBCOLLECTIONS (Nested under courses)
    MODULES_SUBCOLL {
        string id PK "Document ID (under courses/{courseId}/modules)"
        string moduleTitle
        string description
        int sequenceNumber
        boolean isRequired
        timestamp startDate
        timestamp endDate
        int durationDays
        string subject
        int assignmentCount
        float totalWeight
        float averageScore
        timestamp createdAt
    }

    ASSIGNMENTS_SUBCOLL {
        string id PK "Document ID (under courses/{courseId}/assignments)"
        string title
        string description
        string moduleId "Reference to module"
        string assignmentType
        timestamp assignDate
        timestamp dueDate
        float maxScore
        float weight
        int maxAttempts
        float averageScore
        float lateRate
        int submissionRate
        timestamp createdAt
    }

    %% ROOT COLLECTIONS (Continued)
    ENROLLMENTS {
        string id PK "Document ID: studentId_courseId"
        string studentId FK
        string courseId FK
        timestamp enrollmentDate
        string status
    }

    STUDENT_ASSIGNMENTS {
        string id PK "Document ID: studentId_assignmentId"
        string studentId FK
        string assignmentId FK
        string courseId FK
        string moduleId FK
        string status "completed|future|pending"
        timestamp submissionDate
        float currentScore
        boolean isLate
        int timeSpentMinutes
        int attemptCount
        array attempts "Array of attempt objects"
        timestamp createdAt
        timestamp updatedAt
    }

    STUDENT_COURSE_SUMMARIES {
        string id PK "Document ID: studentId_courseId"
        string studentId FK
        string courseId FK
        float overallScore
        int completionRate
        int totalTimeSpent
        int completedAssignments
        int totalAssignments
        timestamp lastAccessed
        string riskLevel "low|medium|high"
        int riskScore
        string trend
        timestamp updatedAt
    }

    STUDENT_MODULES {
        string id PK "Document ID: studentId_moduleId"
        string studentId FK
        string moduleId FK
        string courseId FK
        string moduleName
        int moduleSequence
        boolean isRequired
        string status "not_started|in_progress|completed"
        int completionRate
        int completedAssignments
        int totalAssignments
        float moduleScore
        int totalTimeSpentMinutes
        int estimatedTimeToCompletion
        string riskLevel "low|medium|high"
        int riskScore
        timestamp startDate
        timestamp endDate
        timestamp lastActivity
        array assignmentProgress "Detailed assignment breakdown"
        timestamp createdAt
        timestamp updatedAt
    }

    TEACHER_DASHBOARDS {
        string id PK "Document ID: teacherId"
        string teacherId FK
        int totalCourses
        int totalStudents
        int totalActiveStudents
        int averageCompletionRate
        int upcomingAssignmentCount
        array courseIds
        object riskAnalysis "High/medium risk student analysis"
        timestamp lastUpdated
    }

    FUTURE_ASSIGNMENTS {
        string id PK "Document ID: studentId_assignmentId"
        string studentId FK
        string assignmentId FK
        string courseId FK
        string moduleId FK
        string status "future"
        boolean isAvailable
        timestamp createdAt
        timestamp updatedAt
    }

    %% Relationships
    SCHOOLS ||--o{ USERS : "schoolId"
    USERS ||--o{ COURSES : "teacherIds array"
    USERS ||--o{ ENROLLMENTS : "studentId"
    USERS ||--o{ STUDENT_ASSIGNMENTS : "studentId"
    USERS ||--o{ STUDENT_COURSE_SUMMARIES : "studentId"
    USERS ||--o{ STUDENT_MODULES : "studentId"
    USERS ||--|| TEACHER_DASHBOARDS : "teacherId"

    COURSES ||--o{ MODULES_SUBCOLL : "subcollection"
    COURSES ||--o{ ASSIGNMENTS_SUBCOLL : "subcollection"
    COURSES ||--o{ ENROLLMENTS : "courseId"
    COURSES ||--o{ STUDENT_COURSE_SUMMARIES : "courseId"
    COURSES ||--o{ STUDENT_MODULES : "courseId"

    MODULES_SUBCOLL ||--o{ STUDENT_MODULES : "moduleId"
    ASSIGNMENTS_SUBCOLL ||--o{ STUDENT_ASSIGNMENTS : "assignmentId"
    ASSIGNMENTS_SUBCOLL ||--o{ FUTURE_ASSIGNMENTS : "assignmentId"
```

## **Collections vs Subcollections**

### **ROOT COLLECTIONS** (Top-level Firestore collections):
These are accessed directly at the database root level:

1. **`schools`** - Educational institutions
2. **`users`** - Students and teachers (unified user system)
3. **`courses`** - Academic courses (parent collection)
4. **`enrollments`** - Student-course relationships
5. **`studentAssignments`** - Completed assignment submissions
6. **`futureAssignments`** - Assignments not yet available
7. **`studentModules`** - Module-level progress tracking
8. **`studentCourseSummaries`** - Course-level performance summaries
9. **`teacherDashboards`** - Teacher analytics and insights

### **SUBCOLLECTIONS** (Nested under parent collections):
These are nested within parent documents and accessed via parent path:

**Under `courses/{courseId}/`:**
1. **`modules`** - Course modules (nested under each course)
   - Path: `courses/{courseId}/modules/{moduleId}`
   
2. **`assignments`** - Course assignments (nested under each course)
   - Path: `courses/{courseId}/assignments/{assignmentId}`

## **Database Structure Hierarchy:**

```
📁 Firestore Database Root
├── 📂 schools/                    (Collection)
├── 📂 users/                      (Collection)
├── 📂 courses/                    (Collection)
│   └── 📄 {courseId}/             (Document)
│       ├── 📂 modules/            (Subcollection)
│       │   └── 📄 {moduleId}      (Document)
│       └── 📂 assignments/        (Subcollection)
│           └── 📄 {assignmentId}  (Document)
├── 📂 enrollments/                (Collection)
├── 📂 studentAssignments/         (Collection)
├── 📂 futureAssignments/          (Collection)
├── 📂 studentModules/             (Collection)
├── 📂 studentCourseSummaries/     (Collection)
└── 📂 teacherDashboards/          (Collection)
```

## **Key Points:**

- **Collections** exist at the root level and can be queried independently
- **Subcollections** are nested within documents and inherit the parent document's path
- Subcollections allow for better data organization and hierarchical queries
- In this schema, `modules` and `assignments` are subcollections under `courses` because they belong specifically to individual courses
- All other data types are root collections because they need to be queried across the entire system (e.g., finding all assignments for a student across multiple courses)

This design provides both hierarchical organization (subcollections) and efficient cross-collection querying (root collections) for the learning management system.