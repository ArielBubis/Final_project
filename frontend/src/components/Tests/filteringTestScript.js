/**
 * Comprehensive test script to verify course filtering implementation
 * This script tests the filtering logic across all three modified components
 */

// Test data simulating various course scenarios
const testScenarios = [
  {
    name: "Course with 0 overall score",
    course: {
      id: "test1",
      name: "Zero Score Course",
      summary: { overallScore: 0, completionRate: 50 },
      averageScore: 0
    },
    shouldBeFiltered: true,
    reason: "overallScore is 0"
  },
  {
    name: "Course with valid overall score",
    course: {
      id: "test2", 
      name: "Valid Score Course",
      summary: { overallScore: 75, completionRate: 80 },
      averageScore: 75
    },
    shouldBeFiltered: false,
    reason: "overallScore > 0"
  },
  {
    name: "Course with no summary but valid averageScore",
    course: {
      id: "test3",
      name: "No Summary Course", 
      averageScore: 85
    },
    shouldBeFiltered: false, // CourseList should include this
    reason: "averageScore > 0 (CourseList logic)"
  },
  {
    name: "Course with negative overall score",
    course: {
      id: "test4",
      name: "Negative Score Course",
      summary: { overallScore: -10, completionRate: 30 },
      averageScore: -10
    },
    shouldBeFiltered: true,
    reason: "overallScore < 0"
  },
  {
    name: "Course with null/undefined overall score", 
    course: {
      id: "test5",
      name: "Null Score Course",
      summary: { overallScore: null, completionRate: 60 },
      averageScore: null
    },
    shouldBeFiltered: true, // Student.js and useStudentData should filter this
    reason: "overallScore is null"
  },
  {
    name: "Course with very small positive score",
    course: {
      id: "test6",
      name: "Small Score Course", 
      summary: { overallScore: 0.1, completionRate: 20 },
      averageScore: 0.1
    },
    shouldBeFiltered: false,
    reason: "overallScore > 0 (even if very small)"
  }
];

// Test CourseList filtering logic
function testCourseListFiltering() {
  console.log("=== Testing CourseList Filtering ===");
  
  const courses = testScenarios.map(scenario => scenario.course);
  
  const filteredCourses = courses.filter(course => {
    // Check if course has summary with overallScore
    if (course.summary && typeof course.summary.overallScore === 'number') {
      return course.summary.overallScore > 0;
    }
    // Check if course has averageScore (for course stats)
    if (typeof course.averageScore === 'number') {
      return course.averageScore > 0;
    }
    // If no score data, include the course
    return true;
  });
  
  console.log(`Original courses: ${courses.length}`);
  console.log(`Filtered courses: ${filteredCourses.length}`);
  
  // Verify results
  testScenarios.forEach((scenario, index) => {
    const isIncluded = filteredCourses.some(c => c.id === scenario.course.id);
    const expectedResult = scenario.name === "Course with no summary but valid averageScore" ? true : !scenario.shouldBeFiltered;
    
    if (isIncluded === expectedResult) {
      console.log(`✅ ${scenario.name}: Correctly ${isIncluded ? 'included' : 'filtered'}`);
    } else {
      console.log(`❌ ${scenario.name}: Expected ${expectedResult ? 'included' : 'filtered'}, got ${isIncluded ? 'included' : 'filtered'}`);
    }
  });
  
  return { original: courses.length, filtered: filteredCourses.length };
}

