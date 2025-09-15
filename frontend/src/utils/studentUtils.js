/**
 * Student utility functions for consistent student data handling across the application
 */

/**
 * Formats a student name from various possible data structures
 * Handles different naming conventions from both frontend objects and CSV imports
 * 
 * @param {Object} student - Student object with various possible name fields
 * @returns {string} Formatted student name or fallback identifier
 */
export const getStudentName = (student) => {
  if (!student) return 'Unknown Student';
  
  // Priority 1: Use 'name' field if available
  if (student.name) return student.name;
  
  // Priority 2: Combine firstName and lastName (standard frontend format)
  if (student.firstName && student.lastName) {
    return `${student.firstName} ${student.lastName}`;
  }
  
  // Priority 3: Handle CSV import fields (underscore format)
  if (student.first_name && student.last_name) {
    return `${student.first_name} ${student.last_name}`;
  }
  
  // Priority 4: Use student_name field (CSV format)
  if (student.student_name) return student.student_name;
  
  // Priority 5: Use display_name if available
  if (student.display_name) return student.display_name;
  
  // Priority 6: Try individual firstName or lastName
  if (student.firstName) return student.firstName;
  if (student.first_name) return student.first_name;
  if (student.lastName) return student.lastName;
  if (student.last_name) return student.last_name;
  
  // Fallback: Use student identifier
  const identifier = student.studentId || student.student_id || student.id;
  return identifier ? `Student ${identifier}` : 'Unknown Student';
};

/**
 * Gets student identifier (ID) from various possible fields
 * 
 * @param {Object} student - Student object
 * @returns {string|number|null} Student identifier
 */
export const getStudentId = (student) => {
  if (!student) return null;
  
  return student.studentId || 
         student.student_id || 
         student.id || 
         student.userId || 
         student.user_id || 
         null;
};

/**
 * Formats student display info combining name and identifier
 * 
 * @param {Object} student - Student object
 * @param {Object} options - Formatting options
 * @param {boolean} options.includeId - Whether to include ID in parentheses
 * @param {boolean} options.idOnly - Return only ID if name is not available
 * @returns {string} Formatted display string
 */
export const getStudentDisplayName = (student, options = {}) => {
  const { includeId = false, idOnly = false } = options;
  
  const name = getStudentName(student);
  const id = getStudentId(student);
  
  // If we only want ID when name is unavailable
  if (idOnly && (name.startsWith('Student ') || name === 'Unknown Student')) {
    return id ? String(id) : 'Unknown';
  }
  
  // Include ID in parentheses if requested and available
  if (includeId && id && !name.includes(String(id))) {
    return `${name} (${id})`;
  }
  
  return name;
};

/**
 * Creates a search-friendly string containing all student name variations
 * Useful for filtering and searching operations
 * 
 * @param {Object} student - Student object
 * @returns {string} Space-separated string of all name variations
 */
export const getStudentSearchString = (student) => {
  if (!student) return '';
  
  const searchParts = [
    student.name,
    student.firstName,
    student.lastName,
    student.first_name,
    student.last_name,
    student.student_name,
    student.display_name,
    student.email,
    student.studentId,
    student.student_id,
    student.id,
    student.userId,
    student.user_id
  ].filter(Boolean).map(part => String(part).toLowerCase());
  
  // Remove duplicates and join
  return [...new Set(searchParts)].join(' ');
};

/**
 * Helper function to calculate grade based on score
 * @param {number} score - Numeric score (0-100)
 * @returns {string} Letter grade (A, B, C, D, F)
 */
export const calculateGrade = (score) => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

/**
 * Helper function to calculate risk score with better logic
 * @param {Object} student - Student object with performance data
 * @returns {number} Risk score (0-100)
 */
export const calculateRiskScore = (student) => {
  let score = 0;
  
  // Low performance increases risk
  const avgScore = student.scores?.average || 0;
  if (avgScore < 50) score += 40;
  else if (avgScore < 60) score += 30;
  else if (avgScore < 70) score += 15;
  
  // Low completion increases risk
  const completion = student.completion || 0;
  if (completion < 30) score += 35;
  else if (completion < 50) score += 25;
  else if (completion < 70) score += 10;
  
  // Recent inactivity increases risk
  try {
    const lastAccess = new Date(student.lastAccessed || new Date());
    const daysSinceLastAccess = Math.floor((new Date() - lastAccess) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastAccess > 21) score += 25;
    else if (daysSinceLastAccess > 14) score += 20;
    else if (daysSinceLastAccess > 7) score += 10;
  } catch (e) {
    // Invalid date, add some risk
    score += 15;
  }
  
  return Math.min(score, 100); // Cap at 100
};

/**
 * Formats raw student data from Firebase into a standardized format for UI components
 * @param {Object} student - Raw student data from Firebase
 * @returns {Object} Formatted student object with consistent field names
 */
export const formatStudentForUI = (student) => {
  if (!student) return null;
  
  return {
    id: student.id || student.studentId,
    name: getStudentName(student),
    firstName: student.firstName || 'Unknown',
    lastName: student.lastName || 'Student',
    email: student.email || '',
    grade: calculateGrade(student.scores?.average || 0),
    // Remove the hardcoded attendance default - let UI handle null values
    attendance: student.attendance ? Math.round(student.attendance) : null,
    lastActive: student.lastAccessed || new Date().toISOString(),
    performance: Math.round(student.scores?.average || 0),
    completion: Math.round(student.completion || 0),
    scores: student.scores || { average: 0 },
    riskScore: calculateRiskScore(student),
    courses: student.courses || [],
    // Pass through additional fields that might be needed
    gradeLevel: student.gradeLevel,
    schoolId: student.schoolId,
    schoolName: student.schoolName,
    courseCount: student.courseCount,
    totalTimeSpent: student.totalTimeSpent
  };
};