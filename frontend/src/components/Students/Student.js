import React, { useState, useEffect } from 'react';
import { Card as AntCard, Spin, Empty, Alert, Button, Select, Row, Col } from 'antd';
import { useParams } from 'react-router-dom';
import styles from '../../styles/modules/Students.module.css';
import { useStudentData } from './hooks/useStudentData';
import { useRiskAssessment } from '../../hooks/useRiskAssessment';
import { getCourseRiskData } from '../../services/riskPredictionService';
import DebugCard from './components/DebugCard';
import StudentInfo from './components/StudentInfo';
import StudentPerformance from './components/StudentPerformance';
import CoursePerformanceCard from './components/CoursePerformanceCard';
import debugLogger from '../../utils/debugLogger';

const Student = () => {
  const { id } = useParams();
  const [showDebug, setShowDebug] = useState(false); // Set to false in production
  const [selectedCourse, setSelectedCourse] = useState('all'); // Course filter state
  const [courseRiskData, setCourseRiskData] = useState([]);
  const [riskDataLoading, setRiskDataLoading] = useState(true);
  
  // Simplified data fetching with broken circular dependencies
  const { student, loading, error, debugInfo } = useStudentData(id);
  
  // Separate risk assessment calculation - breaking circular dependencies
  const riskAssessment = useRiskAssessment(student);
  
  // Fetch course-specific risk data
  useEffect(() => {
    const fetchCourseRiskData = async () => {
      try {
        setRiskDataLoading(true);
        const riskData = await getCourseRiskData();
        setCourseRiskData(riskData);
      } catch (error) {
        console.error('Error fetching course risk data:', error);
        setCourseRiskData([]);
      } finally {
        setRiskDataLoading(false);
      }
    };

    fetchCourseRiskData();
  }, []);
  
  // Combine student data with risk assessment
  const enrichedStudent = student ? { 
    ...student, 
    ...riskAssessment 
  } : null;  // Filter courses based on selection and exclude courses with 0 overall score
  const filteredCourses = enrichedStudent?.courses ? 
    enrichedStudent.courses.filter(course => {
      // First filter out courses with 0 overall score
      const hasValidScore = course.summary && 
        typeof course.summary.overallScore === 'number' && 
        course.summary.overallScore > 0;
      
      if (!hasValidScore) {
        console.log(`Student: Filtering out course "${course.courseName || course.name}" - invalid score: ${course.summary?.overallScore}`);
        return false;
      }
      
      // Then apply course selection filter
      const passesSelection = selectedCourse === 'all' || course.id === selectedCourse;
      if (!passesSelection) {
        console.log(`Student: Filtering out course "${course.courseName || course.name}" - not selected`);
      }
      return passesSelection;
    })
    : [];

  console.log(`Student: Filtered ${enrichedStudent?.courses?.length || 0} courses down to ${filteredCourses.length} courses`);

  // Generate course filter options (only for courses with scores > 0)
  const validCourses = (enrichedStudent?.courses || []).filter(course => 
    course.summary && 
    typeof course.summary.overallScore === 'number' && 
    course.summary.overallScore > 0
  );
    const courseOptions = [
    { value: 'all', label: 'All Courses' },
    ...validCourses.map(course => ({
      value: course.id,
      label: course.courseName || 'Unnamed Course'
    }))
  ];
  
  // Reset selected course if it's no longer valid after filtering
  useEffect(() => {
    if (selectedCourse !== 'all' && !validCourses.find(course => course.id === selectedCourse)) {
      setSelectedCourse('all');
    }
  }, [selectedCourse, validCourses]);
  
  if (loading || riskDataLoading) {
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
        <DebugCard debugInfo={debugInfo} show={showDebug} />
      </div>
    );
  }
  if (!enrichedStudent) {
    return <Empty description="No student data found" />;
  }

  // Log the student object for debugging
  debugLogger.logDebug('Student component', 'Render with data', {
    studentId: id,
    hasStudent: !!enrichedStudent,
    courses: enrichedStudent?.courses?.length || 0,
    loading,
    hasError: !!error,
  });
  
  return (
    <div className={styles.studentsPageContainer}>
      
      <AntCard title="Debug Controls" style={{ marginBottom: 16 }}>
        <Button 
          type={showDebug ? "primary" : "default"} 
          onClick={() => setShowDebug(!showDebug)}
        >
          {showDebug ? "Hide Debug Info" : "Show Debug Info"}
        </Button>
      </AntCard> 
      
      {showDebug && <DebugCard debugInfo={debugInfo} show={true} />}
      
      {/* Main content row with two columns */}      <Row gutter={[16, 16]} className={styles.mainContentRow}>
        {/* Left column: Student Info */}
        <Col xs={24} lg={12} className={styles.columnFlex}>
          <StudentInfo 
            student={enrichedStudent} 
            debugInfo={debugInfo} 
            className={styles.fullWidth}
          />
        </Col>
        
        {/* Right column: Student Performance */}
        <Col xs={24} lg={12} className={styles.columnFlex}>
          <StudentPerformance 
            student={enrichedStudent} 
            className={styles.fullWidth}
          />
        </Col>
      </Row>

      {/* Course Performance section - full width */}      <div className={styles.coursePerformanceSection}>
        <h2 className={styles.title}>Course Performance</h2>
        
        {/* Course Filter */}
        <AntCard className={styles.courseFilterCard}>
          <div className={styles.courseFilterContainer}>
            <span className={styles.courseFilterLabel}>Filter by Course:</span>
            <Select
              value={selectedCourse}
              onChange={setSelectedCourse}
              options={courseOptions}
              className={styles.courseFilterSelect}
              placeholder="Select a course"
            />
          </div>
        </AntCard>
        
        {/* Course Cards Grid */}
        <Row gutter={[16, 16]}>
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course, index) => (
              <Col xs={24} key={course?.id || index}>
                <CoursePerformanceCard 
                  course={course}
                  studentId={id}
                  riskData={courseRiskData}
                />
              </Col>
            ))
          ) : (
            <Col span={24}>
              <Empty description={
                selectedCourse === 'all' 
                  ? `No courses found${enrichedStudent?.courses ? '' : ' - courses array is missing'}` 
                  : 'No course data found for the selected course'
              } />
            </Col>
          )}
        </Row>
      </div>
    </div>
  );
};

export default Student;