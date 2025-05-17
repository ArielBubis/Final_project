// import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import { useAuth } from '../../contexts/AuthContext';
// import { useData } from '../../contexts/DataContext';
// import { usePerformance } from '../../contexts/PerformanceContext';
// import { Card as AntCard, Row, Col, Table, Spin, Progress, Empty, Alert, Select, Tag, Badge, Tooltip as AntTooltip, Tabs, Statistic } from 'antd';
// import { 
//   BarChart, 
//   Bar, 
//   LineChart,
//   Line,
//   XAxis, 
//   YAxis, 
//   CartesianGrid, 
//   Tooltip, 
//   ResponsiveContainer,
//   PieChart,
//   Pie,
//   Cell,
//   Legend,
//   RadarChart as RechartsRadarChart,
//   PolarGrid,
//   PolarAngleAxis,
//   PolarRadiusAxis,
//   Radar
// } from 'recharts';
// import styles from '../../styles/modules/Reports.module.css';
// import { calculateAverage, generateGradeDistribution, generateRadarChartData } from '../../utils/dataProcessingUtils';
// import RadarChart from '../Visualization/RadarChart';
// import PerformanceMetricsLegend from '../Visualization/PerformanceMetricsLegend';

// const { Option } = Select;

// const TeacherOverview = ({ isAdminView = false }) => {
//   // Contexts
//   const { currentUser } = useAuth();
//   const { 
//     fetchTeacherCourses, 
//     fetchStudentsByTeacher, 
//     fetchCourseStats,
//     fetchStudentAssignments,
//     fetchModuleProgress,
//     loading: dataLoading, 
//     error: dataError 
//   } = useData();
//   const {
//     getTeacherAnalytics,
//     getStudentCoursePerformance,
//     loading: performanceLoading,
//     error: performanceError
//   } = usePerformance();
  
//   // State
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [studentDisplayCount, setStudentDisplayCount] = useState(10);
//   const [activeTab, setActiveTab] = useState('overview');
//   const [allStudents, setAllStudents] = useState([]);
//   const [selectedStudent, setSelectedStudent] = useState(null);
//   const [selectedTimePeriod, setSelectedTimePeriod] = useState('month');
//   const [showClassAverage, setShowClassAverage] = useState(false);
//   const [currentPage, setCurrentPage] = useState(1);
//   const [pageSize, setPageSize] = useState(10);
//   const [totalStudents, setTotalStudents] = useState(0);
//   const [overviewData, setOverviewData] = useState({
//     totalCourses: 0,
//     totalStudents: 0,
//     averageCompletion: 0,
//     coursesData: [],
//     recentActivity: [],
//     studentPerformance: [],
//     gradeDistribution: [],
//     assignmentCompletionData: [],
//     courseComparisonData: [],
//     timeSeriesData: [],
//     atRiskStudents: [],
//     individualStudentData: [],
//     studentActivityData: []
//   });
//   const [selectedTeacher, setSelectedTeacher] = useState(null);
//   const [teachers] = useState([]);

//   // Colors for charts
//   const COLORS = useMemo(() => [
//     '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
//     '#8884d8', '#82CA9D', '#8DD1E1', '#A4DE6C'
//   ], []);
  
//   // Custom pie chart label
//   const renderCustomizedPieLabel = useMemo(() => {
//     return ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
//       const RADIAN = Math.PI / 180;
//       const radius = innerRadius + (outerRadius - innerRadius) * 1.1;
//       const x = cx + radius * Math.cos(-midAngle * RADIAN);
//       const y = cy + radius * Math.sin(-midAngle * RADIAN);

//       if (percent > 0.05) {
//         return (
//           <text 
//             x={x} 
//             y={y} 
//             fill={COLORS[index % COLORS.length]}
//             textAnchor={x > cx ? 'start' : 'end'} 
//             dominantBaseline="central"
//           >
//             {`${name}: ${(percent * 100).toFixed(0)}%`}
//           </text>
//         );
//       }
//       return null;
//     };
//   }, [COLORS]);
  
//   // Main effect to load dashboard data
//   useEffect(() => {
//     if (!currentUser?.email) return;
    
//     let isMounted = true;
//       const loadDashboardData = async () => {
//       try {
//         setLoading(true);
//         setError(null);
        
//         let teacherId;
        
//         if (isAdminView) {
//           if (selectedTeacher) {
//             teacherId = selectedTeacher.id;
//           } else {
//             setLoading(false);
//             return;
//           }
//         } else {
//           teacherId = currentUser.email;
//         }

