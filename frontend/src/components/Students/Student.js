import React, { useEffect, useState } from 'react';
import { Card as AntCard, Spin, Empty, Statistic, Row, Col, Progress, Table, Alert } from 'antd';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../../contexts/DataContext';
import { db } from '../../firebaseConfig';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import styles from '../../styles/modules/Students.module.css';

// Import our visualization components
import RadarChart from '../Visualization/RadarChart';
import PerformanceMetricsLegend from '../Visualization/PerformanceMetricsLegend';
import { generateRadarChartData } from '../../utils/dataProcessingUtils';

const Student = () => {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState({});
  const navigate = useNavigate();
  
  const { 
    fetchStudentAssignments,
    fetchModuleProgress,
    currentUser 
  } = useData();

  useEffect(() => {
    const loadStudentData = async () => {
      setLoading(true);
      setDebugInfo({});
      
      try {
        if (!id) {
          console.error("No student ID provided");
          navigate('/students');
          return;
        }

        console.log("Starting to fetch data for student ID:", id);

        // First get the student document
        console.log("Fetching student document...");
        const studentDoc = await getDoc(doc(db, 'students', id));
        if (!studentDoc.exists()) {
          throw new Error("Student not found");
        }
        const studentData = studentDoc.data();
        console.log("Student document data:", studentData);
        setDebugInfo(prev => ({ ...prev, studentData }));

        // Get the user data for this student
        console.log("Fetching user data for userId:", studentData.userId);
        const userDoc = await getDoc(doc(db, 'users', studentData.userId));
        if (!userDoc.exists()) {
          throw new Error("User data not found");
        }
        const userData = userDoc.data();
        console.log("User document data:", userData);
        setDebugInfo(prev => ({ ...prev, userData }));

        // Get enrollments for this student
        console.log("Fetching enrollments...");
        const enrollmentsRef = collection(db, 'enrollments');
        const enrollmentsQuery = query(enrollmentsRef, where('studentId', '==', id));
        const enrollmentsSnapshot = await getDocs(enrollmentsQuery);
        const enrollments = enrollmentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log("Enrollments data:", enrollments);
        setDebugInfo(prev => ({ ...prev, enrollments }));

        // Get student progress data
        console.log("Fetching student progress data...");
        const studentProgressDoc = await getDoc(doc(db, 'studentProgress', id));
        const progressData = studentProgressDoc.exists() ? studentProgressDoc.data() : {};
        console.log("Student progress data:", progressData);
        setDebugInfo(prev => ({ ...prev, progressData }));

        // Get detailed course data for each enrollment
        console.log("Fetching detailed course data...");
        const coursesData = await Promise.all(
          enrollments.map(async (enrollment) => {
            console.log(`Fetching course data for courseId: ${enrollment.courseId}`);
            const courseDoc = await getDoc(doc(db, 'courses', enrollment.courseId));
            const courseData = courseDoc.exists() ? courseDoc.data() : {};
            console.log(`Course data for ${enrollment.courseId}:`, courseData);
            
            // Get course progress
            const courseProgress = progressData.courses?.[enrollment.courseId] || {};
            const courseSummary = courseProgress.summary || {};
            console.log(`Course progress for ${enrollment.courseId}:`, courseProgress);
            
            // Get module progress
            const modulesProgress = courseProgress.modules || {};
            console.log(`Fetching modules for course ${enrollment.courseId}...`);
            const modulesData = await Promise.all(
              Object.entries(modulesProgress).map(async ([moduleId, moduleProgress]) => {
                console.log(`Fetching module ${moduleId} data...`);
                const moduleDoc = await getDoc(doc(db, 'courses', enrollment.courseId, 'modules', moduleId));
                const moduleData = moduleDoc.exists() ? moduleDoc.data() : {};
                console.log(`Module ${moduleId} data:`, moduleData);
                return {
                  id: moduleId,
                  ...moduleData,
                  progress: moduleProgress
                };
              })
            );

            // Get assignment progress
            const assignmentsProgress = courseProgress.assignments || {};
            console.log(`Fetching assignments for course ${enrollment.courseId}...`);
            const assignmentsData = await Promise.all(
              Object.entries(assignmentsProgress).map(async ([assignmentId, assignmentProgress]) => {
                console.log(`Fetching assignment ${assignmentId} data...`);
                const assignmentDoc = await getDoc(doc(db, 'courses', enrollment.courseId, 'assignments', assignmentId));
                const assignmentData = assignmentDoc.exists() ? assignmentDoc.data() : {};
                console.log(`Assignment ${assignmentId} data:`, assignmentData);
                return {
                  id: assignmentId,
                  ...assignmentData,
                  progress: assignmentProgress
                };
              })
            );

            return {
              id: enrollment.courseId,
              ...courseData,
              enrollment,
              summary: courseSummary,
              modules: modulesData,
              assignments: assignmentsData
            };
          })
        );
        console.log("All courses data:", coursesData);
        setDebugInfo(prev => ({ ...prev, coursesData }));

        // Calculate overall metrics
        let totalScore = 0;
        let totalCompletion = 0;
        let courseCount = 0;
        let lastAccessed = null;

        coursesData.forEach(course => {
          if (course.summary) {
            if (course.summary.overallScore !== undefined) {
              totalScore += course.summary.overallScore;
            }
            if (course.summary.overallCompletion !== undefined) {
              totalCompletion += course.summary.overallCompletion;
            }
            if (course.summary.lastAccessed) {
              const accessDate = new Date(course.summary.lastAccessed.toDate());
              if (!lastAccessed || accessDate > lastAccessed) {
                lastAccessed = accessDate;
              }
            }
            courseCount++;
          }
        });

        // Calculate averages
        const averageScore = courseCount > 0 ? totalScore / courseCount : 0;
        const completionRate = courseCount > 0 ? totalCompletion / courseCount : 0;

        // Combine all data
        const enrichedStudentData = {
          id: id,
          userId: studentData.userId,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          gender: userData.gender,
          courses: coursesData,
          averageScore,
          completionRate,
          lastAccessed: lastAccessed?.toISOString() || new Date().toISOString(),
          courseCount: enrollments.length,
          isAtRisk: averageScore < 60 || completionRate < 50,
          riskReasons: [
            averageScore < 60 && "Low average score",
            completionRate < 50 && "Low completion rate",
            coursesData.some(course => 
              course.assignments.some(assignment => !assignment.progress.submittedAt)
            ) && "Missing assignments"
          ].filter(Boolean)
        };

        console.log("Final enriched student data:", enrichedStudentData);
        console.log("Student Data:", studentData);
        setStudent(enrichedStudentData);
      } catch (err) {
        console.error("Error in loadStudentData:", err);
        setError(`Error loading student data: ${err.message}`);
        setDebugInfo(prev => ({ ...prev, error: err.message, errorStack: err.stack }));
      } finally {
        setLoading(false);
      }
    };
  
    loadStudentData();
  }, [id, navigate, fetchStudentAssignments, fetchModuleProgress, currentUser]);

  // Generate radar chart data from student performance
  const radarChartData = student ? generateRadarChartData(student) : [];
  
  // Format metrics for the legend component
  const performanceMetrics = student ? [
    { name: 'Overall Score', value: student.averageScore || 0 },
    { name: 'Course Completion', value: student.completionRate || 0 },
    { name: 'Module Completion', value: student.courses.reduce((sum, course) => 
      sum + (course.modules.filter(m => m.progress.completion === 100).length / course.modules.length * 100), 0) / student.courses.length || 0
    },
    { name: 'Assignment Completion', value: student.courses.reduce((sum, course) => 
      sum + (course.assignments.filter(a => a.progress.submittedAt).length / course.assignments.length * 100), 0) / student.courses.length || 0
    }
  ] : [];

  if (loading) {
    return <Spin size="large" tip="Loading student details..." />;
  }

  if (error) {
    return (
      <div>
        <Alert
          message="Error Loading Student Data"
          description={error}
          type="error"
          showIcon
        />
        <AntCard title="Debug Information" className={styles.debugCard}>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </AntCard>
      </div>
    );
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
        <p><strong>Courses Enrolled:</strong> {student.courseCount}</p>
        <p><strong>Average Score:</strong> {Math.round(student.averageScore)}%</p>
        {student.isAtRisk && (
          <div className={styles.riskAlert}>
            <h3>At Risk</h3>
            <ul>
              {student.riskReasons.map((reason, idx) => (
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

      <h2 className={styles.title}>Course Performance</h2>
      {student.courses.map((course, index) => (
        <AntCard key={course.id} title={course.courseName} className={styles.courseCard}>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Statistic
                title="Overall Score"
                value={`${Math.round(course.summary.overallScore || 0)}%`}
                valueStyle={{ color: (course.summary.overallScore || 0) > 70 ? '#3f8600' : ((course.summary.overallScore || 0) > 50 ? '#faad14' : '#cf1322') }}
              />
            </Col>
            <Col xs={24} md={8}>
              <Statistic
                title="Completion Rate"
                value={`${Math.round(course.summary.overallCompletion || 0)}%`}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col xs={24} md={8}>
              <Statistic
                title="Last Accessed"
                value={course.summary.lastAccessed ? new Date(course.summary.lastAccessed.toDate()).toLocaleDateString() : 'Never'}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
          </Row>

          <h3>Module Progress</h3>
          <Row gutter={[16, 16]}>
            {course.modules.map((module) => (
              <Col xs={24} md={8} key={module.id}>
                <AntCard title={module.moduleTitle} size="small">
                  <Progress 
                    percent={Math.round(module.progress.completion || 0)} 
                    status={module.progress.completion === 100 ? "success" : "active"}
                  />
                  <p><strong>Expertise Rate:</strong> {Math.round(module.progress.totalExpertiseRate || 0)}%</p>
                  <p><strong>Last Accessed:</strong> {module.progress.lastAccessed ? new Date(module.progress.lastAccessed.toDate()).toLocaleDateString() : 'Never'}</p>
                </AntCard>
              </Col>
            ))}
          </Row>

          <h3>Assignment Progress</h3>
          <Table
            dataSource={course.assignments}
            columns={[
              {
                title: 'Assignment',
                dataIndex: 'title',
                key: 'title',
              },
              {
                title: 'Score',
                dataIndex: 'progress',
                key: 'score',
                render: (progress) => progress.totalScore ? `${Math.round(progress.totalScore)}%` : 'Not submitted'
              },
              {
                title: 'Submitted',
                dataIndex: 'progress',
                key: 'submitted',
                render: (progress) => progress.submittedAt ? new Date(progress.submittedAt.toDate()).toLocaleDateString() : 'Not submitted'
              },
              {
                title: 'Time Spent',
                dataIndex: 'progress',
                key: 'time',
                render: (progress) => progress.totalTime ? `${Math.round(progress.totalTime / 60)} minutes` : 'N/A'
              }
            ]}
            pagination={false}
            size="small"
          />
        </AntCard>
      ))}
    </div>
  );
};

export default Student;