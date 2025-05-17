const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json'); // You'll need to create this

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
      teachers: false,
      students: false,
      courses: false,
      modules: false, //
      assignments: false,//
      enrollments: false,
      studentProgress: false // Set to false if already imported
    };
    
    // Load all CSV data first
    const csvData = {};
    const csvFiles = [
      'schools.csv', 'students.csv', 'teachers.csv', 'courses.csv', 
      'modules.csv', 'assignments.csv', 'studentAssignments.csv',
      'studentCourses.csv', 'enrollments.csv', 'futureAssignments.csv',
      'pendingAssignments.csv'
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

    // Import users first (required for students and teachers)
    if (importOptions.users) {
      console.log('Creating users collection...');
      const users = [];
      
      // Process students as users
      if (csvData['students.csv']) {
        csvData['students.csv'].forEach(student => {
          users.push({
            userId: student.id,
            firstName: extractFirstName(student.name),
            lastName: extractLastName(student.name),
            email: student.email,
            gender: student.gender || '',
            role: "student", // Changed from roles (plural) to role (singular)
            createdAt: formatDate(student.createdAt),
            schoolId: student.schoolId || '',
            registrationDate: formatDate(student.createdAt) // For students as per schema
          });
        });
      }
      
      // Process teachers as users
      if (csvData['teachers.csv']) {
        // Create an active user in the firebase auth system for each teacher
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
              uid: userRecord.uid, // Changed from UID to lowercase uid as per schema
              userId: teacher.id,
              firstName: extractFirstName(teacher.name),
              lastName: extractLastName(teacher.name),
              email: teacher.email,
              gender: teacher.gender || '',
              role: "teacher", // Changed from roles (plural) to role (singular)
              createdAt: formatDate(teacher.createdAt),
              schoolId: teacher.schoolId || ''
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
                  uid: existingUser.uid, // Changed from UID to lowercase uid as per schema
                  userId: teacher.id,
                  firstName: extractFirstName(teacher.name),
                  lastName: extractLastName(teacher.name),
                  email: teacher.email,
                  gender: teacher.gender || '',
                  role: "teacher", // Changed from roles (plural) to role (singular)
                  createdAt: formatDate(teacher.createdAt),
                  schoolId: teacher.schoolId || ''
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
                  role: "teacher", // Changed from roles (plural) to role (singular)
                  createdAt: formatDate(teacher.createdAt),
                  schoolId: teacher.schoolId || ''
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
                role: "teacher", // Changed from roles (plural) to role (singular)
                createdAt: formatDate(teacher.createdAt),
                schoolId: teacher.schoolId || ''
              });
            }
          }
        });
        
        // Wait for all teacher user creation to complete
        await Promise.all(createTeacherPromises);
      }
      
      // Import users
      await importCollection(users, 'users', user => user);
    }

    // Import schools
    if (importOptions.schools && csvData['schools.csv']) {
      console.log('Importing schools...');
      await importCollection(csvData['schools.csv'], 'schools', record => {
        return {
          schoolId: record.id,
          name: record.name,
          location: record.location,
          ranking: parseFloat(record.ranking) || 0,
          specialization: record.specialization,
          studentCapacity: parseInt(record.studentCapacity) || 0,
          foundingYear: parseInt(record.foundingYear) || 0,
          website: record.website
        };
      });
    }

    // Import teachers
    if (importOptions.teachers && csvData['teachers.csv']) {
      console.log('Importing teachers...');
      await importCollection(csvData['teachers.csv'], 'teachers', record => {
        return {
          teacherId: record.id,
          userId: record.id, // Using the same ID as the user document
          schoolId: record.schoolId,
          department: record.department || '',
          title: record.title || '',
          courses: parseArray(record.courses)
        };
      });
    }

    // Import students
    if (importOptions.students && csvData['students.csv']) {
      console.log('Importing students...');
      await importCollection(csvData['students.csv'], 'students', record => {
        return {
          studentId: record.id,
          userId: record.id, // Using the same ID as the user document
          registrationDate: formatDate(record.createdAt),
          entryYear: parseInt(record.entryYear) || null,
          gradeLevel: parseInt(record.gradeLevel) || null,
          courses: parseArray(record.courses),
          totalScore: parseFloat(record.totalScore) || 0
        };
      });
    }

    // Import courses
    if (importOptions.courses && csvData['courses.csv']) {
      console.log('Importing courses...');
      console.log('First course record sample:', JSON.stringify(csvData['courses.csv'][0])); // Debug first record
      
      await importCollection(csvData['courses.csv'], 'courses', record => {
        console.log('Processing course:', record.id);
        
        const parsedTeachers = parseArray(record.teachers);
        console.log('Parsed teachers for course', record.id, ':', parsedTeachers);
        const teacherId = parsedTeachers[0] || null; // Take first teacher as primary
        console.log('Selected teacherId:', teacherId);
        
        const parsedStudents = parseArray(record.students);
        console.log('Parsed students for course', record.id, ':', parsedStudents);
        
        const formattedCourse = {
          courseId: record.id,
          courseName: record.name,
          description: record.description,
          schoolId: record.schoolId,
          teacherId: teacherId,
          teachers: parsedTeachers,
          activeCode: record.accessCode, // Note: accessCode in CSV maps to activeCode in Firestore
          isEnabled: true,
          createdAt: formatDate(record.createdAt),
          startDate: formatDate(record.startDate),
          endDate: formatDate(record.endDate),
          subjectArea: record.subjectArea,
          published: record.published === 'true' || record.published === 'True',
          durationWeeks: parseInt(record.durationWeeks) || null,
          students: parsedStudents
        };
        
        console.log('Formatted course object:', JSON.stringify(formattedCourse));
        return formattedCourse;
      });
    }

    // Import modules as subcollections of courses
    if (importOptions.modules && csvData['modules.csv']) {
      console.log('Importing modules as course subcollections...');
      
      const modulesByCourse = {};
      csvData['modules.csv'].forEach(module => {
        if (!modulesByCourse[module.courseId]) {
          modulesByCourse[module.courseId] = [];
        }
        modulesByCourse[module.courseId].push({
          moduleId: module.id,
          moduleTitle: module.name,
          description: module.description,
          isRequired: module.required === 'true' || module.required === 'True',
          sequenceNumber: parseInt(module.sequenceNumber) || 0,
          startDate: formatDate(module.startDate),
          endDate: formatDate(module.endDate),
          durationDays: parseInt(module.durationDays) || null,
          subject: module.subject || '',
          assignments: parseArray(module.assignments)
        });
      });
      
      for (const [courseId, modules] of Object.entries(modulesByCourse)) {
        for (const module of modules) {
          const moduleRef = db.collection('courses').doc(courseId)
            .collection('modules').doc(module.moduleId);
          
          // Check if module already exists
          const moduleDoc = await moduleRef.get();
          if (!moduleDoc.exists) {
            await moduleRef.set(module);
          } else {
            console.log(`Module ${module.moduleId} already exists in course ${courseId}, skipping...`);
          }
          
          // Add delay to avoid quota issues
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Import assignments as subcollections of courses
    if (importOptions.assignments && csvData['assignments.csv']) {
      console.log('Importing assignments as course subcollections...');
      
      const assignmentsByCourse = {};
      csvData['assignments.csv'].forEach(assignment => {
        // Find the course ID for this assignment via its module
        const moduleId = assignment.moduleId;
        const courseId = findCourseIdByModuleId(moduleId, csvData['modules.csv']);
        
        if (!courseId) {
          console.log(`Could not find course for assignment ${assignment.id}, skipping...`);
          return;
        }
        
        if (!assignmentsByCourse[courseId]) {
          assignmentsByCourse[courseId] = [];
        }
        
        assignmentsByCourse[courseId].push({
          assignmentId: assignment.id,
          title: assignment.name,
          moduleId: moduleId,
          description: assignment.description,
          assignmentType: assignment.assignmentType,
          averageScore: parseFloat(assignment.averageScore) || 0,
          submissionRate: parseFloat(assignment.submissionRate) || 0,
          dueDate: formatDate(assignment.dueDate),
          assignDate: formatDate(assignment.assignDate),
          maxScore: parseFloat(assignment.maxScore) || 0,
          lateRate: parseFloat(assignment.lateRate) || 0,
          createdAt: formatDate(assignment.createdAt),
          maxAttempts: parseInt(assignment.maxAttempts) || 1,
          weight: parseFloat(assignment.weight) || 0
        });
      });
      
      for (const [courseId, assignments] of Object.entries(assignmentsByCourse)) {
        for (const assignment of assignments) {
          const assignmentRef = db.collection('courses').doc(courseId)
            .collection('assignments').doc(assignment.assignmentId);
          
          // Check if assignment already exists
          const assignmentDoc = await assignmentRef.get();
          if (!assignmentDoc.exists) {
            await assignmentRef.set(assignment);
          } else {
            console.log(`Assignment ${assignment.assignmentId} already exists in course ${courseId}, skipping...`);
          }
          
          // Add delay to avoid quota issues
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Import enrollments
    if (importOptions.enrollments && csvData['studentCourses.csv']) {
      console.log('Importing enrollments...');
      await importCollection(csvData['studentCourses.csv'], 'enrollments', record => {
        return {
          enrollmentId: `${record.studentId}_${record.courseId}`,
          studentId: record.studentId,
          courseId: record.courseId,
          classLevel: '', // Not provided in CSV
          finalScore: parseFloat(record.finalScore) || 0,
          totalTimeSpentMinutes: parseInt(record.totalTimeSpentMinutes) || 0,
          trend: record.trend || '',
          createdAt: formatDate(record.createdAt),
          updatedAt: formatDate(record.updatedAt)
        };
      });
    }

    // Import student progress
    if (importOptions.studentProgress && csvData['studentCourses.csv'] && csvData['studentAssignments.csv']) {
      console.log('Importing student progress...');
      
      // Group assignments by student and course
      const progressByStudent = {};
      
      // First, set up the basic course structure for each student
      csvData['studentCourses.csv'].forEach(enrollment => {
        const studentId = enrollment.studentId;
        const courseId = enrollment.courseId;
        
        if (!progressByStudent[studentId]) {
          progressByStudent[studentId] = {};
        }
        
        const progressMetrics = parseJsonField(enrollment.progressMetrics);
        
        progressByStudent[studentId][courseId] = {
          summary: {
            overallCompletion: progressMetrics?.overallProgressPercent || 
                              progressMetrics?.completionRate || 
                              parseFloat(enrollment.finalScore) || 0,
            overallScore: parseFloat(enrollment.finalScore) || 0,
            lastAccessed: formatDate(enrollment.updatedAt),
            totalTimeSpentMinutes: parseInt(enrollment.totalTimeSpentMinutes) || 0,
            // trend: enrollment.trend || '',
            progressMetrics: progressMetrics
          },
          modules: {},
          assignments: {}
        };
      });
      
      // Add assignment progress data
      if (csvData['studentAssignments.csv']) {
        csvData['studentAssignments.csv'].forEach(studentAssignment => {
          const studentId = studentAssignment.studentId;
          const assignmentId = studentAssignment.assignmentId;
          
          // Find the courseId for this assignment
          const assignment = csvData['assignments.csv']?.find(a => a.id === assignmentId);
          if (!assignment) return;
          
          const moduleId = assignment.moduleId;
          const courseId = findCourseIdByModuleId(moduleId, csvData['modules.csv']);
          
          if (!courseId || !progressByStudent[studentId] || !progressByStudent[studentId][courseId]) return;
          
          // Add assignment data
          progressByStudent[studentId][courseId].assignments[assignmentId] = {
            totalScore: parseFloat(studentAssignment.assessmentScore) || 0,
            totalTime: parseFloat(studentAssignment.timeSpentMinutes) || 0,
            notes: '',
            submittedAt: formatDate(studentAssignment.submissionDate),
            isLate: studentAssignment.isLate === 'true' || studentAssignment.isLate === 'True',
            status: studentAssignment.status || 'completed'
          };
          
          // Initialize module if not exists
          if (!progressByStudent[studentId][courseId].modules[moduleId]) {
            progressByStudent[studentId][courseId].modules[moduleId] = {
              totalExpertiseRate: 0,
              completion: 0,
              lastAccessed: formatDate(studentAssignment.updatedAt)
            };
          }
        });
      }

      // Add pending and future assignments
      if (csvData['pendingAssignments.csv']) {
        csvData['pendingAssignments.csv'].forEach(pendingAssignment => {
          processSpecialAssignment(pendingAssignment, progressByStudent, csvData, 'pending');
        });
      }

      if (csvData['futureAssignments.csv']) {
        csvData['futureAssignments.csv'].forEach(futureAssignment => {
          processSpecialAssignment(futureAssignment, progressByStudent, csvData, 'future');
        });
      }
      
      // Save student progress to Firestore with throttling
      let counter = 0;
      const totalStudents = Object.keys(progressByStudent).length;
      
      for (const [studentId, courses] of Object.entries(progressByStudent)) {
        counter++;
        console.log(`Processing student ${counter}/${totalStudents}: ${studentId}`);
        
        const studentProgressRef = db.collection('studentProgress').doc(studentId);
        const studentDoc = await studentProgressRef.get();
        
        if (!studentDoc.exists) {
          await studentProgressRef.set({});
        } else {
          console.log(`Student progress for ${studentId} already exists, updating...`);
        }
        
        // Add delay between students
        await new Promise(resolve => setTimeout(resolve, 500));
        
        for (const [courseId, courseData] of Object.entries(courses)) {
          const courseRef = studentProgressRef.collection('courses').doc(courseId);
          const courseDoc = await courseRef.get();
          
          if (!courseDoc.exists) {
            await courseRef.set({
              summary: courseData.summary
            });
            
            // Process modules in smaller batches
            const moduleEntries = Object.entries(courseData.modules);
            for (let i = 0; i < moduleEntries.length; i += 10) {
              const batchModules = moduleEntries.slice(i, i + 10);
              
              for (const [moduleId, moduleData] of batchModules) {
                const moduleRef = courseRef.collection('modules').doc(moduleId);
                const moduleDoc = await moduleRef.get();
                
                if (!moduleDoc.exists) {
                  await moduleRef.set(moduleData);
                }
              }
              
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // Process assignments in smaller batches
            const assignmentEntries = Object.entries(courseData.assignments);
            for (let i = 0; i < assignmentEntries.length; i += 10) {
              const batchAssignments = assignmentEntries.slice(i, i + 10);
              
              for (const [assignmentId, assignmentData] of batchAssignments) {
                const assignmentRef = courseRef.collection('assignments').doc(assignmentId);
                const assignmentDoc = await assignmentRef.get();
                
                if (!assignmentDoc.exists) {
                  await assignmentRef.set(assignmentData);
                }
              }
              
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } else {
            console.log(`Course progress for student ${studentId}, course ${courseId} already exists, skipping...`);
          }
        }
      }
    }

    console.log('Import completed successfully!');
  } catch (error) {
    console.error('Error importing data:', error);
  }
}

// Process pending or future assignments
function processSpecialAssignment(specialAssignment, progressByStudent, csvData, type) {
  const studentId = specialAssignment.studentId;
  const assignmentId = specialAssignment.assignmentId;
  
  // Find the courseId for this assignment
  const assignment = csvData['assignments.csv']?.find(a => a.id === assignmentId);
  if (!assignment) return;
  
  const moduleId = assignment.moduleId;
  const courseId = findCourseIdByModuleId(moduleId, csvData['modules.csv']);
  
  if (!courseId || !progressByStudent[studentId] || !progressByStudent[studentId][courseId]) return;
  
  // Add assignment data with status
  progressByStudent[studentId][courseId].assignments[assignmentId] = {
    totalScore: 0,
    totalTime: 0,
    notes: '',
    submittedAt: null,
    status: type,
    isAvailable: specialAssignment.isAvailable === 'true' || specialAssignment.isAvailable === 'True'
  };
}

// Helper function to import a collection with batch processing
async function importCollection(records, collectionName, formatFunction) {
  const batchSize = 250; // Reduced from 500
  
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = db.batch();
    const currentBatch = records.slice(i, i + batchSize);
    
    // Check which documents already exist
    const existChecks = await Promise.all(
      currentBatch.map(async (record) => {        const formattedRecord = formatFunction(record);        // Ensure we have a valid document ID according to the schema
        // For most collections, use the appropriate ID field as defined in the schema
        let docId;
        
        if (collectionName === 'users') {
          // For users collection, use userId as the document ID
          docId = formattedRecord.userId;
        } else if (collectionName === 'schools') {
          docId = formattedRecord.schoolId;
        } else if (collectionName === 'courses') {
          docId = formattedRecord.courseId;
        } else if (collectionName === 'enrollments') {
          docId = formattedRecord.enrollmentId;
        } else {
          // Fallback to any available ID
          docId = formattedRecord.userId || 
                 formattedRecord.schoolId || 
                 formattedRecord.studentId || 
                 formattedRecord.teacherId || 
                 formattedRecord.courseId || 
                 formattedRecord.assignmentId || 
                 formattedRecord.enrollmentId || 
                 record.id;
        }
        
        // Ensure docId is not undefined, null, or empty string
        if (!docId) {
          console.error('Error: Missing document ID for record:', formattedRecord);
          throw new Error(`Missing document ID for record in collection ${collectionName}`);
        }
        
        const docRef = db.collection(collectionName).doc(docId);
        const doc = await docRef.get();
        return {
          docRef,
          formattedRecord,
          exists: doc.exists
        };
      })
    );
    
    // Always add all documents to the batch - overwrite existing ones
    let overwriteCount = 0;
    existChecks.forEach(({ docRef, formattedRecord, exists }) => {
      batch.set(docRef, formattedRecord);
      if (exists) {
        overwriteCount++;
      }
    });
    
    try {
      await batch.commit();
      console.log(`Imported batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(records.length/batchSize)} to ${collectionName} (overwrote ${overwriteCount} existing documents)`);
      // Add delay between batches to avoid hitting quota limits
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error importing batch to ${collectionName}:`, error);
    }
  }
  
  console.log(`Successfully processed ${records.length} records for ${collectionName}`);
  return true;
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
    // For debugging
    console.log('Parsing array value:', value, 'Type:', typeof value);
    
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // Handle the specific format from CSV: "[""id1"", ""id2""]"
      if (value.includes('""')) {
        console.log('Detected special format with double quotes');
        const cleanedString = value.replace(/\[""/g, '["').replace(/""\]/g,'"]').replace(/"", ""/g, '","');
        console.log('Cleaned string:', cleanedString);
        try {
          const parsed = JSON.parse(cleanedString);
          console.log('Successfully parsed special format:', parsed);
          return parsed;
        } catch (parseErr) {
          console.warn('Error parsing special format:', parseErr);
          // Fall back to comma splitting
        }
      }
      
      if (value.trim().startsWith('[') && value.trim().endsWith(']')) {
        try {
          // Handle standard JSON array strings
          return JSON.parse(value.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
        } catch (jsonErr) {
          console.warn('Error parsing JSON array:', jsonErr, 'Value:', value);
          // Fall back to comma splitting
        }
      }
      
      // Default fallback: split by comma
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
    return [];
  } catch (e) {
    console.warn('Error parsing array:', e, 'Value:', value);
    // Fallback: Try to parse comma-separated strings
    try {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    } catch (err) {
      return [];
    }
  }
}

function parseJsonField(value) {
  if (!value) return {};
  try {
    if (typeof value === 'object') return value;
    if (typeof value === 'string') {
      return JSON.parse(value.replace(/\\"/g, '"').replace(/\\\\/g, '\\'));
    }
    return {};
  } catch (e) {
    console.warn('Error parsing JSON:', e);
    return {};
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

function findCourseIdByModuleId(moduleId, modulesData) {
  if (!moduleId || !modulesData) return null;
  const module = modulesData.find(m => m.id === moduleId);
  return module?.courseId || null;
}

// Example usage
const csvFolder = path.join(__dirname, '../data/csv');
importCsvToFirebase(csvFolder);