//         // Fetch teacher courses
//         const teacherCourses = await fetchTeacherCourses(teacherId);
//         if (!teacherCourses || teacherCourses.length === 0) {
//           if (isMounted) {
//             setLoading(false);
//             setError("No courses found for this teacher");
//           }
//           return;
//         }

//         // Fetch students by teacher (already uses batching internally)
//         const studentsData = await fetchStudentsByTeacher(teacherId);
        
//         // Update total students count for pagination
//         setTotalStudents(studentsData.length);
        
//         // Fetch course statistics for each course
//         const courseStatsPromises = teacherCourses.map(course => 
//           fetchCourseStats(course.id || course.courseId));
//         const coursesStats = await Promise.all(courseStatsPromises);

//         // Get teacher analytics
//         const teacherAnalytics = await getTeacherAnalytics(teacherId);

//         if (!isMounted) return;

//         // OPTIMIZATION: Batch fetch assignments for all students at once
//         // First collect all student IDs
//         const studentIds = studentsData.map(student => student.id);
        
//         // Create a map to store assignments by student ID
//         const assignmentsByStudentId = new Map();
        
//         // Optimize by fetching assignments in chunks to avoid hitting query limits
//         const chunkSize = 10; // Process 10 students at a time
//         for (let i = 0; i < studentIds.length; i += chunkSize) {
//           const studentChunk = studentIds.slice(i, i + chunkSize);
          
//           // Process this chunk of students in parallel
//           await Promise.all(studentChunk.map(async (studentId) => {
//             // Fetch assignments for this student and store in the map
//             const assignments = await fetchStudentAssignments(studentId);
//             assignmentsByStudentId.set(studentId, assignments);
//           }));
//         }

//         // Now process the student data with the pre-fetched assignments
//         const enhancedStudentsData = studentsData.map(student => {
//           // Get pre-fetched assignments for this student
//           const assignments = assignmentsByStudentId.get(student.id) || [];
          
//           // Calculate student metrics
//           const totalScore = assignments.reduce((sum, assignment) => 
//             sum + (assignment.score || 0), 0);
//           const avgScore = assignments.length > 0 ? totalScore / assignments.length : 0;
          
//           const submittedAssignments = assignments.filter(a => a.submitted);
//           const submissionRate = assignments.length > 0 ? 
//             (submittedAssignments.length / assignments.length) * 100 : 0;
          
//           const lateSubmissions = submittedAssignments.filter(a => {
//             if (!a.submissionDate || !a.dueDate) return false;
//             return new Date(a.submissionDate) > new Date(a.dueDate);
//           });
          
//           const lastAccessed = student.lastAccessed || null;
//           const daysSinceLastAccess = lastAccessed ? 
//             Math.floor((new Date() - new Date(lastAccessed)) / (1000 * 60 * 60 * 24)) : 
//             null;

//           return {
//             ...student,
//             student: `${student.firstName} ${student.lastName}`,
//             score: avgScore,
//             submissionRate,
//             lateSubmissions: lateSubmissions.length,
//             timeSpent: assignments.reduce((sum, a) => sum + (a.totalTime || 0), 0),
//             missingAssignments: assignments.filter(a => !a.submitted).length,
//             daysSinceLastAccess,
//             trend: calculateTrend(assignments),
//             assignments // Store assignments with the student data to avoid refetching later
//           };
//         });

//         // Calculate risk status
//         enhancedStudentsData.forEach(student => {
//           student.risk = student.missingAssignments > 3 || 
//                         (student.daysSinceLastAccess && student.daysSinceLastAccess > 14) || 
//                         student.trend < 0;
//         });

//         // Format courses data for visualization
//         const coursesData = coursesStats.map(course => ({
//           name: course.courseName || 'Unnamed Course',
//           courseId: course.courseId,
//           students: course.studentCount || 0,
//           completion: course.averageCompletion || 0,
//           averageScore: course.averageScore || 0,
//           submissionRate: course.activeRatio30Days ? course.activeRatio30Days * 100 : 0
//         }));

//         // Get at-risk students
//         const atRiskStudents = enhancedStudentsData
//           .filter(s => s.risk)
//           .sort((a, b) => b.missingAssignments - a.missingAssignments);

//         // Generate grade distribution
//         const gradeDistribution = generateGradeDistribution(enhancedStudentsData);

//         // Generate time series data from real data
//         const timeSeriesData = await generateTimeSeriesData(teacherCourses, enhancedStudentsData);        // Optimize radar chart data generation by chunking student data processing
//         // to avoid too many concurrent API calls
//         const individualStudentData = [];
//         const performanceChunkSize = 5; // Process 5 students at a time
//           for (let i = 0; i < enhancedStudentsData.length; i += performanceChunkSize) {
//           const studentChunk = enhancedStudentsData.slice(i, i + performanceChunkSize);
          
