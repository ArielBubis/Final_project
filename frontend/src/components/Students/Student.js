import React, { useEffect, useState } from 'react';
import { Card as AntCard, Spin, Empty, Statistic, Row, Col } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import styles from '../../styles/modules/Students.module.css';

// Import our new components and contexts
import RadarChart from '../Visualization/RadarChart';
import PerformanceMetricsLegend from '../Visualization/PerformanceMetricsLegend';
import { usePerformance } from '../../contexts/PerformanceContext';
import { generateRadarChartData } from '../../utils/dataProcessingUtils';

const Student = () => {
  const { id } = useParams(); // Get student ID from URL if available
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // Use the new Performance context
  const { getStudentPerformance } = usePerformance();

  useEffect(() => {
    const loadStudentData = async () => {
      setLoading(true);
      
      try {
        let studentId;
        let studentData = null;
        
        // First, check if we have a student ID in the URL
        if (id) {
          studentId = id;
        } else {
          // If no ID in URL, check for selected student in session storage
          const storedStudent = sessionStorage.getItem('selectedStudent');
          if (storedStudent) {
            const parsedStudent = JSON.parse(storedStudent);
            studentId = parsedStudent.studentId || parsedStudent.id;
            // We can use this as initial data while we fetch the full details
            studentData = parsedStudent;
          }
        }
        
        if (!studentId) {
          // If we still don't have an ID, navigate back to students list
          navigate('/students');
          return;
        }
        
        // Fetch student performance data from our new service
        const performanceData = await getStudentPerformance(studentId);
        
        // If we have performance data, use it; otherwise use what we have
        if (performanceData) {
          setStudent(performanceData);
        } else if (studentData) {
          setStudent(studentData);
        } else {
          throw new Error("Could not load student data");
        }
      } catch (err) {
        setError(`Error loading student data: ${err.message}`);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
  
    loadStudentData();
  }, [id, navigate, getStudentPerformance]);

  // Generate radar chart data from student performance
  const radarChartData = student ? generateRadarChartData(student) : [];
  
  // Format metrics for the legend component
  const performanceMetrics = student ? [
    { name: 'Overall Score', value: student.averageScore || 0 },
    { name: 'Course Completion', value: student.overallCompletion || 0 },
    { name: 'Submission Rate', value: student.submissionRate || 0 },
    { name: 'Expertise Rate', value: student.expertiseRate || 0 }
  ] : [];

  if (loading) {
    return <Spin size="large" tip="Loading student details..." />;
  }

  if (error) {
    return <Empty description={error} />;
  }

  if (!student) {
    return <Empty description="No student data found" />;
  }

  return (
    <div className={styles.studentsPageContainer}>
      <h1 className={styles.title}>Student Details</h1>
      <AntCard title={`${student.firstName} ${student.lastName}`} className={styles.detailCard}>
        <p><strong>Email:</strong> {student.email}</p>
        <p><strong>Gender:</strong> {student.gender || 'N/A'}</p>
        <p><strong>Courses Enrolled:</strong> {student.courseCount || 0}</p>
        <p><strong>Average Score:</strong> {student.averageScore ? `${Math.round(student.averageScore)}%` : 'N/A'}</p>
        {student.isAtRisk && (
          <div className={styles.riskAlert}>
            <h3>At Risk</h3>
            <ul>
              {student.riskReasons && student.riskReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </AntCard>

      <h2 className={styles.title}>Student Progress Overview</h2>
      <AntCard title="Performance Metrics" className={styles.chartCard}>
        {radarChartData.length > 0 ? (
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} md={12}>
              <RadarChart 
                data={radarChartData}
                width={400}
                height={400}
                showLegend={true}
                title="Performance Metrics"
              />
            </Col>
            <Col xs={24} md={12}>
              <PerformanceMetricsLegend metrics={performanceMetrics} />
            </Col>
          </Row>
        ) : (
          <Empty description="No performance data available" />
        )}
      </AntCard>

      <h2 className={styles.title}>Performance Details</h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <AntCard>
            <Statistic
              title="Overall Score"
              value={`${Math.round(student.averageScore || 0)}%`}
              valueStyle={{ color: (student.averageScore || 0) > 70 ? '#3f8600' : ((student.averageScore || 0) > 50 ? '#faad14' : '#cf1322') }}
            />
          </AntCard>
        </Col>
        <Col xs={24} md={6}>
          <AntCard>
            <Statistic
              title="Completion Rate"
              value={`${Math.round(student.overallCompletion || 0)}%`}
              valueStyle={{ color: '#1890ff' }}
            />
          </AntCard>
        </Col>
        <Col xs={24} md={6}>
          <AntCard>
            <Statistic
              title="Missing Assignments"
              value={student.missingAssignments || 0}
              valueStyle={{ color: (student.missingAssignments || 0) > 3 ? '#cf1322' : '#3f8600' }}
            />
          </AntCard>
        </Col>
        <Col xs={24} md={6}>
          <AntCard>
            <Statistic
              title="Time Spent"
              value={`${student.timeSpent || 0} mins`}
              valueStyle={{ color: '#722ed1' }}
            />
          </AntCard>
        </Col>
      </Row>
      
      <h2 className={styles.title}>Performance by Course</h2>
      {student.coursePerformance && student.coursePerformance.length > 0 ? (
        <Row gutter={[16, 16]}>
          {student.coursePerformance.map((course, index) => (
            <Col xs={24} md={8} key={index}>
              <AntCard title={course.courseName}>
                <p><strong>Completion:</strong> {Math.round(course.completion || 0)}%</p>
                <p><strong>Score:</strong> {Math.round(course.score || 0)}%</p>
                <p><strong>Submission Rate:</strong> {Math.round(course.submissionRate || 0)}%</p>
                <p><strong>Expertise Rate:</strong> {Math.round(course.expertiseRate || 0)}%</p>
                <p><strong>Time Spent:</strong> {course.timeSpent || 0} minutes</p>
              </AntCard>
            </Col>
          ))}
        </Row>
      ) : (
        <Empty description="No course performance data available" />
      )}
    </div>
  );
};

export default Student;