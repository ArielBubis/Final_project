const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Main function to import CSV files
async function importCsvToFirebase(csvFolder) {
  try {
    // Configure which parts of the import to run
    const importOptions = {
      users: true,
      schools: true,
      courses: true,
      enrollments: true,
      studentAssignments: true,
      studentCourseSummaries: true,
      teacherDashboards: true
    };
    
    // Load all CSV data first
    const csvData = {};
    const csvFiles = [
      'schools.csv', 'students.csv', 'teachers.csv', 'courses.csv', 
      'modules.csv', 'assignments.csv', 'studentAssignments.csv',
      'studentCourses.csv'
    ];

    for (const fileName of csvFiles) {
      const filePath = path.join(csvFolder, fileName);
      
      if (!fs.existsSync(filePath)) {
        console.log(`File ${fileName} not found, skipping...`);
        continue;
      }
      
      const fileContent = fs.readFileSync(filePath, 'utf8');
      csvData[fileName] = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
      });
      
      console.log(`Loaded ${csvData[fileName].length} records from ${fileName}`);
    }

    // 1. Import Schools
    if (importOptions.schools && csvData['schools.csv']) {
      console.log('Importing schools...');
      await importCollection(csvData['schools.csv'], 'schools', record => ({
        name: record.name,
        location: record.location,
        ranking: parseFloat(record.ranking) || 0,
        specialization: record.specialization,
        studentCapacity: parseInt(record.studentCapacity) || 0,
        foundingYear: parseInt(record.foundingYear) || 0,
        website: record.website
      }), record => record.id);
    }

    // 2. Import Users (Students and Teachers)
    if (importOptions.users) {
      console.log('Creating users collection...');
      const users = [];
      
      // Process students as users
      if (csvData['students.csv']) {
        for (const student of csvData['students.csv']) {
          users.push({
            uid: student.id, // Use student ID as UID
            firstName: extractFirstName(student.name),
            lastName: extractLastName(student.name),
            email: student.email,
            role: 'student',
            schoolId: 'SCH920609', // Default school from your data
            registrationDate: formatDate(student.createdAt),
            gradeLevel: parseInt(student.gradeLevel) || null,
            entryYear: parseInt(student.entryYear) || null,
            createdAt: formatDate(student.createdAt)
          });
        }
      }
      
      // Process teachers as users
      if (csvData['teachers.csv']) {
        // Create an active user in the firebase auth system for each teacher
        // Note: In a production environment, you should:
        // 1. Use a more secure password
        // 2. Implement a password reset flow for first login
        // 3. Consider using email verification
        const createTeacherPromises = csvData['teachers.csv'].map(async (teacher) => {
          try {
            // Create the user in Firebase Authentication
            const userRecord = await admin.auth().createUser({
              email: teacher.email,
              password: "123456", // This should be changed in production
              displayName: teacher.name,
              disabled: false
            });
            
            console.log(`Created new user: ${userRecord.uid} for teacher: ${teacher.name}`);
            
            // Push the teacher to users array with the UID from Firebase Auth
            users.push({
              UID: userRecord.uid, // Store the Firebase Auth UID
              userId: teacher.id,
              firstName: extractFirstName(teacher.name),
              lastName: extractLastName(teacher.name),
              email: teacher.email,
              gender: teacher.gender || '',
              roles: {
                student: false,
                teacher: true,
                admin: false
              },
              createdAt: formatDate(teacher.createdAt)
            });
          } catch (error) {
            // Handle errors like email already exists
            console.error(`Error creating user for teacher ${teacher.name} (${teacher.email}): `, error);
            
            // If the user already exists, try to get their UID
            if (error.code === 'auth/email-already-exists') {
              try {
                const existingUser = await admin.auth().getUserByEmail(teacher.email);
                console.log(`User already exists for ${teacher.email}, using existing UID: ${existingUser.uid}`);
                
                users.push({
                  UID: existingUser.uid,
                  userId: teacher.id,
                  firstName: extractFirstName(teacher.name),
                  lastName: extractLastName(teacher.name),
                  email: teacher.email,
                  gender: teacher.gender || '',
                  roles: {
                    student: false,
                    teacher: true,
                    admin: false
                  },
                  createdAt: formatDate(teacher.createdAt)
                });
              } catch (getUserError) {
                console.error(`Failed to get existing user for ${teacher.email}:`, getUserError);
                // Add the user without a UID as a fallback
                users.push({
                  userId: teacher.id,
                  firstName: extractFirstName(teacher.name),
                  lastName: extractLastName(teacher.name),
                  email: teacher.email,
                  gender: teacher.gender || '',
                  roles: {
                    student: false,
                    teacher: true,
                    admin: false
                  },
                  createdAt: formatDate(teacher.createdAt)
                });
              }
            } else {
              // For other errors, add the user without a UID
              users.push({
                userId: teacher.id,
                firstName: extractFirstName(teacher.name),
                lastName: extractLastName(teacher.name),
                email: teacher.email,
                gender: teacher.gender || '',
                roles: {
                  student: false,
                  teacher: true,
                  admin: false
                },
                createdAt: formatDate(teacher.createdAt)
              });
            }
          }
        });
        
        // Wait for all teacher user creation to complete
        await Promise.all(createTeacherPromises);
      }
      
      // Import users
      await importCollection(users, 'users', user => user, user => user.uid);
    }

    // 3. Import Courses with subcollections
    if (importOptions.courses && csvData['courses.csv']) {
      console.log('Importing courses...');
      
      for (const courseRecord of csvData['courses.csv']) {
        const courseId = courseRecord.id;
        const parsedTeachers = parseArray(courseRecord.teachers);
        const teacherId = parsedTeachers[0] || null;
        
        // Create main course document
        const courseDoc = {
          courseName: courseRecord.name,
          description: courseRecord.description,
          schoolId: courseRecord.schoolId,
          teacherIds: parsedTeachers, // Array of teacher IDs
          subjectArea: courseRecord.subjectArea,
          startDate: formatDate(courseRecord.startDate),
          endDate: formatDate(courseRecord.endDate),
          durationWeeks: parseInt(courseRecord.durationWeeks) || null,
          published: courseRecord.published === 'true',
          activeCode: courseRecord.accessCode,
          createdAt: formatDate(courseRecord.createdAt)
        };
        
        const courseRef = db.collection('courses').doc(courseId);
        await courseRef.set(courseDoc);
        
        // Import modules as subcollection
        if (csvData['modules.csv']) {
          const courseModules = csvData['modules.csv'].filter(m => m.courseId === courseId);
          
          for (const module of courseModules) {
            const moduleRef = courseRef.collection('modules').doc(module.id);
            await moduleRef.set({
              moduleTitle: module.name,
              description: module.description,
              sequenceNumber: parseInt(module.sequenceNumber) || 0,
              isRequired: module.required === 'true',
              startDate: formatDate(module.startDate),
              endDate: formatDate(module.endDate),
              durationDays: parseInt(module.durationDays) || null
            });
          }
        }
        
        // Import assignments as subcollection
        if (csvData['assignments.csv']) {
          const courseAssignments = csvData['assignments.csv'].filter(a => {
            // Find assignments through module relationship
            const moduleId = a.moduleId;
            const module = csvData['modules.csv']?.find(m => m.id === moduleId);
            return module?.courseId === courseId;
          });
          
          for (const assignment of courseAssignments) {
            const assignmentRef = courseRef.collection('assignments').doc(assignment.id);
            await assignmentRef.set({
              title: assignment.name,
              description: assignment.description,
              moduleId: assignment.moduleId,
              assignmentType: assignment.assignmentType,
              assignDate: formatDate(assignment.assignDate),
              dueDate: formatDate(assignment.dueDate),
              maxScore: parseFloat(assignment.maxScore) || 100,
              weight: parseFloat(assignment.weight) || 0,
              maxAttempts: parseInt(assignment.maxAttempts) || 1,
              createdAt: formatDate(assignment.createdAt)
            });
          }
        }
        
        console.log(`Imported course ${courseId} with modules and assignments`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 4. Import Enrollments
    if (importOptions.enrollments && csvData['studentCourses.csv']) {
      console.log('Importing enrollments...');
      await importCollection(csvData['studentCourses.csv'], 'enrollments', record => ({
        studentId: record.studentId,
        courseId: record.courseId,
        enrollmentDate: formatDate(record.createdAt),
        status: 'active' // Default status
      }), record => `${record.studentId}_${record.courseId}`);
    }

    // 5. Import Student Assignment Progress
    if (importOptions.studentAssignments && csvData['studentAssignments.csv']) {
      console.log('Importing student assignments...');
      
      for (const studentAssignment of csvData['studentAssignments.csv']) {
        const docId = `${studentAssignment.studentId}_${studentAssignment.assignmentId}`;
        
        // Find course ID through assignment -> module relationship
        const assignment = csvData['assignments.csv']?.find(a => a.id === studentAssignment.assignmentId);
        if (!assignment) continue;
        
        const module = csvData['modules.csv']?.find(m => m.id === assignment.moduleId);
        if (!module) continue;
        
        const courseId = module.courseId;
        
        const progressDoc = {
          studentId: studentAssignment.studentId,
          assignmentId: studentAssignment.assignmentId,
          courseId: courseId,
          moduleId: assignment.moduleId,
          status: 'completed',
          submissionDate: formatDate(studentAssignment.submissionDate),
          currentScore: parseFloat(studentAssignment.assessmentScore) || 0,
          isLate: studentAssignment.isLate === 'true',
          timeSpentMinutes: parseInt(studentAssignment.timeSpentMinutes) || 0,
          attemptCount: 1,
          attempts: [{
            attemptNumber: 1,
            score: parseFloat(studentAssignment.assessmentScore) || 0,
            submissionDate: formatDate(studentAssignment.submissionDate),
            timeSpentMinutes: parseInt(studentAssignment.timeSpentMinutes) || 0,
            isLate: studentAssignment.isLate === 'true'
          }],
          createdAt: formatDate(studentAssignment.createdAt),
          updatedAt: formatDate(studentAssignment.updatedAt)
        };
        
        await db.collection('studentAssignments').doc(docId).set(progressDoc);
        
        if (csvData['studentAssignments.csv'].indexOf(studentAssignment) % 100 === 0) {
          console.log(`Processed ${csvData['studentAssignments.csv'].indexOf(studentAssignment)} student assignments...`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // 6. Import Student Course Summaries
    if (importOptions.studentCourseSummaries && csvData['studentCourses.csv']) {
      console.log('Importing student course summaries...');
      
      for (const enrollment of csvData['studentCourses.csv']) {
        const docId = `${enrollment.studentId}_${enrollment.courseId}`;
        
        // Calculate risk level based on final score
        let riskLevel = 'low';
        const finalScore = parseFloat(enrollment.finalScore) || 0;
        if (finalScore < 60) riskLevel = 'high';
        else if (finalScore < 70) riskLevel = 'medium';
        
        const summaryDoc = {
          studentId: enrollment.studentId,
          courseId: enrollment.courseId,
          overallScore: finalScore,
          completionRate: 85, // Default completion rate
          totalTimeSpent: parseInt(enrollment.totalTimeSpentMinutes) || 0,
          completedAssignments: 3, // Default
          totalAssignments: 5, // Default
          lastAccessed: formatDate(enrollment.updatedAt),
          riskLevel: riskLevel,
          riskScore: finalScore < 60 ? 75 : finalScore < 70 ? 45 : 15,
          updatedAt: formatDate(enrollment.updatedAt)
        };
        
        await db.collection('studentCourseSummaries').doc(docId).set(summaryDoc);
      }
    }

    // 7. Generate Teacher Dashboards
    if (importOptions.teacherDashboards && csvData['teachers.csv']) {
      console.log('Generating teacher dashboards...');
      
      for (const teacher of csvData['teachers.csv']) {
        const teacherId = teacher.id;
        
        // Get teacher's courses
        const teacherCourses = csvData['courses.csv']?.filter(course => {
          const teachers = parseArray(course.teachers);
          return teachers.includes(teacherId);
        }) || [];
        
        // Calculate basic metrics
        const totalCourses = teacherCourses.length;
        const courseIds = teacherCourses.map(c => c.id);
        
        // Count total students across all courses
        let totalStudents = 0;
        teacherCourses.forEach(course => {
          const students = parseArray(course.students);
          totalStudents += students.length;
        });
        
        const dashboardDoc = {
          teacherId: teacherId,
          totalCourses: totalCourses,
          totalStudents: totalStudents,
          totalActiveStudents: Math.floor(totalStudents * 0.8), // 80% active assumption
          averageCompletionRate: 75, // Default
          upcomingAssignmentCount: 5, // Default
          courseIds: courseIds,
          riskAnalysis: {
            lastRun: admin.firestore.Timestamp.now(),
            highRiskStudentIds: [],
            mediumRiskStudentIds: []
          },
          lastUpdated: admin.firestore.Timestamp.now()
        };
        
        await db.collection('teacherDashboards').doc(teacherId).set(dashboardDoc);
      }
    }

    console.log('Import completed successfully!');
  } catch (error) {
    console.error('Error importing data:', error);
  }
}

// Helper function to import a collection with batch processing
async function importCollection(records, collectionName, formatFunction, getDocId = null) {
  const batchSize = 100;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = db.batch();
    const currentBatch = records.slice(i, i + batchSize);
    
    currentBatch.forEach((record) => {
      const formattedRecord = formatFunction(record);
      const docId = getDocId ? getDocId(record) : 
                   formattedRecord.uid || formattedRecord.id || 
                   db.collection(collectionName).doc().id;
      
      const docRef = db.collection(collectionName).doc(docId);
      batch.set(docRef, formattedRecord);
    });
    
    try {
      await batch.commit();
      console.log(`Imported batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(records.length/batchSize)} to ${collectionName}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error importing batch to ${collectionName}:`, error);
    }
  }
  
  console.log(`Successfully processed ${records.length} records for ${collectionName}`);
}

// Helper functions
function formatDate(dateStr) {
  if (!dateStr) return admin.firestore.Timestamp.now();
  try {
    return admin.firestore.Timestamp.fromDate(new Date(dateStr));
  } catch (e) {
    return admin.firestore.Timestamp.now();
  }
}

function parseArray(value) {
  if (!value) return [];
  try {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // Handle CSV array formats
      if (value.includes('""')) {
        const cleanedString = value.replace(/\[""/g, '["').replace(/""\]/g,'"]').replace(/"", ""/g, '","');
        try {
          return JSON.parse(cleanedString);
        } catch (parseErr) {
          console.warn('Error parsing special format:', parseErr);
        }
      }
      
      if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
        try {
          return JSON.parse(value.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
        } catch (jsonErr) {
          console.warn('Error parsing JSON array:', jsonErr);
        }
      }
      
      // Fallback: split by comma
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  } catch (e) {
    console.warn('Error parsing array:', e);
    return [];
  }
}

function extractFirstName(fullName) {
  if (!fullName) return '';
  return fullName.split(' ')[0] || '';
}

function extractLastName(fullName) {
  if (!fullName) return '';
  const nameParts = fullName.split(' ');
  return nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
}

// Run the import
const csvFolder = path.join(__dirname, '../data/csv');
importCsvToFirebase(csvFolder);