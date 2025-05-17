import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Tabs, Table, Progress, Spin, Alert, Select, Empty, Statistic, Row, Col } from 'antd';
import { fetchDocumentById, fetchDocuments, formatTimestampForDisplay } from '../../utils/firebaseUtils';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  WarningOutlined, 
  FileTextOutlined,
  ExperimentOutlined,
  FormOutlined,
  TeamOutlined
} from '@ant-design/icons';
import styles from '../../styles/modules/Reports.module.css';

const { TabPane } = Tabs;
const { Option } = Select;

const AssignmentAnalytics = ({ studentId, courseId }) => {
  const { currentUser } = useAuth();
  const { fetchStudentAssignments, fetchTeacherCourses, fetchStudentsByTeacher } = useData();
  
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(studentId || 'all');
  const [selectedCourse, setSelectedCourse] = useState(courseId || 'all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        if (!currentUser?.email) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }
        
        // Step 1: Get the user's profile data using email
        const usersWithEmail = await fetchDocuments('users', {
          filters: [
            { field: 'email', operator: '==', value: currentUser.email }
          ]
        });
        
        if (!usersWithEmail || usersWithEmail.length === 0) {
          setError('User profile not found');
          setLoading(false);
          return;
        }
        
        const userProfile = usersWithEmail[0];        // Step 2: Verify the user has teacher role permissions
        // Check role field (new schema)
        if (userProfile.role) {
          if (userProfile.role !== 'teacher' && userProfile.role !== 'admin') {
            setError('User does not have teacher permissions');
            setLoading(false);
            return;
          }
        }
        // Legacy support for roles field (plural)
        else if (typeof userProfile.roles === 'string') {
          if (userProfile.roles !== 'teacher' && userProfile.roles !== 'admin') {
            setError('User does not have teacher permissions');
            setLoading(false);
            return;
          }
        }
        // Legacy support for object format
        else if (!userProfile.roles?.teacher && !userProfile.roles?.admin) {
          setError('User does not have teacher permissions');
          setLoading(false);
          return;
        }
        
        // Step 3: Extract the userId field
        const teacherId = userProfile.userId;
        
        if (!teacherId) {
          setError('Teacher ID not found in user profile');
          setLoading(false);
          return;
        }
        
        // Step 4: Query the teacher record using this userId
        const teacherRecord = await fetchDocumentById('teachers', teacherId);
        
        if (!teacherRecord) {
          setError('Teacher record not found');
          setLoading(false);
          return;
        }
        
        // Step 5: Access the courses array from the teacher record
        const teacherCourseIds = teacherRecord.courses || [];
        
        // Log for debugging
        console.log('Teacher ID:', teacherId);
        console.log('Teacher course IDs:', teacherCourseIds);
        
        // Step 6: Fetch teacher's courses
        const teacherCourses = await fetchTeacherCourses(currentUser?.email);
        console.log('All teacher courses:', teacherCourses);
        
        // Step 7: Filter courses to only include those in the teacher's courses array
        let filteredCourses = teacherCourses;
        
        // Only filter if the teacher has assigned courses
        if (teacherCourseIds.length > 0) {
          filteredCourses = teacherCourses.filter(course =>
            teacherCourseIds.includes(course.id)
          );
          console.log('Filtered courses:', filteredCourses);
        } else {
          console.log('No course filtering applied - teacher has no assigned courses');
        }
        
        setCourses(filteredCourses);
        
        // Fetch students for the teacher
        const teacherStudents = await fetchStudentsByTeacher(currentUser?.email);
        setStudents(teacherStudents);
        
        // Set initial selected course if not provided
        if (!courseId && filteredCourses.length > 0) {
          setSelectedCourse(filteredCourses[0].id);
        }
        
        // Set initial selected student if not provided
        if (!studentId && teacherStudents.length > 0) {
          setSelectedStudent(teacherStudents[0].id);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch initial data');
        console.error('Error fetching data:', err);
        setLoading(false);
      }
    };
    
    if (currentUser?.uid) {
      fetchData();
    }
  }, [currentUser, fetchTeacherCourses, fetchStudentsByTeacher, courseId, studentId]);

  // Fetch assignments when selected student or course changes
  useEffect(() => {
    const fetchAssignmentData = async () => {
      try {
        setLoading(true);
        
        if (selectedStudent === 'all') {
          // Fetch assignments for all students in the selected course
          const allAssignments = [];
          
          for (const student of students) {
            const studentAssignments = await fetchStudentAssignments(student.id);
            
            // Filter by course if a course is selected
            const filteredAssignments = selectedCourse === 'all' 
              ? studentAssignments 
              : studentAssignments.filter(a => a.courseId === selectedCourse);
              
            // Add student info to each assignment
            filteredAssignments.forEach(assignment => {
              allAssignments.push({
                ...assignment,
                studentId: student.id,
                studentName: `${student.firstName} ${student.lastName}`
              });
            });
          }
          
          setAssignments(allAssignments);
        } else {
          // Fetch assignments for the selected student
          const studentAssignments = await fetchStudentAssignments(selectedStudent);
          
          // Filter by course if a course is selected
          console.log('studentAssignments', studentAssignments);
          console.log('selectedCourse', selectedCourse);
          console.log('students', students);
          console.log('selectedStudent', selectedStudent);
          console.log('filteredAssignments', studentAssignments.filter(a => a.courseId === selectedCourse));

          const filteredAssignments = selectedCourse === 'all' 
            ? studentAssignments 
            : studentAssignments.filter(a => a.courseId === selectedCourse);
            
          // Add student info to each assignment
          const student = students.find(s => s.id === selectedStudent);
          const assignmentsWithStudent = filteredAssignments.map(assignment => ({
            ...assignment,
            studentId: selectedStudent,
            studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown Student'
          }));
          
          setAssignments(assignmentsWithStudent);
        }
        
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch assignment data');
        console.error('Error fetching assignment data:', err);
        setLoading(false);
      }
    };
    
    if (selectedStudent && students.length > 0) {
      fetchAssignmentData();
    }
  }, [selectedStudent, selectedCourse, students, fetchStudentAssignments]);

  // Group assignments by type
  const assignmentsByType = useMemo(() => {
    const grouped = {
      Quiz: [],
      Exam: [],
      Project: [],
      Participation: [],
      Other: []
    };
    
    assignments.forEach(assignment => {
      const type = assignment.assignmentType || 'Other';
      if (grouped[type]) {
        grouped[type].push(assignment);
      } else {
        grouped.Other.push(assignment);
      }
    });
    
    return grouped;
  }, [assignments]);

  // Calculate metrics for each assignment type
  const typeMetrics = useMemo(() => {
    const metrics = {};
    
    Object.keys(assignmentsByType).forEach(type => {
      const typeAssignments = assignmentsByType[type];
      
      if (typeAssignments.length === 0) {
        metrics[type] = null;
        return;
      }
      
      // Filter completed assignments
      const completedAssignments = typeAssignments.filter(a => a.status === 'completed');
      
      // Calculate completion rate
      const completionRate = typeAssignments.length > 0 
        ? (completedAssignments.length / typeAssignments.length) * 100 
        : 0;
      
      // Calculate average score
      const totalScore = completedAssignments.reduce((sum, a) => sum + (a.score || 0), 0);
      const avgScore = completedAssignments.length > 0 
        ? totalScore / completedAssignments.length 
        : 0;
      
      // Calculate average time spent
      const totalTime = completedAssignments.reduce((sum, a) => sum + (a.timeSpent || 0), 0);
      const avgTime = completedAssignments.length > 0 
        ? totalTime / completedAssignments.length 
        : 0;
      
      // Calculate late submission rate
      const lateSubmissions = completedAssignments.filter(a => a.isLate).length;
      const lateRate = completedAssignments.length > 0 
        ? (lateSubmissions / completedAssignments.length) * 100 
        : 0;
      
      metrics[type] = {
        total: typeAssignments.length,
        completed: completedAssignments.length,
        completionRate,
        avgScore,
        avgTime,
        lateSubmissions,
        lateRate
      };
    });
    
    return metrics;
  }, [assignmentsByType]);

  // Get icon for assignment type
  const getTypeIcon = (type) => {
    switch (type) {
      case 'Quiz':
        return <FormOutlined />;
      case 'Exam':
        return <FileTextOutlined />;
      case 'Project':
        return <ExperimentOutlined />;
      case 'Participation':
        return <TeamOutlined />;
      default:
        return <FileTextOutlined />;
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'overdue':
        return <WarningOutlined style={{ color: '#f5222d' }} />;
      case 'pending':
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
      case 'future':
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />;
      default:
        return <ClockCircleOutlined style={{ color: '#faad14' }} />;
    }
  };

  // Define columns for assignment tables
  const getColumns = (type) => {
    const baseColumns = [
      {
        title: 'Assignment',
        dataIndex: 'title',
        key: 'title',
        render: (text, record) => (
          <div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {getTypeIcon(record.assignmentType)} <span style={{ marginLeft: 8 }}>{text}</span>
            </div>
            {selectedStudent === 'all' && (
              <div style={{ fontSize: '0.85rem', color: '#8c8c8c', marginTop: 4 }}>
                Student: {record.studentName}
              </div>
            )}
          </div>
        ),
      },
      {
        title: 'Course',
        dataIndex: 'courseName',
        key: 'courseName',
        render: text => <span>{text}</span>,
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        render: (status) => (
          <span>
            {getStatusIcon(status)} {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        ),
      },
      {
        title: 'Due Date',
        dataIndex: 'dueDate',
        key: 'dueDate',
        render: date => date ? formatTimestampForDisplay(date, 'date') : 'No due date',
      }
    ];
    
    // Add type-specific columns
    switch (type) {
      case 'Quiz':
      case 'Exam':
        return [
          ...baseColumns,
          {
            title: 'Score',
            key: 'score',
            render: (_, record) => (
              record.submitted ? (
                <div>
                  <div>{record.score}/{record.maxScore} ({Math.round((record.score / record.maxScore) * 100)}%)</div>
                  {record.isLate && <div style={{ color: '#f5222d', fontSize: '0.8rem' }}>Late submission</div>}
                </div>
              ) : 'Not submitted'
            ),
          },
          {
            title: 'Time Spent',
            dataIndex: 'timeSpent',
            key: 'timeSpent',
            render: time => time ? `${Math.round(time)} min` : 'N/A',
          }
        ];
      case 'Project':
        return [
          ...baseColumns,
          {
            title: 'Score',
            key: 'score',
            render: (_, record) => (
              record.submitted ? (
                <div>
                  <div>{record.score}/{record.maxScore} ({Math.round((record.score / record.maxScore) * 100)}%)</div>
                  {record.isLate && <div style={{ color: '#f5222d', fontSize: '0.8rem' }}>Late submission</div>}
                </div>
              ) : 'Not submitted'
            ),
          },
          {
            title: 'Weight',
            dataIndex: 'weight',
            key: 'weight',
            render: weight => `${weight}x`,
          },
          {
            title: 'Submission Date',
            dataIndex: 'submissionDate',
            key: 'submissionDate',
            render: date => date ? formatTimestampForDisplay(date, 'date') : 'Not submitted',
          }
        ];
      case 'Participation':
        return [
          ...baseColumns,
          {
            title: 'Score',
            key: 'score',
            render: (_, record) => (
              record.submitted ? (
                <div>
                  <div>{record.score}/{record.maxScore} ({Math.round((record.score / record.maxScore) * 100)}%)</div>
                </div>
              ) : 'Not submitted'
            ),
          }
        ];
      default:
        return baseColumns;
    }
  };

  // Render metrics for each assignment type
  const renderTypeMetrics = (type) => {
    const metrics = typeMetrics[type];
    
    if (!metrics) {
      return <Empty description={`No ${type} assignments found`} />;
    }
    
    return (
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="Completion Rate" 
              value={Math.round(metrics.completionRate)} 
              suffix="%" 
              precision={0}
            />
            <Progress 
              percent={Math.round(metrics.completionRate)} 
              status={metrics.completionRate < 60 ? "exception" : "normal"} 
              showInfo={false}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="Average Score" 
              value={Math.round(metrics.avgScore)} 
              suffix={`/${type === 'Participation' ? 10 : 100}`}
              precision={0}
            />
            <Progress 
              percent={type === 'Participation' ? Math.round(metrics.avgScore * 10) : Math.round(metrics.avgScore)} 
              status={metrics.avgScore < 60 ? "exception" : "normal"} 
              showInfo={false}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="Average Time Spent" 
              value={Math.round(metrics.avgTime)} 
              suffix="min"
              precision={0}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic 
              title="Late Submissions" 
              value={metrics.lateSubmissions} 
              suffix={`/${metrics.completed}`}
            />
            {metrics.completed > 0 && (
              <Progress 
                percent={Math.round(metrics.lateRate)} 
                status="exception" 
                showInfo={false}
              />
            )}
          </Card>
        </Col>
      </Row>
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <Spin size="large" />
        <p>Loading assignment data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Assignments"
        description={error}
        type="error"
        showIcon
      />
    );
  }

  return (
    <div className={styles.assignmentAnalytics}>
      <div className={styles.filters}>
        <div className={styles.filterItem}>
          <label>Student:</label>
          <Select 
            value={selectedStudent} 
            onChange={setSelectedStudent}
            style={{ width: 200 }}
          >
            <Option value="all">All Students</Option>
            {students.map(student => (
              <Option key={student.id} value={student.id}>
                {student.firstName} {student.lastName}
              </Option>
            ))}
          </Select>
        </div>
        <div className={styles.filterItem}>
          <label>Course:</label>
          <Select 
            value={selectedCourse} 
            onChange={setSelectedCourse}
            style={{ width: 200 }}
          >
            <Option value="all">All Courses</Option>
            {courses.map(course => (
              <Option key={course.id} value={course.id}>
                {course.courseName || course.name}
              </Option>
            ))}
          </Select>
        </div>
      </div>

      <Tabs defaultActiveKey="overview" className={styles.assignmentTabs}>
        <TabPane tab="Overview" key="overview">
          <div className={styles.overviewStats}>
            <Card title="Assignment Completion" className={styles.statsCard}>
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Statistic 
                    title="Total Assignments" 
                    value={assignments.length} 
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Completed" 
                    value={assignments.filter(a => a.status === 'completed').length} 
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Pending" 
                    value={assignments.filter(a => a.status === 'pending').length} 
                  />
                </Col>
                <Col span={6}>
                  <Statistic 
                    title="Overdue" 
                    value={assignments.filter(a => a.status === 'overdue').length} 
                  />
                </Col>
              </Row>
            </Card>
          </div>
          
          <div className={styles.assignmentTypeStats}>
            {Object.keys(assignmentsByType).map(type => (
              assignmentsByType[type].length > 0 && (
                <Card 
                  key={type} 
                  title={
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      {getTypeIcon(type)} <span style={{ marginLeft: 8 }}>{type} Assignments</span>
                    </div>
                  } 
                  className={styles.typeCard}
                >
                  {renderTypeMetrics(type)}
                </Card>
              )
            ))}
          </div>
        </TabPane>
        
        {Object.keys(assignmentsByType).map(type => (
          assignmentsByType[type].length > 0 && (
            <TabPane 
              tab={
                <span>
                  {getTypeIcon(type)} {type}
                </span>
              } 
              key={type}
            >
              <div className={styles.typeMetrics}>
                {renderTypeMetrics(type)}
              </div>
              
              <Table 
                dataSource={assignmentsByType[type]} 
                columns={getColumns(type)} 
                rowKey="id"
                pagination={{ pageSize: 10 }}
                className={styles.assignmentTable}
              />
            </TabPane>
          )
        ))}
      </Tabs>
    </div>
  );
};

export default AssignmentAnalytics;