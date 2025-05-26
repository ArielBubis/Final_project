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
      teacherDashboards: true,
      studentModules: true // Add this new option
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
            let firebaseUID = null;
            
            try {
              // Create the user in Firebase Authentication
              const userRecord = await admin.auth().createUser({
                email: teacher.email,
                password: "123456", // This should be changed in production
                displayName: teacher.name,
                disabled: false
              });
              
              console.log(`Created new user: ${userRecord.uid} for teacher: ${teacher.name}`);
              firebaseUID = userRecord.uid;
            } catch (authError) {
              // Handle errors like email already exists
              console.log(`Error creating user for teacher ${teacher.name} (${teacher.email}): ${authError.message}`);
              
              // If the user already exists, try to get their UID
              if (authError.code === 'auth/email-already-exists') {
                try {
                  const existingUser = await admin.auth().getUserByEmail(teacher.email);
                  console.log(`User already exists for ${teacher.email}, using existing UID: ${existingUser.uid}`);
                  firebaseUID = existingUser.uid;
                } catch (getUserError) {
                  console.error(`Failed to get existing user for ${teacher.email}:`, getUserError.message);
                  // Continue without Firebase UID
                  firebaseUID = null;
                }
              } else {
                // For other errors, continue without Firebase UID
                firebaseUID = null;
              }
            }
            
            // Add the teacher to users array with teacher.id as document ID
            const teacherUser = {
              uid: firebaseUID, // Store Firebase Auth UID in the document
              userId: teacher.id, // Keep original teacher ID for reference
              firstName: extractFirstName(teacher.name),
              lastName: extractLastName(teacher.name),
              email: teacher.email,
              gender: teacher.gender || '',
              role: 'teacher',
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
      
      // Import users - Updated to use teacher ID as document ID
      await importCollection(users, 'users', user => user, user => {
        // For teachers, use their original ID as document ID
        // For students, use their student ID as document ID
        return user.userId ? user.userId.toString() : user.uid;
      });
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

    // 5. Import Student Assignment Progress - UPDATED
    if (importOptions.studentAssignments && csvData['studentAssignments.csv']) {
      console.log('Importing student assignments...');
      
      // Process completed assignments only (those with scores)
      const completedAssignments = csvData['studentAssignments.csv'].filter(sa => 
        sa.assessmentScore != null && sa.status === 'completed'
      );
      
      for (const studentAssignment of completedAssignments) {
        const docId = `${studentAssignment.studentId}_${studentAssignment.assignmentId}`;
        
        // Find course ID through assignment -> module relationship
        const assignment = csvData['assignments.csv']?.find(a => a.id === studentAssignment.assignmentId);
        if (!assignment) continue;
        
        const module = csvData['modules.csv']?.find(m => m.id === assignment.moduleId);
        if (!module) continue;
        
        const courseId = module.courseId;
        
        const progressDoc = {
          studentId: studentAssignment.studentId.toString(),
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
        
        if (completedAssignments.indexOf(studentAssignment) % 100 === 0) {
          console.log(`Processed ${completedAssignments.indexOf(studentAssignment)} completed student assignments...`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Process future assignments separately
      if (csvData['future_assignments_df']) {
        console.log('Processing future assignments...');
        for (const futureAssignment of csvData['future_assignments_df']) {
          const docId = `${futureAssignment.studentId}_${futureAssignment.assignmentId}`;
          
          // Find course ID through assignment -> module relationship
          const assignment = csvData['assignments.csv']?.find(a => a.id === futureAssignment.assignmentId);
          if (!assignment) continue;
          
          const module = csvData['modules.csv']?.find(m => m.id === assignment.moduleId);
          if (!module) continue;
          
          const futureDoc = {
            studentId: futureAssignment.studentId.toString(),
            assignmentId: futureAssignment.assignmentId,
            courseId: module.courseId,
            moduleId: assignment.moduleId,
            status: 'future',
            isAvailable: futureAssignment.isAvailable || false,
            createdAt: formatDate(futureAssignment.createdAt),
            updatedAt: formatDate(futureAssignment.updatedAt)
          };
          
          await db.collection('futureAssignments').doc(docId).set(futureDoc);
        }
      }
    }

    // 6. Import Student Course Summaries - UPDATED
    if (importOptions.studentCourseSummaries && csvData['studentCourses.csv']) {
      console.log('Importing student course summaries...');
      
      for (const enrollment of csvData['studentCourses.csv']) {
        const docId = `${enrollment.studentId}_${enrollment.courseId}`;
        
        // Calculate metrics based only on completed assignments
        const studentCompletedAssignments = csvData['studentAssignments.csv']?.filter(sa => 
          sa.studentId == enrollment.studentId && 
          sa.courseId === enrollment.courseId &&
          sa.assessmentScore != null &&
          sa.status === 'completed'
        ) || [];
        
        // Get total assignments for this course (including future ones)
        const courseAssignments = csvData['assignments.csv']?.filter(a => {
          const module = csvData['modules.csv']?.find(m => m.id === a.moduleId);
          return module && module.courseId === enrollment.courseId;
        }) || [];
        
        const completedCount = studentCompletedAssignments.length;
        const totalCount = courseAssignments.length;
        const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        // Calculate average score from completed assignments only
        const overallScore = studentCompletedAssignments.length > 0 
          ? studentCompletedAssignments.reduce((sum, sa) => sum + parseFloat(sa.assessmentScore), 0) / studentCompletedAssignments.length
          : 0;
        
        // Calculate risk level based on completed work
        let riskLevel = 'low';
        if (overallScore < 60 || completionRate < 50) riskLevel = 'high';
        else if (overallScore < 70 || completionRate < 75) riskLevel = 'medium';
        
        const summaryDoc = {
          studentId: enrollment.studentId.toString(),
          courseId: enrollment.courseId,
          overallScore: Math.round(overallScore * 100) / 100,
          completionRate: completionRate,
          totalTimeSpent: parseInt(enrollment.totalTimeSpentMinutes) || 0,
          completedAssignments: completedCount,
          totalAssignments: totalCount,
          lastAccessed: formatDate(enrollment.updatedAt),
          riskLevel: riskLevel,
          riskScore: overallScore < 60 ? 75 : overallScore < 70 ? 45 : 15,
          trend: enrollment.trend || 'stable',
          updatedAt: formatDate(enrollment.updatedAt)
        };
        
        await db.collection('studentCourseSummaries').doc(docId).set(summaryDoc);
      }
    }

    // Helper function to calculate course statistics - NEW
    function calculateCourseStatistics(courseId, csvData) {
      const courseAssignments = csvData['assignments.csv']?.filter(a => {
        const module = csvData['modules.csv']?.find(m => m.id === a.moduleId);
        return module && module.courseId === courseId;
      }) || [];
      
      const completedStudentAssignments = csvData['studentAssignments.csv']?.filter(sa => 
        sa.courseId === courseId && sa.assessmentScore != null && sa.status === 'completed'
      ) || [];
      
      const courseEnrollments = csvData['studentCourses.csv']?.filter(sc => 
        sc.courseId === courseId
      ) || [];
      
      return {
        totalAssignments: courseAssignments.length,
        totalStudents: courseEnrollments.length,
        averageScore: completedStudentAssignments.length > 0 
          ? completedStudentAssignments.reduce((sum, sa) => sum + parseFloat(sa.assessmentScore), 0) / completedStudentAssignments.length 
          : 0,
        completionRate: courseEnrollments.length > 0 
          ? (completedStudentAssignments.length / (courseEnrollments.length * courseAssignments.length)) * 100 
          : 0
      };
    }

    // 7. Generate Teacher Dashboards - UPDATED
    if (importOptions.teacherDashboards && csvData['teachers.csv']) {
      console.log('Generating teacher dashboards...');
      
      for (const teacher of csvData['teachers.csv']) {
        const teacherId = teacher.id.toString();
        
        // Get teacher's courses
        const teacherCourses = csvData['courses.csv']?.filter(course => {
          const teachers = parseArray(course.teachers);
          return teachers.includes(teacherId);
        }) || [];
        
        const courseIds = teacherCourses.map(c => c.id);
        
        // Calculate metrics based on completed assignments only
        let totalStudents = 0;
        let totalActiveStudents = 0;
        let averageCompletionRate = 0;
        
        teacherCourses.forEach(course => {
          const stats = calculateCourseStatistics(course.id, csvData);
          totalStudents += stats.totalStudents;
          totalActiveStudents += Math.floor(stats.totalStudents * 0.8); // Assume 80% are active
          averageCompletionRate += stats.completionRate;
        });
        
        averageCompletionRate = teacherCourses.length > 0 
          ? averageCompletionRate / teacherCourses.length 
          : 0;
        
        // Find high-risk students
        const highRiskStudentIds = [];
        const mediumRiskStudentIds = [];
        
        csvData['studentCourses.csv']?.forEach(enrollment => {
          if (courseIds.includes(enrollment.courseId)) {
            const finalScore = parseFloat(enrollment.finalScore) || 0;
            if (finalScore < 60) {
              highRiskStudentIds.push(enrollment.studentId.toString());
            } else if (finalScore < 70) {
              mediumRiskStudentIds.push(enrollment.studentId.toString());
            }
          }
        });
        
        // Calculate upcoming assignments for teacher's courses
        const now = new Date('2023-11-01'); // Use a fixed date for consistency
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        
        let upcomingAssignmentCount = 0;
        courseIds.forEach(courseId => {
          const courseAssignments = csvData['assignments.csv']?.filter(a => {
            const module = csvData['modules.csv']?.find(m => m.id === a.moduleId);
            if (!module || module.courseId !== courseId) return false;
            
            const dueDate = new Date(a.dueDate);
            return dueDate >= now && dueDate <= nextWeek;
          }) || [];
          
          upcomingAssignmentCount += courseAssignments.length;
        });
        
        const dashboardDoc = {
          teacherId: teacherId,
          totalCourses: teacherCourses.length,
          totalStudents: totalStudents,
          totalActiveStudents: totalActiveStudents,
          averageCompletionRate: Math.round(averageCompletionRate),
          upcomingAssignmentCount: upcomingAssignmentCount,
          courseIds: courseIds,
          riskAnalysis: {
            lastRun: admin.firestore.Timestamp.now(),
            highRiskStudentIds: [...new Set(highRiskStudentIds)], // Remove duplicates
            mediumRiskStudentIds: [...new Set(mediumRiskStudentIds)]
          },
          lastUpdated: admin.firestore.Timestamp.now()
        };
        
        await db.collection('teacherDashboards').doc(teacherId).set(dashboardDoc);
      }
    }

    // 8. Import Student Module Progress - NEW
    if (importOptions.studentModules && csvData['studentAssignments.csv'] && csvData['modules.csv']) {
      console.log('Calculating and importing student module progress...');
      await importStudentModuleProgress(csvData);
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

// Add this new function to calculate and import student module progress
async function importStudentModuleProgress(csvData) {
  const studentModuleMap = new Map();
  
  // Get all student enrollments to know which students are in which courses
  const studentEnrollments = csvData['studentCourses.csv'] || [];
  
  // Process each student enrollment
  for (const enrollment of studentEnrollments) {
    const studentId = enrollment.studentId.toString();
    const courseId = enrollment.courseId;
    
    // Get all modules for this course
    const courseModules = csvData['modules.csv'].filter(m => m.courseId === courseId);
    
    for (const module of courseModules) {
      const moduleId = module.id;
      const mapKey = `${studentId}_${moduleId}`;
      
      // Get all assignments for this module
      const moduleAssignments = csvData['assignments.csv'].filter(a => a.moduleId === moduleId);
      const totalAssignments = moduleAssignments.length;
      
      if (totalAssignments === 0) continue; // Skip modules with no assignments
      
      // Get completed assignments for this student in this module
      const completedAssignments = csvData['studentAssignments.csv'].filter(sa => 
        sa.studentId == studentId && 
        sa.status === 'completed' &&
        sa.assessmentScore != null &&
        moduleAssignments.some(ma => ma.id === sa.assignmentId)
      );
      
      const completedCount = completedAssignments.length;
      const completionRate = Math.round((completedCount / totalAssignments) * 100);
      
      // Calculate module score (weighted average of completed assignments)
      let moduleScore = 0;
      let totalWeight = 0;
      
      if (completedAssignments.length > 0) {
        completedAssignments.forEach(sa => {
          const assignment = moduleAssignments.find(ma => ma.id === sa.assignmentId);
          const weight = parseFloat(assignment?.weight) || 1;
          const score = parseFloat(sa.assessmentScore) || 0;
          
          moduleScore += score * weight;
          totalWeight += weight;
        });
        
        moduleScore = totalWeight > 0 ? Math.round((moduleScore / totalWeight) * 100) / 100 : 0;
      }
      
      // Determine module status
      let moduleStatus = 'not_started';
      if (completedCount > 0 && completedCount < totalAssignments) {
        moduleStatus = 'in_progress';
      } else if (completedCount === totalAssignments) {
        moduleStatus = 'completed';
      }
      
      // Calculate time spent in this module
      const totalTimeSpent = completedAssignments.reduce((sum, sa) => 
        sum + (parseInt(sa.timeSpentMinutes) || 0), 0
      );
      
      // Determine if student is at risk in this module
      let riskLevel = 'low';
      if (moduleScore < 60 || completionRate < 50) {
        riskLevel = 'high';
      } else if (moduleScore < 70 || completionRate < 75) {
        riskLevel = 'medium';
      }
      
      // Get the latest activity date
      const latestSubmission = completedAssignments.length > 0 
        ? completedAssignments.reduce((latest, sa) => 
            new Date(sa.submissionDate) > new Date(latest.submissionDate) ? sa : latest
          )
        : null;
      
      // Calculate estimated time to completion based on remaining assignments and average time per assignment
      const avgTimePerAssignment = completedCount > 0 ? totalTimeSpent / completedCount : 60; // Default 60 min
      const estimatedTimeToCompletion = (totalAssignments - completedCount) * avgTimePerAssignment;
      
      const studentModuleProgress = {
        studentId: studentId,
        moduleId: moduleId,
        courseId: courseId,
        moduleName: module.name,
        moduleSequence: parseInt(module.sequenceNumber) || 0,
        isRequired: module.required === 'true',
        
        // Progress metrics
        status: moduleStatus,
        completionRate: completionRate,
        completedAssignments: completedCount,
        totalAssignments: totalAssignments,
        moduleScore: moduleScore,
        
        // Time tracking
        totalTimeSpentMinutes: totalTimeSpent,
        estimatedTimeToCompletion: Math.round(estimatedTimeToCompletion),
        
        // Risk assessment
        riskLevel: riskLevel,
        riskScore: moduleScore < 60 ? 80 : moduleScore < 70 ? 50 : 20,
        
        // Dates
        startDate: formatDate(module.startDate),
        endDate: formatDate(module.endDate),
        lastActivity: latestSubmission ? formatDate(latestSubmission.submissionDate) : null,
        
        // Assignment breakdown for detailed tracking
        assignmentProgress: moduleAssignments.map(assignment => {
          const studentAssignment = completedAssignments.find(sa => sa.assignmentId === assignment.id);
          return {
            assignmentId: assignment.id,
            assignmentName: assignment.name,
            assignmentType: assignment.assignmentType,
            dueDate: formatDate(assignment.dueDate),
            maxScore: parseFloat(assignment.maxScore) || 100,
            weight: parseFloat(assignment.weight) || 0,
            status: studentAssignment ? 'completed' : 'pending',
            score: studentAssignment ? parseFloat(studentAssignment.assessmentScore) : null,
            submissionDate: studentAssignment ? formatDate(studentAssignment.submissionDate) : null,
            isLate: studentAssignment ? studentAssignment.isLate === 'true' : false,
            timeSpentMinutes: studentAssignment ? parseInt(studentAssignment.timeSpentMinutes) || 0 : 0
          };
        }),
        
        createdAt: formatDate(enrollment.createdAt),
        updatedAt: admin.firestore.Timestamp.now()
      };
      
      studentModuleMap.set(mapKey, studentModuleProgress);
    }
  }
  
  // Import the student module progress data
  const studentModuleProgressArray = Array.from(studentModuleMap.values());
  
  console.log(`Processing ${studentModuleProgressArray.length} student module progress records...`);
  
  await importCollection(
    studentModuleProgressArray, 
    'studentModules', 
    record => record, 
    record => `${record.studentId}_${record.moduleId}`
  );
  
  console.log('Student module progress import completed!');
}