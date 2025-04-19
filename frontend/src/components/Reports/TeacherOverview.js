import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { Card as AntCard, Row, Col, Table, Spin, Progress, Empty, Alert, Select, Tooltip as AntTooltip } from 'antd';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import styles from '../../styles/modules/Reports.module.css';

const TeacherOverview = () => {
  const { currentUser } = useAuth();
  const { fetchTeacherCourses, fetchStudentsByTeacher, fetchCourseStats } = useData();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [studentDisplayCount, setStudentDisplayCount] = useState(10);
  const [allStudents, setAllStudents] = useState([]);
  const [overviewData, setOverviewData] = useState({
    totalCourses: 0,
    totalStudents: 0,
    activeStudents: 0,
    averageCompletion: 0,
    coursesData: [],
    recentActivity: [],
    studentPerformance: []
  });

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentUser?.email) return;
      
      try {
        setLoading(true);
        setError(null);
        
        // Using teacher's email instead of UID
        const teacherEmail = currentUser.email;
        console.log('Fetching data for teacher email:', teacherEmail);
        
        // Get teacher's courses by email
        const courses = await fetchTeacherCourses(teacherEmail);
        console.log('Fetched courses:', courses);
        
        if (courses.length === 0) {
          setError("No courses found for this teacher. Please create a course or check your account.");
          setLoading(false);
          return;
        }
        
        // Get all students in teacher's courses using email
        const students = await fetchStudentsByTeacher(teacherEmail);
        console.log('Fetched students:', students);
        
        // Get detailed stats for each course
        const coursePromises = courses.map(course => fetchCourseStats(course.courseId));
        const courseStats = await Promise.all(coursePromises);
        console.log('Fetched course stats:', courseStats);
        
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
            averageScore: stats?.averageScore || 0
          };
        });
        
        // Calculate active students (accessed course in last week)
        const activeStudents = students.filter(student => {
          const lastAccess = student.lastAccessed?.toDate();
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
            return b.lastAccessed.seconds - a.lastAccessed.seconds;
          })
          .slice(0, 5)
          .map(s => ({
            student: `${s.firstName} ${s.lastName}`,
            activity: 'Accessed courses',
            course: s.courses[0]?.courseName || 'Unknown',  // Use first course as example
            date: s.lastAccessed?.toDate()
          }));
        
        // Process all student performance data
        const allStudentPerformance = students
          .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
          .map(s => ({
            student: `${s.firstName} ${s.lastName}`,
            score: s.averageScore || 0,
            completion: s.overallCompletion || 0
          }));
        
        setAllStudents(allStudentPerformance);
          
        setOverviewData({
          totalCourses: courses.length,
          totalStudents: students.length,
          activeStudents,
          averageCompletion,
          coursesData,
          recentActivity,
          studentPerformance: allStudentPerformance.slice(0, studentDisplayCount)
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setError("Failed to load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [currentUser, fetchTeacherCourses, fetchStudentsByTeacher, fetchCourseStats, studentDisplayCount]);
  
  // Update student performance data when display count changes
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

  if (loading) {
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

  // Custom pie chart label
  const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
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
  
  return (
    <div className={styles.teacherOverviewDashboard}>
      <h1 className={styles.sectionTitle}>Teacher Dashboard</h1>
      
      {/* Top metrics cards */}
      <Row gutter={[16, 16]} className={styles.overviewMetrics}>
        <Col xs={24} sm={12} md={6}>
          <AntCard title="Total Courses" className={styles.metricCard}>
            <h2>{overviewData.totalCourses}</h2>
          </AntCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <AntCard title="Total Students" className={styles.metricCard}>
            <h2>{overviewData.totalStudents}</h2>
          </AntCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <AntCard title="Active Students (7 days)" className={styles.metricCard}>
            <h2>{overviewData.activeStudents}</h2>
            <p>({Math.round((overviewData.activeStudents / overviewData.totalStudents) * 100 || 0)}% of total)</p>
          </AntCard>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <AntCard title="Avg. Course Completion" className={styles.metricCard}>
            <Progress 
              type="circle" 
              percent={Math.round(overviewData.averageCompletion)} 
              width={80}
            />
          </AntCard>
        </Col>
      </Row>
      
      {/* Course performance chart */}
      <AntCard title="Course Performance" className={styles.chartCard}>
        {overviewData.coursesData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={overviewData.coursesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
              <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend wrapperStyle={{ paddingTop: 20 }} />
              <Bar yAxisId="left" dataKey="students" name="Students" fill="#8884d8" animationDuration={1000} />
              <Bar yAxisId="right" dataKey="completion" name="Completion %" fill="#82ca9d" animationDuration={1000} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <Empty description="No course data available" />
        )}
      </AntCard>

      {/* Student completion distribution */}
      <Row gutter={[16, 16]} className={styles.insightSection}>
        <Col xs={24} md={12}>
          <AntCard title="Completion Distribution" className={styles.chartCard}>
            {completionDistribution.some(item => item.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={completionDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedPieLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  >
                    {completionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} students`, 'Count']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No completion data available" />
            )}
          </AntCard>
        </Col>

        <Col xs={24} md={12}>
          <AntCard title="Course Score Distribution" className={styles.chartCard}>
            {overviewData.coursesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={overviewData.coursesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend />
                  <Bar 
                    dataKey="averageScore" 
                    name="Average Score" 
                    fill="#FF8042" 
                    animationDuration={1200}
                    animationBegin={200} 
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Empty description="No score data available" />
            )}
          </AntCard>
        </Col>
      </Row>
      
      {/* Recent activity and top students */}
      <Row gutter={[16, 16]} className={styles.activitySection}>
        <Col xs={24} md={12}>
          <AntCard title="Recent Student Activity" className={styles.tableCard}>
            {overviewData.recentActivity.length > 0 ? (
              <Table 
                dataSource={overviewData.recentActivity} 
                rowKey={(record, index) => `activity-${index}`}
                pagination={false}
                columns={[
                  { title: 'Student', dataIndex: 'student', key: 'student' },
                  { title: 'Activity', dataIndex: 'activity', key: 'activity' },
                  { title: 'Course', dataIndex: 'course', key: 'course' },
                  { 
                    title: 'Date/Time', 
                    dataIndex: 'date', 
                    key: 'date',
                    render: date => date?.toLocaleString() || 'Unknown'
                  },
                ]}
              />
            ) : (
              <Empty description="No recent activity" />
            )}
          </AntCard>
        </Col>
        <Col xs={24} md={12}>
          <AntCard 
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Student Performance</span>
                <div>
                  <AntTooltip title="Select number of students to display">
                    <Select 
                      defaultValue={10} 
                      style={{ width: 120 }} 
                      onChange={value => setStudentDisplayCount(value)}
                      options={[
                        { value: 5, label: '5 Students' },
                        { value: 10, label: '10 Students' },
                        { value: 20, label: '20 Students' },
                        { value: 50, label: '50 Students' },
                        { value: 0, label: 'All Students' }
                      ]}
                    />
                  </AntTooltip>
                </div>
              </div>
            } 
            className={styles.tableCard}
          >
            {overviewData.studentPerformance.length > 0 ? (
              <Table 
                dataSource={overviewData.studentPerformance}
                rowKey={(record, index) => `performance-${index}`}
                pagination={studentDisplayCount === 0 ? 
                  { pageSize: 10, showSizeChanger: true, pageSizeOptions: ['10', '20', '50'] } : 
                  false
                }
                columns={[
                  { title: 'Student', dataIndex: 'student', key: 'student' },
                  { 
                    title: 'Avg. Score', 
                    dataIndex: 'score', 
                    key: 'score',
                    render: score => `${Math.round(score)}%`,
                    sorter: (a, b) => a.score - b.score
                  },
                  { 
                    title: 'Completion', 
                    dataIndex: 'completion', 
                    key: 'completion',
                    render: completion => <Progress percent={Math.round(completion)} size="small" />,
                    sorter: (a, b) => a.completion - b.completion
                  },
                ]}
              />
            ) : (
              <Empty description="No student performance data" />
            )}
          </AntCard>
        </Col>
      </Row>
    </div>
  );
};

export default TeacherOverview;