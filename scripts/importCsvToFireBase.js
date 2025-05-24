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
      schools: false,
      courses: false,
      enrollments: false,
      studentAssignments: false,
      studentCourseSummaries: false,
      teacherDashboards: false
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
        for (const teacher of csvData['teachers.csv']) {
          try {
            let userUID = null;
            
            try {
              // Create the user in Firebase Authentication
              const userRecord = await admin.auth().createUser({
                email: teacher.email,
                password: "123456", // This should be changed in production
                displayName: teacher.name,
                disabled: false
              });
              
              console.log(`Created new user: ${userRecord.uid} for teacher: ${teacher.name}`);
              userUID = userRecord.id;
            } catch (authError) {
              // Handle errors like email already exists
              console.log(`Error creating user for teacher ${teacher.name} (${teacher.email}): ${authError.message}`);
              
              // If the user already exists, try to get their UID
              if (authError.code === 'auth/email-already-exists') {
                try {
                  const existingUser = await admin.auth().getUserByEmail(teacher.email);
                  console.log(`User already exists for ${teacher.email}, using existing UID: ${existingUser.uid}`);
                  userUID = existingUser.uid;
                } catch (getUserError) {
                  console.error(`Failed to get existing user for ${teacher.email}:`, getUserError.message);
                  // Continue without UID - will use teacher.id as fallback
                }
              }
            }
            
            // Add the teacher to users array with proper UID handling
            const teacherUser = {
              uid: userRecord.uid, // Use Firebase UID or fallback to teacher.id
              userId: teacher.id,
              firstName: extractFirstName(teacher.name),
              lastName: extractLastName(teacher.name),
              email: teacher.email,
              gender: teacher.gender || '',
              role: 'teacher', // Use single role field for consistency
              roles: {
                student: false,
                teacher: true,
                admin: false
              },
              createdAt: formatDate(teacher.createdAt)
            };
            
            users.push(teacherUser);
            console.log(`Successfully processed teacher: ${teacher.name}`);
            
          } catch (error) {
            console.error(`Failed to process teacher ${teacher.name}:`, error.message);
            // Continue with next teacher
            continue;
          }
        }
      }
      
      // Import users
      await importCollection(users, 'users', user => user, user => user.uid);
    }

    // 3. Import Courses with subcollections
    if (importOptions.courses && csvData['courses.csv']) {
      console.log('Importing courses...');
      await importCoursesWithEnhancedData(csvData);
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

// Helper function for enhanced assignment-module mapping
async function enhanceAssignmentModuleMapping(csvData) {
  console.log('Enhancing assignment and module data mapping...');
  
  // Create comprehensive assignment-module-course mapping
  const assignmentModuleMap = new Map();
  const moduleAssignmentMap = new Map();
  
  if (csvData['assignments.csv'] && csvData['modules.csv']) {
    // Build assignment to module mapping
    csvData['assignments.csv'].forEach(assignment => {
      const moduleId = assignment.moduleId;
      const assignmentData = {
        ...assignment,
        maxScore: parseFloat(assignment.maxScore) || 100,
        weight: parseFloat(assignment.weight) || 0,
        averageScore: parseFloat(assignment.averageScore) || 0,
        lateRate: parseFloat(assignment.lateRate) || 0,
        submissionRate: parseInt(assignment.submissionRate) || 0,
        maxAttempts: assignment.maxAttempts ? parseInt(assignment.maxAttempts) : null
      };
      
      assignmentModuleMap.set(assignment.id, {
        assignment: assignmentData,
        moduleId: moduleId
      });
      
      // Group assignments by module
      if (!moduleAssignmentMap.has(moduleId)) {
        moduleAssignmentMap.set(moduleId, []);
      }
      moduleAssignmentMap.get(moduleId).push(assignmentData);
    });
    
    // Enhanced module data with assignment aggregation
    csvData['modules.csv'].forEach(module => {
      const assignments = moduleAssignmentMap.get(module.id) || [];
      const moduleData = {
        ...module,
        durationDays: parseInt(module.durationDays) || 0,
        sequenceNumber: parseInt(module.sequenceNumber) || 0,
        required: module.required === 'true',
        assignmentCount: assignments.length,
        totalWeight: assignments.reduce((sum, a) => sum + a.weight, 0),
        averageAssignmentScore: assignments.length > 0 ? 
          assignments.reduce((sum, a) => sum + a.averageScore, 0) / assignments.length : 0
      };
      
      moduleAssignmentMap.set(module.id, {
        module: moduleData,
        assignments: assignments
      });
    });
  }
  
  return { assignmentModuleMap, moduleAssignmentMap };
}

// New function to import courses with enhanced data
async function importCoursesWithEnhancedData(csvData) {
  console.log('Importing enhanced courses with assignment and module data...');
  
  const { assignmentModuleMap, moduleAssignmentMap } = await enhanceAssignmentModuleMapping(csvData);
  
  for (const courseRecord of csvData['courses.csv']) {
    const courseId = courseRecord.id;
    const parsedTeachers = parseArray(courseRecord.teachers);
    const parsedStudents = parseArray(courseRecord.students);
    const parsedModules = parseArray(courseRecord.modules);
    
    // Create enhanced course document
    const courseDoc = {
      courseName: courseRecord.name,
      description: courseRecord.description,
      schoolId: courseRecord.schoolId,
      teacherIds: parsedTeachers,
      studentIds: parsedStudents, // Add student IDs for efficient querying
      subjectArea: courseRecord.subjectArea,
      startDate: formatDate(courseRecord.startDate),
      endDate: formatDate(courseRecord.endDate),
      durationWeeks: parseInt(courseRecord.durationWeeks) || null,
      published: courseRecord.published === 'true',
      activeCode: courseRecord.accessCode,
      moduleCount: parsedModules.length,
      assignmentCount: 0, // Will be calculated
      createdAt: formatDate(courseRecord.createdAt)
    };
    
    let totalAssignments = 0;
    
    const courseRef = db.collection('courses').doc(courseId);
    await courseRef.set(courseDoc);
    
    // Import modules with enhanced data
    let courseModules = []; // Define courseModules variable here
    if (csvData['modules.csv']) {
      courseModules = csvData['modules.csv'].filter(m => m.courseId === courseId);
      
      for (const module of courseModules) {
        const moduleData = moduleAssignmentMap.get(module.id);
        const assignments = moduleData?.assignments || [];
        totalAssignments += assignments.length;
        
        const moduleRef = courseRef.collection('modules').doc(module.id);
        await moduleRef.set({
          moduleTitle: module.name,
          description: module.description,
          sequenceNumber: parseInt(module.sequenceNumber) || 0,
          isRequired: module.required === 'true',
          startDate: formatDate(module.startDate),
          endDate: formatDate(module.endDate),
          durationDays: parseInt(module.durationDays) || null,
          subject: module.subject,
          assignmentCount: assignments.length,
          totalWeight: assignments.reduce((sum, a) => sum + (a.weight || 0), 0),
          averageScore: assignments.length > 0 ? 
            assignments.reduce((sum, a) => sum + (a.averageScore || 0), 0) / assignments.length : 0,
          createdAt: formatDate(module.createdAt)
        });
        
        // Import assignments for this module
        for (const assignment of assignments) {
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
            maxAttempts: assignment.maxAttempts ? parseInt(assignment.maxAttempts) : null,
            averageScore: parseFloat(assignment.averageScore) || 0,
            lateRate: parseFloat(assignment.lateRate) || 0,
            submissionRate: parseInt(assignment.submissionRate) || 0,
            createdAt: formatDate(assignment.createdAt)
          });
        }
      }
    }
    
    // Update course with total assignment count
    await courseRef.update({ assignmentCount: totalAssignments });
    
    console.log(`Enhanced course ${courseId} with ${courseModules.length} modules and ${totalAssignments} assignments`);
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}

// Helper function to import a collection with batch processing
async function importCollection(records, collectionName, formatFunction, getDocId = null) {
  const batchSize = 100;
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = db.batch();
    const currentBatch = records.slice(i, i + batchSize);
    
    currentBatch.forEach((record, index) => {
      try {
        const formattedRecord = formatFunction(record);
        let docId = null;
        
        if (getDocId) {
          docId = getDocId(record);
        } else {
          docId = formattedRecord.uid || formattedRecord.id;
        }
        
        // Ensure docId is valid (non-empty string)
        if (!docId || typeof docId !== 'string' || docId.trim() === '') {
          docId = db.collection(collectionName).doc().id;
          console.warn(`Generated new docId for record ${index} in ${collectionName}: ${docId}`);
        }
        
        const docRef = db.collection(collectionName).doc(docId.trim());
        batch.set(docRef, formattedRecord);
      } catch (recordError) {
        console.error(`Error processing record ${index} in ${collectionName}:`, recordError.message);
        // Skip this record and continue with others
      }
    });
    
    try {
      await batch.commit();
      console.log(`Imported batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(records.length/batchSize)} to ${collectionName}`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error importing batch to ${collectionName}:`, error.message);
      // Continue with next batch
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