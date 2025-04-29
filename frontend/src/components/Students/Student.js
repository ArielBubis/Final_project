import React, { useEffect, useState } from 'react';
import { Card as AntCard, Spin, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import styles from '../../styles/modules/Students.module.css';

const Student = () => {
  const [student, setStudent] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Retrieve student details from session storage
    const storedStudent = sessionStorage.getItem('selectedStudent');
    if (storedStudent) {
      setStudent(JSON.parse(storedStudent));
    } else {
      // Redirect back to students page if no student is selected
      navigate('/students');
    }
  }, [navigate]);

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
    </div>
  );
};

export default Student;