//           // Process this chunk of students
//           const chunkResults = await Promise.all(studentChunk.map(async student => {
//             // Batch fetch all course performances for this student
//             const studentCourses = await Promise.all(
//               teacherCourses.map(async course => {
//                 const coursePerformance = await getStudentCoursePerformance(student.id, course.id);
//                 return {
//                   courseId: course.id,
//                   courseName: course.courseName,
//                   performance: coursePerformance
//                 };
//               })
//             );

//             const radarData = generateRadarChartData(student, {
//               completion: calculateAverage(studentCourses.map(c => c.performance?.completion || 0)),
//               score: calculateAverage(studentCourses.map(c => c.performance?.score || 0)),
//               submissionRate: calculateAverage(studentCourses.map(c => c.performance?.submissionRate || 0)),
//               expertiseRate: calculateAverage(studentCourses.map(c => c.performance?.expertiseRate || 0)),
//               timeSpent: calculateAverage(studentCourses.map(c => c.performance?.timeSpent || 0))
//             });

//             return {
//               id: student.id,
//               studentId: student.studentId,
//               name: student.student,
//               radarData
//             };
//           }));
          
//           // Add results to the main array
//           individualStudentData.push(...chunkResults);
//         }        // Generate student activity data (optimized to use pre-fetched assignments)
//         const studentActivityData = generateStudentActivityData(enhancedStudentsData, teacherCourses);

//         if (isMounted) {
//           // Store all students data for pagination
//           setAllStudents(enhancedStudentsData);
          
//           // Calculate pagination indexes
//           const startIndex = (currentPage - 1) * pageSize;
//           const endIndex = Math.min(startIndex + pageSize, enhancedStudentsData.length);
          
//           // Get the current page of student data
//           const paginatedStudents = enhancedStudentsData.slice(startIndex, endIndex);
          
//           setOverviewData({
//             totalCourses: teacherCourses.length,
//             totalStudents: studentsData.length,
//             averageCompletion: calculateAverage(studentsData.map(s => s.completion || 0)),
//             coursesData,
//             recentActivity: [], // This would need real data
//             studentPerformance: paginatedStudents,
//             gradeDistribution,
//             assignmentCompletionData: [], // This would need real data
//             courseComparisonData: coursesData,
//             timeSeriesData,
//             atRiskStudents,
//             individualStudentData,
//             studentActivityData
//           });

//           if (enhancedStudentsData.length > 0 && !selectedStudent) {
//             setSelectedStudent(enhancedStudentsData[0]);
//           }
//         }
//       } catch (error) {
//         console.error("Error loading dashboard data:", error);
//         if (isMounted) {
//           setError(`Failed to load dashboard data: ${error.message}`);
//         }
//       } finally {
//         if (isMounted) {
//           setLoading(false);
//         }
//       }
//     };

//     loadDashboardData();

//     return () => {
//       isMounted = false;
//     };
//   }, [    currentUser, 
//     isAdminView, 
//     selectedTeacher, 
//     fetchTeacherCourses,
//     fetchStudentsByTeacher,
//     fetchCourseStats,
//     fetchStudentAssignments,
//     getTeacherAnalytics,
//     getStudentCoursePerformance,
//     studentDisplayCount,
//     selectedStudent,
//     currentPage,
//     pageSize
//   ]);

//   // Handler for pagination change
//   const handlePageChange = useCallback((page, size) => {
//     setCurrentPage(page);
//     setPageSize(size);
//   }, []);

//   // Helper function to calculate trend
//   const calculateTrend = (assignments) => {
//     if (!assignments.length) return 0;
    
//     const sortedAssignments = [...assignments]
//       .filter(a => a.submitted && a.score !== null)
//       .sort((a, b) => new Date(a.submissionDate) - new Date(b.submissionDate));
    
//     if (sortedAssignments.length < 2) return 0;
    
//     const recentAssignments = sortedAssignments.slice(-3);
//     const scores = recentAssignments.map(a => a.score);
    
//     // Calculate if scores are improving (1), declining (-1), or stable (0)
//     const trend = scores.reduce((acc, score, i) => {
//       if (i === 0) return acc;
//       return acc + (score > scores[i - 1] ? 1 : score < scores[i - 1] ? -1 : 0);
//     }, 0);
    
//     return trend > 0 ? 1 : trend < 0 ? -1 : 0;
//   };
//   // Helper function to generate time series data
//   // Optimized to use pre-fetched assignments
//   const generateTimeSeriesData = (courses, students) => {
//     const timeSeriesData = [];
//     const today = new Date();
    
