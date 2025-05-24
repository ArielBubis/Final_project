import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card as AntCard, Row, Col, Spin, Empty, Alert, Button, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import styles from '../../styles/modules/Students.module.css';
import StudentCard from './StudentCard';

const IndividualStudentReport = ({ selectedStudent }) => {
  if (!selectedStudent) {
    return <Empty description="Select a student to view performance details" />;
  }

  return (
    <AntCard title="Selected Student Details" className={styles.detailCard}>
      <p><strong>Name:</strong> {`${selectedStudent.firstName} ${selectedStudent.lastName}`}</p>
      <p><strong>Email:</strong> {selectedStudent.email}</p>
      <p><strong>Gender:</strong> {selectedStudent.gender || 'N/A'}</p>
      <p><strong>Courses Enrolled:</strong> {selectedStudent.courseCount || 0}</p>
    </AntCard>
  );
};

const StudentsPage = () => {
  const { fetchStudentsByTeacher } = useData();
  const { currentUser } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [teacherStudents, setTeacherStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Helper function to calculate grade based on score
  const calculateGrade = (score) => {
    return Math.round(score / 10) * 10; // Round to nearest 10
  };  // Fetch students dynamically based on the logged-in teacher's UID
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (currentUser?.uid) {
          console.log('StudentsPage: Fetching students for UID:', currentUser.uid);
          const studentsData = await fetchStudentsByTeacher(currentUser.uid);
          console.log('StudentsPage: Received students data:', studentsData);
          
          // Transform student data to match the required format
          const formattedStudents = studentsData.map(student => ({
            id: student.id || student.studentId,
            name: `${student.firstName} ${student.lastName}`,
            firstName: student.firstName,
            lastName: student.lastName,
            email: student.email,
            grade: calculateGrade(student.scores?.average || 0),
            lastActive: student.lastAccessed ? new Date(student.lastAccessed).toISOString() : new Date().toISOString(),
            performance: Math.round(student.scores?.average || 0),
            courseCount: student.courseCount || 0
          }));
          
          console.log('StudentsPage: Formatted students:', formattedStudents);
          setTeacherStudents(formattedStudents);
        }
      } catch (err) {
        console.error('StudentsPage: Error fetching students:', err);
        setError('Failed to load students data');
      } finally {
        setLoading(false);
      }    };

    fetchStudents();
  }, [currentUser, fetchStudentsByTeacher]);

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
    return <Spin size="large" tip="Loading student data..." />;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }
  return (
    <div className={styles.studentsPageContainer}>
      <h1 className={styles.title}>Students</h1>
      <Row gutter={[16, 16]} className={styles.filterControls}>
        <Col xs={24} md={12}>
          <Input.Search
            placeholder="Search students by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            className={styles.selectControl}
          />
        </Col>
        <Col xs={24} md={12} style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <Button onClick={handleReset} className={styles.resetButton}>
            Reset
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
          <Empty description="No students found" />
        )}
      </div>

      <IndividualStudentReport selectedStudent={selectedStudent} />
    </div>
  );
};

export default StudentsPage;