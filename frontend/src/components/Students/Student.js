import React, { useEffect, useState } from 'react';
import { Card as AntCard, Spin, Empty, Alert, Button } from 'antd';
import { useParams } from 'react-router-dom';
import styles from '../../styles/modules/Students.module.css';
import { useStudentData } from './hooks/useStudentData';
import DebugCard from './components/DebugCard';
import StudentInfo from './components/StudentInfo';
import StudentPerformance from './components/StudentPerformance';
import CoursePerformanceCard from './components/CoursePerformanceCard';
import debugLogger from '../../utils/debugLogger';

const Student = () => {
  const { id } = useParams();
  const [showDebug, setShowDebug] = useState(false); // Set to false in production
  
  const { student, loading, error, debugInfo } = useStudentData(id);

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
        <DebugCard debugInfo={debugInfo} show={showDebug} />
      </div>
    );
  }

  if (!student) {
    return <Empty description="No student data found" />;
  }

  // Log the student object for debugging
  debugLogger.logDebug('Student component', 'Render with data', {
    studentId: id,
    hasStudent: !!student,
    courses: student?.courses?.length || 0,
    loading,
    hasError: !!error,
  });
  
  return (
    <div className={styles.studentsPageContainer}>
      <h1 className={styles.title}>Student Details</h1>
      
      <AntCard title="Debug Controls" style={{ marginBottom: 16 }}>
        <Button 
          type={showDebug ? "primary" : "default"} 
          onClick={() => setShowDebug(!showDebug)}
        >
          {showDebug ? "Hide Debug Info" : "Show Debug Info"}
        </Button>
      </AntCard>
      
      {showDebug && <DebugCard debugInfo={debugInfo} show={true} />}
      
      <StudentInfo student={student} debugInfo={debugInfo} />
      
      <h2 className={styles.title}>Student Progress Overview</h2>
      <StudentPerformance student={student} />
      
      <h2 className={styles.title}>Course Performance</h2>
      {student && Array.isArray(student.courses) && student.courses.length > 0 ? (
        student.courses.map((course, index) => (
          <CoursePerformanceCard 
            key={course?.id || index} 
            course={course} 
          />
        ))
      ) : (
        <Empty description={`No courses found${student?.courses ? '' : ' - courses array is missing'}`} />
      )}
    </div>
  );
};

export default Student;