//     // Get data for the last 7 weeks
//     for (let i = 6; i >= 0; i--) {
//       const date = new Date(today);
//       date.setDate(today.getDate() - i * 7);
      
//       // Calculate average score for this week
//       const weekStart = new Date(date);
//       weekStart.setDate(date.getDate() - 7);
      
//       const weekScores = students.flatMap(student => 
//         (student.assignments || [])
//           .filter(a => {
//             const submissionDate = new Date(a.submissionDate);
//             return submissionDate >= weekStart && submissionDate <= date;
//           })
//           .map(a => a.score) || []
//       );
      
//       const averageScore = weekScores.length > 0 ?
//         weekScores.reduce((sum, score) => sum + score, 0) / weekScores.length :
//         0;
      
//       timeSeriesData.push({
//         date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
//         averageScore: Math.round(averageScore)
//       });
//     }
    
//     return timeSeriesData;
//   };
//   // Helper function to generate student activity data
//   // Optimized to use pre-fetched assignments stored in the student objects
//   const generateStudentActivityData = (students, courses) => {
//     console.log('Generating student activity data for:', {
//       studentCount: students.length,
//       courseCount: courses.length
//     });

//     const activityData = {};
    
//     students.forEach(student => {
//       console.log(`Processing student: ${student.id} (${student.firstName} ${student.lastName})`);
//       const activities = [];
      
//       // Get assignments for each course from the pre-fetched assignments
//       for (const course of courses) {
//         console.log(`Processing assignments for course: ${course.courseName} (${course.id})`);
        
//         // Use the pre-fetched assignments stored in the student object
//         const courseAssignments = (student.assignments || []).filter(a => a.courseId === course.id);
//         console.log(`Found ${courseAssignments.length} assignments for course ${course.courseName}`);
        
//         // Add submission events with scores
//         courseAssignments.forEach(assignment => {
//           if (assignment.submitted) {
//             activities.push({
//               id: `submission-${assignment.id}`,
//               type: 'submission',
//               timestamp: new Date(assignment.submissionDate),
//               course: course.courseName,
//               module: assignment.moduleId,
//               title: assignment.title,
//               score: assignment.score,
//               maxScore: assignment.maxScore,
//               isScored: assignment.score !== null,
//               isLate: new Date(assignment.submissionDate) > new Date(assignment.dueDate)
//             });
//           }
//         });
//       }
      
//       // Sort activities by timestamp
//       activities.sort((a, b) => a.timestamp - b.timestamp);
//       console.log(`Total activities found for student ${student.id}: ${activities.length}`);
      
//       activityData[student.id] = activities;
//     });
    
//     console.log('Final activity data summary:', {
//       studentIds: Object.keys(activityData),
//       totalActivities: Object.values(activityData).reduce((sum, activities) => sum + activities.length, 0)
//     });
    
//     return activityData;
//   };
  
//   // Update student performance data when display count or pagination changes
//   useEffect(() => {
//     if (allStudents.length > 0) {
//       // Calculate pagination indexes
//       const startIndex = (currentPage - 1) * pageSize;
//       const endIndex = Math.min(startIndex + pageSize, allStudents.length);
      
//       // Get the current page of student data
//       const paginatedStudents = allStudents.slice(startIndex, endIndex);
      
//       setOverviewData(prevData => ({
//         ...prevData,
//         studentPerformance: paginatedStudents
//       }));
//     }
//   }, [currentPage, pageSize, allStudents]);

//   // Memoized handler for teacher selection change
//   const handleTeacherChange = useCallback((teacherId) => {
//     if (teacherId === 'all') {
//       setSelectedTeacher(null);
//     } else {
//       const teacher = teachers.find(t => t.id === teacherId);
//       setSelectedTeacher(teacher);
//     }
//   }, [teachers]);
  
//   // Handler for student selection change
//   const handleStudentChange = useCallback((studentId) => {
//     const student = allStudents.find(s => s.id === studentId);
//     setSelectedStudent(student || null);
//   }, [allStudents]);
  
//   // Handler for time period selection change
//   const handleTimePeriodChange = useCallback((period) => {
//     setSelectedTimePeriod(period);
//   }, []);
  
//   // Handler for toggling class average in student performance chart
//   const toggleClassAverage = useCallback(() => {
//     setShowClassAverage(prev => !prev);
//   }, []);

//   // Loading and error states
//   if (loading || dataLoading) {
//     return <Spin size="large" tip="Loading dashboard data..." />;
//   }

//   if (error || dataError) {
//     return <Alert message="Error" description={error || dataError} type="error" showIcon />;
//   }

//   // Generate completion distribution data
//   const completionDistribution = [
//     { name: '0-25%', value: 0 },
//     { name: '26-50%', value: 0 },
//     { name: '51-75%', value: 0 },
//     { name: '76-100%', value: 0 }
//   ];

