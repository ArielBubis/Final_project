import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card as AntCard, Row, Col, Spin, Empty, Alert, Button, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import { getStudentName } from '../../utils/studentUtils';
import styles from '../../styles/modules/Students.module.css';
import { StudentCard } from '../features';

const IndividualStudentReport = ({ selectedStudent }) => {
  const { t } = useLanguage();
  
  if (!selectedStudent) {
    return <Empty description={t("StudentsPage", "Select a student to view performance details")} />;
  }

  return (
    <AntCard title={t("StudentsPage", "Selected Student Details")} className={styles.detailCard}>
      <p><strong>{t("Student", "Name")}:</strong> {getStudentName(selectedStudent)}</p>
      <p><strong>{t("Student", "Email")}:</strong> {selectedStudent.email}</p>
      <p><strong>{t("Student", "Gender")}:</strong> {selectedStudent.gender || 'N/A'}</p>
      <p><strong>{t("Student", "Courses Enrolled")}:</strong> {selectedStudent.courseCount || 0}</p>
    </AntCard>
  );
};

const StudentsPage = () => {
  const { fetchStudentsByTeacher } = useData();
  const { currentUser } = useAuth();
  const { t } = useLanguage();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [teacherStudents, setTeacherStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Helper function to calculate grade based on score
  const calculateGrade = (score) => {
    return Math.round(score / 10) * 10;
  };

  // Check if cached data is still valid (within 5 minutes)
  const isCachedDataValid = () => {
    const timestamp = sessionStorage.getItem('teacherDataTimestamp');
    if (!timestamp) return false;
    
    const cacheTime = new Date(timestamp);
    const now = new Date();
    const fiveMinutes = 5 * 60 * 1000;
    
    return (now - cacheTime) < fiveMinutes;
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if we already have data from a previous navigation
        // This prevents refetching when navigating between pages
        if (teacherStudents.length > 0) {
          console.log('StudentsPage: Using existing teacher students data');
          setLoading(false);
          return;
        }
        
        // Try to use cached data first
        const cachedStudents = sessionStorage.getItem('teacherStudents');
        if (cachedStudents && isCachedDataValid()) {
          console.log('StudentsPage: Using cached student data');
          const parsedStudents = JSON.parse(cachedStudents);
          setTeacherStudents(parsedStudents);
          setLoading(false);
          return;
        }
        
        // If no valid cached data, fetch fresh data
        console.log('StudentsPage: Fetching fresh student data');
        if (currentUser?.uid) {
          // Use the optimized DataContext function which has better caching
          const studentsData = await fetchStudentsByTeacher(currentUser.uid);
          
          const formattedStudents = studentsData.map(student => ({
            id: student.id || student.studentId,
            name: getStudentName(student),
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            grade: calculateGrade(student.scores?.average || 0),
            lastActive: student.lastAccessed ? new Date(student.lastAccessed).toISOString() : new Date().toISOString(),
            performance: Math.round(student.scores?.average || 0),
            courseCount: student.courseCount || 0
          }));
          
          setTeacherStudents(formattedStudents);
          
          // Cache the fresh data
          sessionStorage.setItem('teacherStudents', JSON.stringify(formattedStudents));
          sessionStorage.setItem('teacherDataTimestamp', new Date().toISOString());
        }
      } catch (err) {
        console.error('StudentsPage: Error fetching students:', err);
        setError('Failed to load students data');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [currentUser, fetchStudentsByTeacher]);

  // Listen for storage changes (when MainPage updates the cache)
  useEffect(() => {
    const handleStorageChange = () => {
      const cachedStudents = sessionStorage.getItem('teacherStudents');
      if (cachedStudents && isCachedDataValid()) {
        console.log('StudentsPage: Detected updated cached data');
        const parsedStudents = JSON.parse(cachedStudents);
        setTeacherStudents(parsedStudents);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Filter students by search term only
  const filteredStudents = useMemo(() => {
    return teacherStudents.filter(student => {
      const name = student.name.toLowerCase();
      return name.includes(searchTerm.toLowerCase());
    });
  }, [teacherStudents, searchTerm]);
  // Handler to reset filters and selection
  const handleReset = () => {
    setSearchTerm('');
  };

  const handleViewStudent = (student) => {
    sessionStorage.setItem('selectedStudent', JSON.stringify(student));
    navigate(`/students/${student.id}`);
  };

  if (loading) {
    return <Spin size="large" tip={t("StudentsPage", "Loading student data...")} />;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <div className={styles.studentsPageContainer}>
      <h1 className={styles.title}>{t("StudentsPage", "My Students")}</h1>
      <Row gutter={[16, 16]} className={styles.filterControls}>
        <Col xs={24} md={12}>
          <Input.Search
            placeholder={t("StudentsPage", "Search students by name...")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            className={styles.selectControl}
          />
        </Col>
        <Col xs={24} md={12} style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <Button onClick={handleReset} className={styles.resetButton}>
            {t("StudentsPage", "Reset")}
          </Button>
        </Col>
      </Row>

      <div className={styles.studentsList}>
        {filteredStudents.length > 0 ? (
          <div className={styles.studentGrid}>
            {filteredStudents.map((student) => (
              <StudentCard
                key={student.id}
                student={student}
              />
            ))}
          </div>
        ) : (
          <Empty description={t("StudentsPage", "No students found")} />
        )}
      </div>
      <IndividualStudentReport selectedStudent={selectedStudent} />
    </div>
  );
};

export default StudentsPage;