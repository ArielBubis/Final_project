import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Card as AntCard, Row, Col, Table, Spin, Progress, Empty, Alert, Select, Tag, Badge, Tooltip as AntTooltip, Tabs, Statistic } from 'antd';
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis
} from 'recharts';
import styles from '../../styles/modules/Reports.module.css';
import { formatFirebaseTimestamp, processFirestoreData } from '../../utils/firebaseUtils';

const { Option } = Select;

const TeacherOverview = ({ isAdminView = false }) => {
  // Contexts
  const { currentUser } = useAuth();
  const { 
    fetchTeacherCourses, 
    fetchStudentsByTeacher, 
    fetchCourseStats, 
    fetchAllCourses, 
    teachers, 
    courseData, 
    loading: dataLoading 
  } = useData();
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentDisplayCount, setStudentDisplayCount] = useState(10);
  const [activeTab, setActiveTab] = useState('overview');
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState('month');
  const [showClassAverage, setShowClassAverage] = useState(false);
  const [overviewData, setOverviewData] = useState({
    totalCourses: 0,
    totalStudents: 0,
    activeStudents: 0,
    averageCompletion: 0,
    coursesData: [],
    recentActivity: [],
    studentPerformance: [],
    gradeDistribution: [],
    assignmentCompletionData: [],
    studentEngagementData: [],
    courseComparisonData: [],
    timeSeriesData: [],
    atRiskStudents: [],
    individualStudentData: [],
    studentActivityData: []
  });
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Colors for charts
  const COLORS = useMemo(() => [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
    '#8884d8', '#82CA9D', '#8DD1E1', '#A4DE6C'
  ], []);
  
  // Custom pie chart label - moved before conditional returns to follow Rules of Hooks
  const renderCustomizedPieLabel = useMemo(() => {
    return ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
      const RADIAN = Math.PI / 180;
      const radius = innerRadius + (outerRadius - innerRadius) * 1.1;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);

      if (percent > 0.05) {
        return (
          <text 
            x={x} 
            y={y} 
            fill={COLORS[index % COLORS.length]}
            textAnchor={x > cx ? 'start' : 'end'} 
            dominantBaseline="central"
          >
            {`${name}: ${(percent * 100).toFixed(0)}%`}
          </text>
        );
      }
      return null;
    };
  }, [COLORS]);
  
  // Memoize parallel data - moved before conditional returns to follow Rules of Hooks
  const parallelData = useMemo(() => {
    return overviewData.coursesData.map(course => ({
      course: course.name,
      averageScore: course.averageScore,
      completion: course.completion,
      engagement: course.engagement,
      submissionRate: course.submissionRate
    }));
  }, [overviewData.coursesData]);

  // Main effect to load dashboard data - optimized to prevent unnecessary rerenders
  useEffect(() => {
    // Only run this effect if we have a current user
    if (!currentUser?.email) return;
    
    let isMounted = true;
    
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let courses = [];
        let students = [];
        let courseStats = [];
        
        if (isAdminView) {
          // Admin view: fetch all courses or filtered by selected teacher
          if (selectedTeacher) {
            // If a specific teacher is selected, fetch only their courses and students
            const [teacherCourses, teacherStudents] = await Promise.all([
              fetchTeacherCourses(selectedTeacher.email),
              fetchStudentsByTeacher(selectedTeacher.email)
            ]);
            courses = teacherCourses;
            students = processFirestoreData(teacherStudents); // Process timestamp data safely
          } else {
            // Otherwise fetch all courses data from context
            courses = courseData || [];
            students = []; // No specific students to show in overall view
          }
        } else {
          // Teacher view: fetch only this teacher's courses and students in parallel
          const teacherEmail = currentUser.email;
          const [teacherCourses, teacherStudents] = await Promise.all([
            fetchTeacherCourses(teacherEmail),
            fetchStudentsByTeacher(teacherEmail)
          ]);
          courses = teacherCourses;
          students = processFirestoreData(teacherStudents); // Process timestamp data safely
        }
        
        // Early exit if no courses or component unmounted
        if (courses.length === 0) {
          if (isMounted) {
            setError(isAdminView ? 
              "No course data available. Please check system configuration." : 
              "No courses found for this teacher. Please create a course or check your account."
            );
            setLoading(false);
          }
          return;
        }
        
        if (!isMounted) return;
        
        // Get detailed stats for each course in parallel
        const statsPromises = courses.map(course => fetchCourseStats(course.courseId));
        courseStats = await Promise.all(statsPromises);
        courseStats = processFirestoreData(courseStats); // Process timestamp data safely
        
        if (!isMounted) return;
        
        // Process data for visualization
        const coursesData = courses.map((course) => {
          const stats = courseStats.find(stat => stat.courseId === course.courseId) || {
            averageScore: 0,
            averageCompletion: 0
          };
          
          return {
            name: course.courseName,
            students: course.studentCount || 0,
            completion: stats?.averageCompletion || 0,
            averageScore: stats?.averageScore || 0,
            engagement: Math.floor(Math.random() * 100) + 1, // Mockup data
            submissionRate: Math.floor(Math.random() * 100) + 1 // Mockup data
          };
        });
        
        // Calculate active students (accessed course in last week)
        const activeStudents = students.filter(student => {
          const lastAccess = formatFirebaseTimestamp(student.lastAccessed);
          if (!lastAccess) return false;
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return lastAccess > weekAgo;
        }).length;
        
        // Calculate average completion across all courses
        const totalCompletions = coursesData.reduce((sum, course) => sum + course.completion, 0);
        const averageCompletion = coursesData.length ? (totalCompletions / coursesData.length) : 0;
        
        // Get recent student activity (based on lastAccessed from student progress)
        const recentActivity = students
          .filter(s => s.lastAccessed)
          .sort((a, b) => {
            if (!a.lastAccessed) return 1;
            if (!b.lastAccessed) return -1;
            
            const dateA = formatFirebaseTimestamp(a.lastAccessed);
            const dateB = formatFirebaseTimestamp(b.lastAccessed);
            
            if (!dateA) return 1;
            if (!dateB) return -1;
            
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5)
          .map(s => ({
            student: `${s.firstName} ${s.lastName}`,
            activity: 'Accessed courses',
            course: s.courses[0]?.courseName || 'Unknown',  // Use first course as example
            date: formatFirebaseTimestamp(s.lastAccessed)
          }));
        
        // Process student performance data
        const allStudentPerformance = students
          .map(s => {
            // Calculate risk factors (mock data for demonstration)
            const missingAssignments = Math.floor(Math.random() * 10);
            const lastAccessed = formatFirebaseTimestamp(s.lastAccessed);
            const daysSinceLastAccess = lastAccessed ? 
              Math.floor((new Date() - lastAccessed) / (1000 * 60 * 60 * 24)) : 30;
            
            // Generate trend data (mock)
            const trend = Math.random() > 0.7 ? -1 : (Math.random() > 0.3 ? 0 : 1);
            
            return {
              id: s.studentId || s.id || `student-${Math.random().toString(36).substring(2, 9)}`,
              studentId: s.studentId || s.id,
              firstName: s.firstName,
              lastName: s.lastName,
              student: `${s.firstName} ${s.lastName}`,
              score: s.averageScore || 0,
              completion: s.overallCompletion || 0,
              engagement: Math.min(100, Math.max(0, (s.overallCompletion || 0) + (Math.random() * 30 - 15))),
              submissionRate: Math.floor(Math.random() * 100) + 1,
              expertiseRate: Math.floor(Math.random() * 100) + 1,
              timeSpent: Math.floor(Math.random() * 500) + 50, // in minutes
              missingAssignments,
              daysSinceLastAccess,
              trend,
              risk: missingAssignments > 3 || daysSinceLastAccess > 14 || trend < 0
            };
          });
          
        // At-risk students
        const atRiskStudents = allStudentPerformance
          .filter(s => s.risk)
          .sort((a, b) => b.missingAssignments - a.missingAssignments);
        
        // Generate grade distribution data
        const gradeDistribution = [
          { grade: '90', count: 0, percentage: 0 },
          { grade: '80', count: 0, percentage: 0 },
          { grade: '70', count: 0, percentage: 0 },
          { grade: '60', count: 0, percentage: 0 },
          { grade: 'F', count: 0, percentage: 0 }
        ];
        
        allStudentPerformance.forEach(student => {
          const score = student.score;
          if (score >= 90) gradeDistribution[0].count++;
          else if (score >= 80) gradeDistribution[1].count++;
          else if (score >= 70) gradeDistribution[2].count++;
          else if (score >= 60) gradeDistribution[3].count++;
          else gradeDistribution[4].count++;
        });
        
        // Calculate percentages
        const totalStudents = allStudentPerformance.length;
        gradeDistribution.forEach(grade => {
          grade.percentage = totalStudents > 0 ? Math.round((grade.count / totalStudents) * 100) : 0;
        });
        
        // Generate assignment completion data (mock data)
        const moduleNames = ['Module 1', 'Module 2', 'Module 3', 'Module 4', 'Module 5'];
        const assignmentCompletionData = coursesData.map(course => {
          const data = {};
          data.name = course.name;
          
          moduleNames.forEach(module => {
            data[module] = Math.floor(Math.random() * 100);
          });
          
          return data;
        });
        
        // Generate time series data
        const today = new Date();
        const timeSeriesData = [];
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(today.getDate() - i * 7); // Weekly data points
          
          timeSeriesData.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            averageScore: 65 + Math.floor(Math.random() * 20),
            engagementLevel: 55 + Math.floor(Math.random() * 30)
          });
        }
        
        // Generate student engagement data
        const studentEngagementData = [
          { name: 'On Time', value: Math.floor(Math.random() * 60) + 40 },
          { name: 'Late', value: Math.floor(Math.random() * 20) + 10 },
          { name: 'Missing', value: Math.floor(Math.random() * 20) + 5 }
        ];
        
        // Generate data for individual student performance dashboard
        const individualStudentData = allStudentPerformance.map(student => {
          // Calculate class average for comparison
          const classAvgCompletion = allStudentPerformance.reduce((sum, s) => sum + s.completion, 0) / allStudentPerformance.length;
          const classAvgScore = allStudentPerformance.reduce((sum, s) => sum + s.score, 0) / allStudentPerformance.length;
          const classAvgSubmissionRate = allStudentPerformance.reduce((sum, s) => sum + s.submissionRate, 0) / allStudentPerformance.length;
          const classAvgExpertiseRate = allStudentPerformance.reduce((sum, s) => sum + s.expertiseRate, 0) / allStudentPerformance.length;
          const classAvgTimeSpent = allStudentPerformance.reduce((sum, s) => sum + s.timeSpent, 0) / allStudentPerformance.length;
          
          return {
            id: student.id,
            studentId: student.studentId,
            name: student.student,
            radarData: [
              { metric: 'Completion Rate', value: student.completion, classAverage: classAvgCompletion },
              { metric: 'Overall Score', value: student.score, classAverage: classAvgScore },
              { metric: 'Submission Rate', value: student.submissionRate, classAverage: classAvgSubmissionRate },
              { metric: 'Expertise Rate', value: student.expertiseRate, classAverage: classAvgExpertiseRate },
              { metric: 'Time Spent', value: student.timeSpent > 0 ? 100 : 0, classAverage: classAvgTimeSpent > 0 ? 100 : 0 }
            ]
          };
        });
        
        // Generate student activity timeline data (mock data)
        const studentActivityData = {};
        
        allStudentPerformance.forEach(student => {
          const activities = [];
          // Generate random access events
          for (let i = 0; i < 20; i++) {
            const randomDate = new Date();
            randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30));
            randomDate.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
            
            activities.push({
              id: `activity-${i}-${student.id}`,
              type: Math.random() > 0.5 ? 'access' : 'submission',
              timestamp: randomDate,
              duration: Math.floor(Math.random() * 60) + 5, // Minutes
              intensity: Math.floor(Math.random() * 10) + 1, // 1-10 scale
              course: courses[Math.floor(Math.random() * courses.length)]?.courseName || 'Unknown Course',
              module: `Module ${Math.floor(Math.random() * 5) + 1}`
            });
          }
          
          // Sort activities by timestamp
          activities.sort((a, b) => a.timestamp - b.timestamp);
          
          // Store in the map
          studentActivityData[student.id] = activities;
        });
        
        if (isMounted) {
          setAllStudents(allStudentPerformance);
          
          setOverviewData({
            totalCourses: courses.length,
            totalStudents: students.length,
            activeStudents,
            averageCompletion,
            coursesData,
            recentActivity,
            studentPerformance: allStudentPerformance.slice(0, studentDisplayCount),
            gradeDistribution,
            assignmentCompletionData,
            studentEngagementData,
            courseComparisonData: coursesData,
            timeSeriesData,
            atRiskStudents,
            individualStudentData,
            studentActivityData
          });
          
          // Set the first student as selected by default if we have students
          if (allStudentPerformance.length > 0 && !selectedStudent) {
            setSelectedStudent(allStudentPerformance[0]);
          }
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        if (isMounted) {
          setError("Failed to load dashboard data. Please try again later.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadDashboardData();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [
    currentUser, 
    fetchTeacherCourses, 
    fetchStudentsByTeacher, 
    fetchCourseStats, 
    isAdminView, 
    selectedTeacher, 
    courseData,
    studentDisplayCount,
    selectedStudent
  ]);
  
  // Update student performance data when display count changes
  // Separate effect to handle this specific state change
  useEffect(() => {
    if (allStudents.length > 0) {
      setOverviewData(prevData => ({
        ...prevData,
        studentPerformance: studentDisplayCount === 0 ? 
          allStudents : 
          allStudents.slice(0, studentDisplayCount)
      }));
    }
  }, [studentDisplayCount, allStudents]);

  // Memoized handler for teacher selection change
  const handleTeacherChange = useCallback((teacherId) => {
    if (teacherId === 'all') {
      setSelectedTeacher(null);
    } else {
      const teacher = teachers.find(t => t.id === teacherId);
      setSelectedTeacher(teacher);
    }
  }, [teachers]);
  
  // Handler for student selection change
  const handleStudentChange = useCallback((studentId) => {
    const student = allStudents.find(s => s.id === studentId);
    setSelectedStudent(student || null);
  }, [allStudents]);
  
  // Handler for time period selection change
  const handleTimePeriodChange = useCallback((period) => {
    setSelectedTimePeriod(period);
  }, []);
  
  // Handler for toggling class average in student performance chart
  const toggleClassAverage = useCallback(() => {
    setShowClassAverage(prev => !prev);
  }, []);

  // Loading and error states
  if (loading || dataLoading) {
    return <Spin size="large" tip="Loading dashboard data..." />;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  // Custom tooltip for the bar chart
  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={styles.customTooltip}>
          <p className={styles.tooltipLabel}>{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={`item-${index}`} style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}${entry.name.includes('%') ? '%' : ''}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Format data for completion distribution chart
  const completionDistribution = [
    { name: '0-25%', value: 0 },
    { name: '26-50%', value: 0 },
    { name: '51-75%', value: 0 },
    { name: '76-100%', value: 0 }
  ];

  overviewData.studentPerformance.forEach(student => {
    const completion = student.completion;
    if (completion <= 25) completionDistribution[0].value++;
    else if (completion <= 50) completionDistribution[1].value++;
    else if (completion <= 75) completionDistribution[2].value++;
    else completionDistribution[3].value++;
  });
  
  // Generate parallel coordinates data for course comparison
  const parallelDomains = [
    { name: 'course', domain: overviewData.coursesData.map(c => c.name), type: 'category' },
    { name: 'averageScore', domain: [0, 100], type: 'number' },
    { name: 'completion', domain: [0, 100], type: 'number' },
    { name: 'engagement', domain: [0, 100], type: 'number' },
    { name: 'submissionRate', domain: [0, 100], type: 'number' }
  ];
  
  // Set up the tab items
  const items = [
    {
      key: 'overview',
      label: 'Overview',
      children: (
        <>
          {/* Teacher selector for admins */}
          {isAdminView && (
            <div className={styles.teacherSelector}>
              <Select
                placeholder="Select teacher to view"
                style={{ width: 300, marginBottom: 16 }}
                onChange={handleTeacherChange}
                defaultValue="all"
              >
                <Option value="all">All Teachers (System Overview)</Option>
                {teachers.map(teacher => (
                  <Option key={teacher.id} value={teacher.id}>
                    {teacher.firstName} {teacher.lastName} ({teacher.courseCount} courses)
                  </Option>
                ))}
              </Select>
            </div>
          )}
          
          {/* Overview Section */}
          <Row gutter={[16, 16]} className={styles.overviewMetrics}>
            <Col xs={24} sm={12} md={6}>
              <AntCard title="Active Courses" className={styles.metricCard}>
                <h2>{overviewData.totalCourses}</h2>
              </AntCard>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <AntCard title="Total Students" className={styles.metricCard}>
                <h2>{overviewData.totalStudents}</h2>
              </AntCard>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <AntCard title="Course Completion Rate" className={styles.metricCard}>
                <Progress 
                  type="circle" 
                  percent={Math.round(overviewData.averageCompletion)} 
                  width={80}
                />
              </AntCard>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <AntCard title="Student Engagement" className={styles.metricCard}>
                <Progress 
                  type="circle" 
                  percent={Math.round(overviewData.activeStudents / (overviewData.totalStudents || 1) * 100)} 
                  width={80}
                  strokeColor="#1890ff"
                />
              </AntCard>
            </Col>
          </Row>
          
          {/* Performance Overview */}
          <Row gutter={[16, 16]} className={styles.insightSection}>
            <Col xs={24} md={12}>
              <AntCard title="Grade Distribution" className={styles.chartCard}>
                {overviewData.gradeDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={overviewData.gradeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="grade" />
                      <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                      <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="count" name="Number of Students" fill="#8884d8" />
                      <Bar yAxisId="right" dataKey="percentage" name="Percentage" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="No grade distribution data available" />
                )}
              </AntCard>
            </Col>
            
            <Col xs={24} md={12}>
              <AntCard title="Score Trends Over Time" className={styles.chartCard}>
                {overviewData.timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={overviewData.timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="averageScore" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }}
                        name="Average Score"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="engagementLevel" 
                        stroke="#82ca9d" 
                        name="Engagement Level" 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="No time series data available" />
                )}
              </AntCard>
            </Col>
          </Row>
          
          {/* Assignment Completion Heatmap */}
          {/* <AntCard title="Assignment Completion Rates by Course/Module" className={styles.chartCard}>
            {overviewData.assignmentCompletionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={overviewData.assignmentCompletionData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 70, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={100} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Module 1" stackId="a" fill="#8884d8" />
                  <Bar dataKey="Module 2" stackId="a" fill="#82ca9d" />
                  <Bar dataKey="Module 3" stackId="a" fill="#ffc658" />
                  <Bar dataKey="Module 4" stackId="a" fill="#ff7300" />
                  <Bar dataKey="Module 5" stackId="a" fill="#0088fe" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No assignment completion data available" />
            )}
          </AntCard> */}
        </>
      ),
    },
    {
      key: 'individual-performance',
      label: 'Individual Student Performance',
      children: (
        <>
          {/* Student selector and filters */}
          <Row gutter={[16, 16]} className={styles.filterControls}>
            <Col xs={24} md={12}>
              <AntCard title="Student Selection" className={styles.controlCard}>
                <Select
                  placeholder="Select student"
                  style={{ width: '100%', marginBottom: 16 }}
                  onChange={handleStudentChange}
                  value={selectedStudent?.id}
                >
                  {allStudents.map(student => (
                    <Option key={student.id} value={student.id}>
                      {student.student}
                    </Option>
                  ))}
                </Select>
              </AntCard>
            </Col>
            <Col xs={24} md={12}>
              <AntCard title="Performance Controls" className={styles.controlCard}>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Select
                      value={selectedTimePeriod}
                      onChange={handleTimePeriodChange}
                      style={{ width: '100%' }}
                    >
                      <Option value="week">Last Week</Option>
                      <Option value="month">Last Month</Option>
                      <Option value="quarter">Last Quarter</Option>
                      <Option value="year">Last Year</Option>
                    </Select>
                  </Col>
                  <Col span={12}>
                    <button 
                      onClick={toggleClassAverage} 
                      className={`${styles.toggleButton} ${showClassAverage ? styles.active : ''}`}
                      style={{ 
                        padding: '5px 10px', 
                        border: '1px solid #d9d9d9', 
                        borderRadius: '2px',
                        background: showClassAverage ? '#1890ff' : 'white',
                        color: showClassAverage ? 'white' : 'rgba(0,0,0,0.85)',
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    >
                      {showClassAverage ? 'Hide Class Average' : 'Show Class Average'}
                    </button>
                  </Col>
                </Row>
              </AntCard>
            </Col>
          </Row>

          {/* A. Student Progress Overview Section */}
          <Row gutter={[16, 16]} className={styles.performanceSection}>
            <Col xs={24} md={24} lg={12}>
              <AntCard title="Student Progress Overview" className={styles.chartCard}>
                {selectedStudent && overviewData.individualStudentData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart 
                        outerRadius="80%" 
                        data={overviewData.individualStudentData.find(s => s.id === selectedStudent.id)?.radarData || []}
                      >
                        <PolarGrid />
                        <PolarAngleAxis dataKey="metric" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} />
                        <Radar 
                          name={`${selectedStudent.student}'s Performance`} 
                          dataKey="value" 
                          stroke="#8884d8" 
                          fill="#8884d8" 
                          fillOpacity={0.6} 
                        />
                        {showClassAverage && (
                          <Radar 
                            name="Class Average" 
                            dataKey="classAverage" 
                            stroke="#82ca9d" 
                            fill="#82ca9d" 
                            fillOpacity={0.2} 
                          />
                        )}
                        <Legend />
                        <Tooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                    
                    <div className={styles.metricDescription}>
                      <h3>Key Performance Metrics</h3>
                      <p>The radar chart shows the student's performance across five key metrics:</p>
                      <ul>
                        <li><strong>Completion Rate:</strong> How much of the course the student has completed</li>
                        <li><strong>Overall Score:</strong> Average score across all assignments</li>
                        <li><strong>Submission Rate:</strong> Percentage of assignments submitted on time</li>
                        <li><strong>Expertise Rate:</strong> Mastery level of course concepts</li>
                        <li><strong>Time Spent:</strong> Normalized time engagement with course materials</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <Empty description="No student data available" />
                )}
              </AntCard>
            </Col>
            
            {/* B. Student Activity Timeline Section */}
            <Col xs={24} md={24} lg={12}>
              <AntCard title="Student Activity Timeline" className={styles.chartCard}>
                {selectedStudent && overviewData.studentActivityData[selectedStudent.id]?.length > 0 ? (
                  <div className={styles.timelineContainer} style={{ height: '400px', overflowY: 'auto' }}>
                    {overviewData.studentActivityData[selectedStudent.id]
                      .filter(activity => {
                        // Filter based on selected time period
                        const now = new Date();
                        const activityDate = activity.timestamp;
                        if (selectedTimePeriod === 'week') {
                          return now - activityDate <= 7 * 24 * 60 * 60 * 1000;
                        } else if (selectedTimePeriod === 'month') {
                          return now - activityDate <= 30 * 24 * 60 * 60 * 1000;
                        } else if (selectedTimePeriod === 'quarter') {
                          return now - activityDate <= 90 * 24 * 60 * 60 * 1000;
                        } else {
                          return now - activityDate <= 365 * 24 * 60 * 60 * 1000;
                        }
                      })
                      .map((activity, index) => (
                        <div 
                          key={activity.id} 
                          className={styles.timelineItem}
                          style={{
                            display: 'flex',
                            margin: '10px 0',
                            borderLeft: '3px solid',
                            borderLeftColor: activity.type === 'access' ? '#1890ff' : '#52c41a',
                            paddingLeft: '15px',
                            position: 'relative'
                          }}
                        >
                          <div 
                            className={styles.timelineDot}
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '50%',
                              background: activity.type === 'access' ? '#1890ff' : '#52c41a',
                              position: 'absolute',
                              left: '-7px',
                              top: '5px'
                            }}
                          />
                          <div className={styles.timelineContent} style={{ width: '100%' }}>
                            <div className={styles.timelineHeader} style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <strong>
                                {activity.type === 'access' ? 'Accessed' : 'Submitted'}: {activity.module}
                              </strong>
                              <span>{activity.timestamp.toLocaleDateString()} {activity.timestamp.toLocaleTimeString()}</span>
                            </div>
                            <div className={styles.timelineDetails}>
                              <p>Course: {activity.course}</p>
                              <p>Duration: {activity.duration} minutes</p>
                              <div 
                                className={styles.intensityBar}
                                style={{
                                  width: '100%',
                                  height: '10px',
                                  background: '#f0f2f5',
                                  marginTop: '5px'
                                }}
                              >
                                <div 
                                  className={styles.intensityFill}
                                  style={{
                                    width: `${activity.intensity * 10}%`,
                                    height: '100%',
                                    background: `rgba(${activity.type === 'access' ? '24, 144, 255' : '82, 196, 26'}, ${activity.intensity / 10})`,
                                  }}
                                />
                              </div>
                              <div className={styles.intensityLabel} style={{ fontSize: '12px', marginTop: '2px' }}>
                                Engagement Intensity: {activity.intensity}/10
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <Empty description="No activity timeline data available" />
                )}
                <div className={styles.timelineControls} style={{ marginTop: '16px' }}>
                  <div className={styles.timelineLegend} style={{ display: 'flex', gap: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#1890ff' }}></div>
                      <span>Access Events</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#52c41a' }}></div>
                      <span>Submission Events</span>
                    </div>
                  </div>
                </div>
              </AntCard>
            </Col>
          </Row>
          
          {/* Student Performance Details */}
          <AntCard title="Performance Details" className={styles.tableCard}>
            {selectedStudent ? (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={6}>
                  <AntCard>
                    <Statistic 
                      title="Overall Score" 
                      value={`${Math.round(selectedStudent.score)}%`} 
                      valueStyle={{ color: selectedStudent.score > 70 ? '#3f8600' : (selectedStudent.score > 50 ? '#faad14' : '#cf1322') }}
                    />
                  </AntCard>
                </Col>
                <Col xs={24} md={6}>
                  <AntCard>
                    <Statistic 
                      title="Completion Rate" 
                      value={`${Math.round(selectedStudent.completion)}%`} 
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </AntCard>
                </Col>
                <Col xs={24} md={6}>
                  <AntCard>
                    <Statistic 
                      title="Missing Assignments" 
                      value={selectedStudent.missingAssignments} 
                      valueStyle={{ color: selectedStudent.missingAssignments > 3 ? '#cf1322' : '#3f8600' }}
                    />
                  </AntCard>
                </Col>
                <Col xs={24} md={6}>
                  <AntCard>
                    <Statistic 
                      title="Time Spent" 
                      value={`${selectedStudent.timeSpent} mins`} 
                      valueStyle={{ color: '#722ed1' }}
                    />
                  </AntCard>
                </Col>
              </Row>
            ) : (
              <Empty description="Select a student to view performance details" />
            )}
          </AntCard>
        </>
      ),
    },
    {
      key: 'comparison',
      label: 'Course Comparison',
      children: (
        <AntCard title="Course Performance Comparison" className={styles.chartCard}>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart outerRadius="80%" data={overviewData.courseComparisonData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar name="Average Score" dataKey="averageScore" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              <Radar name="Completion Rate" dataKey="completion" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
              <Radar name="Student Engagement" dataKey="engagement" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
              <Radar name="Submission Rate" dataKey="submissionRate" stroke="#ff7300" fill="#ff7300" fillOpacity={0.6} />
              <Legend />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          
          <div className={styles.comparisonLegend}>
            <h3>Comparison Metrics</h3>
            <p className={styles.chartDescription}>This radar chart compares key performance indicators across all courses. Higher values indicate better performance in each category.</p>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={6}>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: '#8884d8' }}></div>
                  <span>Average Scores</span>
                </div>
              </Col>
              <Col xs={24} md={6}>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: '#82ca9d' }}></div>
                  <span>Completion Rates</span>
                </div>
              </Col>
              <Col xs={24} md={6}>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: '#ffc658' }}></div>
                  <span>Engagement Levels</span>
                </div>
              </Col>
              <Col xs={24} md={6}>
                <div className={styles.legendItem}>
                  <div className={styles.legendColor} style={{ backgroundColor: '#ff7300' }}></div>
                  <span>Submission Rates</span>
                </div>
              </Col>
            </Row>
          </div>
        </AntCard>
      ),
    },
    {
      key: 'at-risk',
      label: 'At-Risk Students',
      children: (
        <AntCard title="Students Requiring Attention" className={styles.tableCard}>
          <Table
            dataSource={overviewData.atRiskStudents}
            rowKey="id"
            pagination={{ pageSize: 10 }}
            columns={[
              { 
                title: 'Student', 
                dataIndex: 'student', 
                key: 'student',
                render: (text, record) => (
                  <span>
                    {text} {' '}
                    {record.risk && (
                      <Badge 
                        count="At Risk" 
                        style={{ backgroundColor: '#ff4d4f' }} 
                      />
                    )}
                  </span>
                )
              },
              { 
                title: 'Avg. Score', 
                dataIndex: 'score', 
                key: 'score',
                render: score => `${Math.round(score)}%`,
                sorter: (a, b) => a.score - b.score
              },
              { 
                title: 'Missing Assignments', 
                dataIndex: 'missingAssignments', 
                key: 'missingAssignments',
                sorter: (a, b) => a.missingAssignments - b.missingAssignments,
                render: (value) => (
                  <Tag color={value > 3 ? 'red' : 'green'}>
                    {value}
                  </Tag>
                )
              },
              { 
                title: 'Days Since Access', 
                dataIndex: 'daysSinceLastAccess', 
                key: 'daysSinceLastAccess',
                sorter: (a, b) => a.daysSinceLastAccess - b.daysSinceLastAccess,
                render: (value) => (
                  <Tag color={value > 14 ? 'red' : value > 7 ? 'orange' : 'green'}>
                    {value}
                  </Tag>
                )
              },
              { 
                title: 'Performance Trend', 
                dataIndex: 'trend', 
                key: 'trend',
                render: (value) => {
                  let color = 'blue';
                  let text = 'Steady';
                  
                  if (value > 0) {
                    color = 'green';
                    text = 'Improving';
                  } else if (value < 0) {
                    color = 'red';
                    text = 'Declining';
                  }
                  
                  return <Tag color={color}>{text}</Tag>;
                },
                sorter: (a, b) => a.trend - b.trend
              }
            ]}
          />
        </AntCard>
      ),
    }
  ];

  return (
    <>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        items={items}
        className={styles.reportsTabs}
      />
    </>
  );
};

export default React.memo(TeacherOverview);