//   overviewData.studentPerformance.forEach(student => {
//     const completion = student.completion;
//     if (completion <= 25) completionDistribution[0].value++;
//     else if (completion <= 50) completionDistribution[1].value++;
//     else if (completion <= 75) completionDistribution[2].value++;
//     else completionDistribution[3].value++;
//   });

//   // Format metrics for the Performance Metrics Legend component
//   const performanceMetrics = selectedStudent ? [
//     { name: 'Overall Score', value: selectedStudent.score || 0 },
//     { name: 'Completion Rate', value: selectedStudent.completion || 0 },
//     { name: 'Submission Rate', value: selectedStudent.submissionRate || 0 },
//     { name: 'Expertise Rate', value: selectedStudent.expertiseRate || 0 }
//   ] : [];

//   // Set up the tab items
//   const items = [
//     {
//       key: 'overview',
//       label: 'Overview',
//       children: (
//         <>
//           {/* Teacher selector for admins */}
//           {isAdminView && (
//             <div className={styles.teacherSelector}>
//               <Select
//                 placeholder="Select teacher to view"
//                 style={{ width: 300, marginBottom: 16 }}
//                 onChange={handleTeacherChange}
//                 defaultValue="all"
//               >
//                 <Option value="all">All Teachers (System Overview)</Option>
//                 {teachers.map(teacher => (
//                   <Option key={teacher.id} value={teacher.id}>
//                     {teacher.firstName} {teacher.lastName} ({teacher.courseCount} courses)
//                   </Option>
//                 ))}
//               </Select>
//             </div>
//           )}
          
//           {/* Overview Section */}
//           <Row gutter={[16, 16]} className={styles.overviewMetrics}>
//             <Col xs={24} sm={12} md={8}>
//               <AntCard title="Active Courses" className={styles.metricCard}>
//                 <h2>{overviewData.totalCourses}</h2>
//               </AntCard>
//             </Col>
//             <Col xs={24} sm={12} md={8}>
//               <AntCard title="Total Students" className={styles.metricCard}>
//                 <h2>{overviewData.totalStudents}</h2>
//               </AntCard>
//             </Col>
//             <Col xs={24} sm={12} md={8}>
//               <AntCard title="Course Completion Rate" className={styles.metricCard}>
//                 <Progress 
//                   type="circle" 
//                   percent={Math.round(overviewData.averageCompletion)} 
//                   width={80}
//                 />
//               </AntCard>
//             </Col>
//           </Row>
          
//           {/* Performance Overview */}
//           <Row gutter={[16, 16]} className={styles.insightSection}>
//             <Col xs={24} md={12}>
//               <AntCard title="Grade Distribution" className={styles.chartCard}>
//                 {overviewData.gradeDistribution.length > 0 ? (
//                   <ResponsiveContainer width="100%" height={250}>
//                     <BarChart data={overviewData.gradeDistribution}>
//                       <CartesianGrid strokeDasharray="3 3" />
//                       <XAxis dataKey="grade" />
//                       <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
//                       <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
//                       <Tooltip />
//                       <Legend />
//                       <Bar yAxisId="left" dataKey="count" name="Number of Students" fill="#8884d8" />
//                       <Bar yAxisId="right" dataKey="percentage" name="Percentage" fill="#82ca9d" />
//                     </BarChart>
//                   </ResponsiveContainer>
//                 ) : (
//                   <Empty description="No grade distribution data available" />
//                 )}
//               </AntCard>
//             </Col>
            
