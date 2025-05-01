import React, { useEffect, useState, useMemo } from 'react';
import { Card as AntCard, Spin, Empty, Statistic, Row, Col } from 'antd';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import styles from '../../styles/modules/Students.module.css';
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig"; // Corrected import path
import { useData } from '../../contexts/DataContext'; // Import the DataContext

// Define the missing `average` function
const average = (values) => {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

// Define placeholder values for class averages based on TeacherOverview.js
const classAvgCompletion = 75; // Example value
const classAvgScore = 80; // Example value
const classAvgSubmissionRate = 85; // Example value
const classAvgExpertiseRate = 70; // Example value
const classAvgTimeSpent = 60; // Example value

const Student = () => {
  const [student, setStudent] = useState(null);
  const [radarData, setRadarData] = useState([]);
  const navigate = useNavigate();
  const { fetchCourseStats } = useData(); // Use fetchCourseStats from DataContext
  const [coursePerformance, setCoursePerformance] = useState([]);

  useEffect(() => {
    const loadStudentData = async () => {
      const storedStudent = sessionStorage.getItem('selectedStudent');
      if (storedStudent) {
        const parsedStudent = JSON.parse(storedStudent);
        setStudent(parsedStudent);
  
        const studentCourses = parsedStudent.courses || [];
        const coursePerformanceData = [];
  
        console.log('Student Courses:', studentCourses);
  
        for (const course of studentCourses) {
          try {
            // Ensure courseId is properly defined
            const courseId = course?.id || course?.courseId;
            if (!courseId) {
              console.warn('Course ID is missing for a course:', course);
              continue;
            }
  
            // Fetch course stats using fetchCourseStats
            const courseStats = await fetchCourseStats(courseId);
  
            // Fetch course details (e.g., name) from the courses collection
            const courseDoc = await getDoc(doc(db, 'courses', courseId));
            const courseDetails = courseDoc.exists() ? courseDoc.data() : {};
  
            coursePerformanceData.push({
              courseName: courseDetails.name || 'Unknown Course',
              completion: courseStats.averageCompletion || 0,
              score: courseStats.averageScore || 0,
              submissionRate: courseStats.activeRatio30Days * 100 || 0, // Example metric
              expertiseRate: courseStats.activeRatio7Days * 100 || 0, // Example metric
              timeSpent: courseStats.studentCount * 10 || 0 // Example metric
            });
          } catch (error) {
            console.error(`Error fetching progress for course ${course?.id || course?.courseId}:`, error);
          }
        }
  
        setCoursePerformance(coursePerformanceData);
  
        // Calculate radarData after coursePerformanceData is populated
        const radarData = [
          { metric: 'Completion Rate', value: average(coursePerformanceData.map(c => c.completion)), classAverage: classAvgCompletion },
          { metric: 'Overall Score', value: average(coursePerformanceData.map(c => c.score)), classAverage: classAvgScore },
          { metric: 'Submission Rate', value: average(coursePerformanceData.map(c => c.submissionRate)), classAverage: classAvgSubmissionRate },
          { metric: 'Expertise Rate', value: average(coursePerformanceData.map(c => c.expertiseRate)), classAverage: classAvgExpertiseRate },
          { metric: 'Time Spent', value: average(coursePerformanceData.map(c => c.timeSpent)) > 0 ? 100 : 0, classAverage: classAvgTimeSpent > 0 ? 100 : 0 }
        ];
        setRadarData(radarData);
      } else {
        navigate('/students');
      }
    };
  
    loadStudentData();
  }, [navigate, fetchCourseStats]);

  const COLORS = useMemo(() => [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042',
    '#8884d8', '#82CA9D', '#8DD1E1', '#A4DE6C'
  ], []);

  if (!student) {
    return <Spin size="large" tip="Loading student details..." />;
  }


  return (
    <div className={styles.studentsPageContainer}>
      <h1 className={styles.title}>Student Details</h1>
      <AntCard title={`${student.firstName} ${student.lastName}`} className={styles.detailCard}>
        <p><strong>Email:</strong> {student.email}</p>
        <p><strong>Gender:</strong> {student.gender || 'N/A'}</p>
        <p><strong>Courses Enrolled:</strong> {student.courseCount || 0}</p>
        <p><strong>Average Score:</strong> {student.averageScore ? `${Math.round(student.averageScore)}%` : 'N/A'}</p>
      </AntCard>

      <h2 className={styles.title}>Student Progress Overview</h2>
      <AntCard title="Performance Metrics" className={styles.chartCard}>
        {radarData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Student Performance"
                  dataKey="value"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Radar
                  name="Class Average"
                  dataKey="classAverage"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.2}
                />
                <Legend />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
            <div className={styles.metricDescription}>
              <h3>Key Performance Metrics</h3>
              <p>The radar chart shows the student's performance across key metrics:</p>
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
          <Empty description="No performance data available" />
        )}
      </AntCard>

      <h2 className={styles.title}>Performance Details</h2>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <AntCard>
            <Statistic
              title="Overall Score"
              value={`${Math.round(student.score || 0)}%`}
              valueStyle={{ color: student.score > 70 ? '#3f8600' : (student.score > 50 ? '#faad14' : '#cf1322') }}
            />
          </AntCard>
        </Col>
        <Col xs={24} md={6}>
          <AntCard>
            <Statistic
              title="Completion Rate"
              value={`${Math.round(student.completion || 0)}%`}
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
      {coursePerformance.length > 0 ? (
        <Row gutter={[16, 16]}>
          {coursePerformance.map((course, index) => (
            <Col xs={24} md={8} key={index}>
              <AntCard title={course.courseName}>
                <p><strong>Completion:</strong> {course.completion}%</p>
                <p><strong>Score:</strong> {course.score}%</p>
                <p><strong>Submission Rate:</strong> {course.submissionRate}%</p>
                <p><strong>Expertise Rate:</strong> {course.expertiseRate}%</p>
                <p><strong>Time Spent:</strong> {course.timeSpent} minutes</p>
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