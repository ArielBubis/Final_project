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