//             <Col xs={24} md={12}>
//               <AntCard title="Score Trends Over Time" className={styles.chartCard}>
//                 {overviewData.timeSeriesData.length > 0 ? (
//                   <ResponsiveContainer width="100%" height={250}>
//                     <LineChart data={overviewData.timeSeriesData}>
//                       <CartesianGrid strokeDasharray="3 3" />
//                       <XAxis dataKey="date" />
//                       <YAxis />
//                       <Tooltip />
//                       <Legend />
//                       <Line 
//                         type="monotone" 
//                         dataKey="averageScore" 
//                         stroke="#8884d8" 
//                         activeDot={{ r: 8 }}
//                         name="Average Score"
//                       />
//                     </LineChart>
//                   </ResponsiveContainer>
//                 ) : (
//                   <Empty description="No time series data available" />
//                 )}
//               </AntCard>
//             </Col>
//           </Row>
//         </>
//       ),
//     },
//     {
//       key: 'individual-performance',
//       label: 'Individual Student Performance',
//       children: (
//         <>
//           {/* Student selector and filters */}
//           <Row gutter={[16, 16]} className={styles.filterControls}>
//             <Col xs={24} md={12}>
//               <AntCard title="Student Selection" className={styles.controlCard}>
//                 <Select
//                   placeholder="Select student"
//                   style={{ width: '100%', marginBottom: 16 }}
//                   onChange={handleStudentChange}
//                   value={selectedStudent?.id}
//                 >
//                   {allStudents.map(student => (
//                     <Option key={student.id} value={student.id}>
//                       {student.student}
//                     </Option>
//                   ))}
//                 </Select>
//               </AntCard>
//             </Col>
//             <Col xs={24} md={12}>
//               <AntCard title="Performance Controls" className={styles.controlCard}>
//                 <Row gutter={[16, 16]}>
//                   <Col span={12}>
//                     <Select
//                       value={selectedTimePeriod}
//                       onChange={handleTimePeriodChange}
//                       style={{ width: '100%' }}
//                     >
//                       <Option value="week">Last Week</Option>
//                       <Option value="month">Last Month</Option>
//                       <Option value="quarter">Last Quarter</Option>
//                       <Option value="year">Last Year</Option>
//                     </Select>
//                   </Col>
//                   <Col span={12}>
//                     <button 
//                       onClick={toggleClassAverage} 
//                       className={`${styles.toggleButton} ${showClassAverage ? styles.active : ''}`}
//                       style={{ 
//                         padding: '5px 10px', 
//                         border: '1px solid #d9d9d9', 
//                         borderRadius: '2px',
//                         background: showClassAverage ? '#1890ff' : 'white',
//                         color: showClassAverage ? 'white' : 'rgba(0,0,0,0.85)',
//                         cursor: 'pointer',
//                         width: '100%'
//                       }}
//                     >
//                       {showClassAverage ? 'Hide Class Average' : 'Show Class Average'}
//                     </button>
//                   </Col>
//                 </Row>
//               </AntCard>
//             </Col>
//           </Row>

//           {/* A. Student Progress Overview Section */}
//           <Row gutter={[16, 16]} className={styles.performanceSection}>
//             <Col xs={24} md={24} lg={12}>
//               <AntCard title="Student Progress Overview" className={styles.chartCard}>
//                 {selectedStudent && overviewData.individualStudentData.length > 0 ? (
//                   <Row gutter={[16, 16]} align="middle">
//                     <Col xs={24} md={12}>
//                       {/* Use our new RadarChart component */}
//                       <RadarChart 
//                         data={overviewData.individualStudentData.find(s => s.id === selectedStudent.id)?.radarData || []}
//                         width={400}
//                         height={400}
//                         showLegend={showClassAverage}
//                         title={`${selectedStudent.student}'s Performance`}
//                       />
//                     </Col>
//                     <Col xs={24} md={12}>
//                       {/* Use our new PerformanceMetricsLegend component */}
//                       <PerformanceMetricsLegend 
//                         metrics={performanceMetrics}
//                         showComparison={showClassAverage}
//                       />
//                     </Col>
//                   </Row>
//                 ) : (
//                   <Empty description="No student data available" />
//                 )}
//               </AntCard>
//             </Col>
            