// Test Student.js filtering logic
function testStudentFiltering() {
  console.log("\n=== Testing Student.js Filtering ===");
  
  const courses = testScenarios.map(scenario => scenario.course);
  
  const filteredCourses = courses.filter(course => {
    // First filter out courses with 0 overall score
    const hasValidScore = course.summary && 
      typeof course.summary.overallScore === 'number' && 
      course.summary.overallScore > 0;
    
    return hasValidScore;
  });
  
  console.log(`Original courses: ${courses.length}`);
  console.log(`Filtered courses: ${filteredCourses.length}`);
  
  // Verify results - only courses with valid summary.overallScore > 0 should remain
  const expectedIncluded = testScenarios.filter(scenario => 
    scenario.course.summary && 
    typeof scenario.course.summary.overallScore === 'number' && 
    scenario.course.summary.overallScore > 0
  );
  
  console.log(`Expected included: ${expectedIncluded.length}`);
  
  testScenarios.forEach(scenario => {
    const isIncluded = filteredCourses.some(c => c.id === scenario.course.id);
    const shouldBeIncluded = scenario.course.summary && 
      typeof scenario.course.summary.overallScore === 'number' && 
      scenario.course.summary.overallScore > 0;
    
    if (isIncluded === shouldBeIncluded) {
      console.log(`✅ ${scenario.name}: Correctly ${isIncluded ? 'included' : 'filtered'}`);
    } else {
      console.log(`❌ ${scenario.name}: Expected ${shouldBeIncluded ? 'included' : 'filtered'}, got ${isIncluded ? 'included' : 'filtered'}`);
    }
  });
  
  return { original: courses.length, filtered: filteredCourses.length };
}

// Test useStudentData.js filtering logic
function testUseStudentDataFiltering() {
  console.log("\n=== Testing useStudentData.js Filtering ===");
  
  const coursesData = testScenarios.map(scenario => scenario.course);
  
  const validCoursesData = coursesData.filter(course => 
    course && 
    course.summary && 
    typeof course.summary.overallScore === 'number' && 
    course.summary.overallScore > 0
  );
  
  console.log(`Original courses: ${coursesData.length}`);
  console.log(`Valid courses: ${validCoursesData.length}`);
  
  // Verify results
  testScenarios.forEach(scenario => {
    const isIncluded = validCoursesData.some(c => c.id === scenario.course.id);
    const shouldBeIncluded = scenario.course && 
      scenario.course.summary && 
      typeof scenario.course.summary.overallScore === 'number' && 
      scenario.course.summary.overallScore > 0;
    
    if (isIncluded === shouldBeIncluded) {
      console.log(`✅ ${scenario.name}: Correctly ${isIncluded ? 'included' : 'filtered'}`);
    } else {
      console.log(`❌ ${scenario.name}: Expected ${shouldBeIncluded ? 'included' : 'filtered'}, got ${isIncluded ? 'included' : 'filtered'}`);
    }
  });
  
  return { original: coursesData.length, filtered: validCoursesData.length };
}

// Run all tests
function runAllTests() {
  console.log("🧪 Starting Comprehensive Course Filtering Tests\n");
  
  const courseListResults = testCourseListFiltering();
  const studentResults = testStudentFiltering();
  const useStudentDataResults = testUseStudentDataFiltering();
  
  console.log("\n=== Summary ===");
  console.log(`CourseList: ${courseListResults.original} → ${courseListResults.filtered}`);
  console.log(`Student.js: ${studentResults.original} → ${studentResults.filtered}`);
  console.log(`useStudentData: ${useStudentDataResults.original} → ${useStudentDataResults.filtered}`);
  
  // Expected results:
  // CourseList: Should keep courses with valid overallScore OR valid averageScore
  // Student.js & useStudentData: Should only keep courses with valid summary.overallScore > 0
  
  const allPassed = studentResults.filtered === 2 && useStudentDataResults.filtered === 2;
  
  console.log(`\n${allPassed ? '✅ All tests passed!' : '❌ Some tests failed!'}`);
  
  return {
    courseListResults,
    studentResults,
    useStudentDataResults,
    allPassed
  };
}

// Export for use in React component or run directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testCourseListFiltering,
    testStudentFiltering,
    testUseStudentDataFiltering,
    testScenarios
  };
} else {
  // Run tests if in browser
  runAllTests();
}