//             {/* B. Student Activity Timeline Section */}
//             <Col xs={24} md={24} lg={12}>
//               <AntCard title="Student Activity Timeline" className={styles.chartCard}>
//                 {selectedStudent && overviewData.studentActivityData[selectedStudent.id]?.length > 0 ? (
//                   <div className={styles.timelineContainer} style={{ height: '400px', overflowY: 'auto' }}>
//                     {overviewData.studentActivityData[selectedStudent.id]
//                       .filter(activity => {
//                         // Filter based on selected time period
//                         const now = new Date();
//                         const activityDate = activity.timestamp;
//                         if (selectedTimePeriod === 'week') {
//                           return now - activityDate <= 7 * 24 * 60 * 60 * 1000;
//                         } else if (selectedTimePeriod === 'month') {
//                           return now - activityDate <= 30 * 24 * 60 * 60 * 1000;
//                         } else if (selectedTimePeriod === 'quarter') {
//                           return now - activityDate <= 90 * 24 * 60 * 60 * 1000;
//                         } else {
//                           return now - activityDate <= 365 * 24 * 60 * 60 * 1000;
//                         }
//                       })
//                       .map((activity, index) => (
//                         <div 
//                           key={activity.id} 
//                           className={styles.timelineItem}
//                           style={{
//                             display: 'flex',
//                             margin: '10px 0',
//                             borderLeft: '3px solid',
//                             borderLeftColor: activity.isScored ? 
//                               (activity.score >= 70 ? '#52c41a' : 
//                                activity.score >= 50 ? '#faad14' : '#ff4d4f') : 
//                               '#1890ff',
//                             paddingLeft: '15px',
//                             position: 'relative'
//                           }}
//                         >
//                           <div 
//                             className={styles.timelineDot}
//                             style={{
//                               width: '12px',
//                               height: '12px',
//                               borderRadius: '50%',
//                               background: activity.isScored ? 
//                                 (activity.score >= 70 ? '#52c41a' : 
//                                  activity.score >= 50 ? '#faad14' : '#ff4d4f') : 
//                                 '#1890ff',
//                               position: 'absolute',
//                               left: '-7px',
//                               top: '5px'
//                             }}
//                           />
//                           <div className={styles.timelineContent} style={{ width: '100%' }}>
//                             <div className={styles.timelineHeader} style={{ display: 'flex', justifyContent: 'space-between' }}>
//                               <strong>
//                                 {activity.title}
//                               </strong>
//                               <span>{activity.timestamp.toLocaleDateString()} {activity.timestamp.toLocaleTimeString()}</span>
//                             </div>
//                             <div className={styles.timelineDetails}>
//                               <p>Course: {activity.course}</p>
//                               <p>Module: {activity.module}</p>
//                               {activity.isScored ? (
//                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
//                                   <span>Score: </span>
//                                   <Tag color={
//                                     activity.score >= 70 ? 'success' : 
//                                     activity.score >= 50 ? 'warning' : 'error'
//                                   }>
//                                     {activity.score}/{activity.maxScore}
//                                   </Tag>
//                                 </div>
//                               ) : (
//                                 <Tag color="processing">Pending Review</Tag>
//                               )}
//                               {activity.isLate && (
//                                 <Tag color="error" style={{ marginLeft: '8px' }}>Late Submission</Tag>
//                               )}
//                             </div>
//                           </div>
//                         </div>
//                       ))}
//                   </div>
//                 ) : (
//                   <Empty description="No submission data available" />
//                 )}
//                 <div className={styles.timelineControls} style={{ marginTop: '16px' }}>
//                   <div className={styles.timelineLegend} style={{ display: 'flex', gap: '20px' }}>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
//                       <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#52c41a' }}></div>
//                       <span>High Score (≥70%)</span>
//                     </div>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
//                       <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#faad14' }}></div>
//                       <span>Medium Score (50-69%)</span>
//                     </div>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
//                       <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff4d4f' }}></div>
//                       <span>Low Score (&lt;50%)</span>
//                     </div>
//                     <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
//                       <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#1890ff' }}></div>
//                       <span>Pending Review</span>
//                     </div>
//                   </div>
//                 </div>
//               </AntCard>
//             </Col>
//           </Row>
          
//           {/* Student Performance Details */}
//           <AntCard title="Performance Details" className={styles.tableCard}>
//             {selectedStudent ? (
//               <Row gutter={[16, 16]}>
//                 <Col xs={24} md={6}>
//                   <AntCard>
//                     <Statistic 
//                       title="Overall Score" 
//                       value={`${Math.round(selectedStudent.score)}%`} 
//                       valueStyle={{ color: selectedStudent.score > 70 ? '#3f8600' : (selectedStudent.score > 50 ? '#faad14' : '#cf1322') }}
//                     />
//                   </AntCard>
//                 </Col>
//                 <Col xs={24} md={6}>
//                   <AntCard>
//                     <Statistic 
//                       title="Completion Rate" 
//                       value={`${Math.round(selectedStudent.completion)}%`} 
//                       valueStyle={{ color: '#1890ff' }}
//                     />
//                   </AntCard>
//                 </Col>
//                 <Col xs={24} md={6}>
//                   <AntCard>
//                     <Statistic 
//                       title="Missing Assignments" 
//                       value={selectedStudent.missingAssignments} 
//                       valueStyle={{ color: selectedStudent.missingAssignments > 3 ? '#cf1322' : '#3f8600' }}
//                     />
//                   </AntCard>
//                 </Col>
//                 <Col xs={24} md={6}>
//                   <AntCard>
//                     <Statistic 
//                       title="Time Spent" 
//                       value={`${selectedStudent.timeSpent} mins`} 
//                       valueStyle={{ color: '#722ed1' }}
//                     />
//                   </AntCard>
//                 </Col>
//               </Row>
//             ) : (
//               <Empty description="Select a student to view performance details" />
//             )}
//           </AntCard>
//         </>
//       ),
//     },
//     {
//       key: 'comparison',
//       label: 'Course Comparison',
//       children: (
//         <AntCard title="Course Performance Comparison" className={styles.chartCard}>
//           <ResponsiveContainer width="100%" height={400}>
//             <RadarChart outerRadius="80%" data={overviewData.courseComparisonData}>
//               <PolarGrid />
//               <PolarAngleAxis dataKey="name" />
//               <PolarRadiusAxis angle={30} domain={[0, 100]} />
//               <Radar name="Average Score" dataKey="averageScore" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
//               <Radar name="Completion Rate" dataKey="completion" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
//               <Radar name="Submission Rate" dataKey="submissionRate" stroke="#ff7300" fill="#ff7300" fillOpacity={0.6} />
//               <Legend />
//               <Tooltip />
//             </RadarChart>
//           </ResponsiveContainer>
          
//           <div className={styles.comparisonLegend}>
//             <h3>Comparison Metrics</h3>
//             <p className={styles.chartDescription}>This radar chart compares key performance indicators across all courses. Higher values indicate better performance in each category.</p>
//             <Row gutter={[16, 16]}>
//               <Col xs={24} md={8}>
//                 <div className={styles.legendItem}>
//                   <div className={styles.legendColor} style={{ backgroundColor: '#8884d8' }}></div>
//                   <span>Average Scores</span>
//                 </div>
//               </Col>
//               <Col xs={24} md={8}>
//                 <div className={styles.legendItem}>
//                   <div className={styles.legendColor} style={{ backgroundColor: '#82ca9d' }}></div>
//                   <span>Completion Rates</span>
//                 </div>
//               </Col>
//               <Col xs={24} md={8}>
//                 <div className={styles.legendItem}>
//                   <div className={styles.legendColor} style={{ backgroundColor: '#ff7300' }}></div>
//                   <span>Submission Rates</span>
//                 </div>
//               </Col>
//             </Row>
//           </div>
//         </AntCard>
//       ),
//     },
//     {
//       key: 'at-risk',
//       label: 'At-Risk Students',
//       children: (
//         <AntCard title="Students Requiring Attention" className={styles.tableCard}>          <Table
//             dataSource={overviewData.atRiskStudents}
//             rowKey="id"
//             pagination={{
//               pageSize: pageSize,
//               current: currentPage,
//               total: totalStudents,
//               onChange: handlePageChange,
//               showSizeChanger: true,
//               pageSizeOptions: ['10', '20', '50', '100'],
//               showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} students`
//             }}
//             columns={[
//               { 
//                 title: 'Student', 
//                 dataIndex: 'student', 
//                 key: 'student',
//                 render: (text, record) => (
//                   <span>
//                     {text} {' '}
//                     {record.risk && (
//                       <Badge 
//                         count="At Risk" 
//                         style={{ backgroundColor: '#ff4d4f' }} 
//                       />
//                     )}
//                   </span>
//                 )
//               },
//               { 
//                 title: 'Avg. Score', 
//                 dataIndex: 'score', 
//                 key: 'score',
//                 render: score => `${Math.round(score)}%`,
//                 sorter: (a, b) => a.score - b.score
//               },
//               { 
//                 title: 'Missing Assignments', 
//                 dataIndex: 'missingAssignments', 
//                 key: 'missingAssignments',
//                 sorter: (a, b) => a.missingAssignments - b.missingAssignments,
//                 render: (value) => (
//                   <Tag color={value > 3 ? 'red' : 'green'}>
//                     {value}
//                   </Tag>
//                 )
//               },
//               { 
//                 title: 'Days Since Access', 
//                 dataIndex: 'daysSinceLastAccess', 
//                 key: 'daysSinceLastAccess',
//                 sorter: (a, b) => a.daysSinceLastAccess - b.daysSinceLastAccess,
//                 render: (value) => (
//                   <Tag color={value > 14 ? 'red' : value > 7 ? 'orange' : 'green'}>
//                     {value}
//                   </Tag>
//                 )
//               },
//               { 
//                 title: 'Performance Trend', 
//                 dataIndex: 'trend', 
//                 key: 'trend',
//                 render: (value) => {
//                   let color = 'blue';
//                   let text = 'Steady';
                  
//                   if (value > 0) {
//                     color = 'green';
//                     text = 'Improving';
//                   } else if (value < 0) {
//                     color = 'red';
//                     text = 'Declining';
//                   }
                  
//                   return <Tag color={color}>{text}</Tag>;
//                 },
//                 sorter: (a, b) => a.trend - b.trend
//               }
//             ]}
//           />
//         </AntCard>
//       ),
//     }
//   ];

//   return (
//     <>
//       <Tabs 
//         activeKey={activeTab} 
//         onChange={setActiveTab} 
//         items={items}
//         className={styles.reportsTabs}
//       />
//     </>
//   );
// };

// export default React.memo(TeacherOverview);