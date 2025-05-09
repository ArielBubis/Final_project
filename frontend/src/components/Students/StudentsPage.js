import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card as AntCard, Row, Col, Spin, Empty, Alert, Select, Button, Input } from 'antd';
import { useNavigate } from 'react-router-dom';
import styles from '../../styles/modules/Students.module.css';
import StudentCard from './StudentCard';

const { Option } = Select;

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
  const { students, loading, error, fetchStudentsByTeacher } = useData();
  const { currentUser } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [teacherStudents, setTeacherStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Helper function to calculate grade based on score
  const calculateGrade = (score) => {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  // Fetch students dynamically based on the logged-in teacher's email
  useEffect(() => {
    const fetchStudents = async () => {
      if (currentUser?.email) {
        const studentsData = await fetchStudentsByTeacher(currentUser.email);
        // Transform student data to match the required format
        const formattedStudents = studentsData.map(student => ({
          id: student.id || student.studentId,
          name: `${student.firstName} ${student.lastName}`,
          grade: calculateGrade(student.scores?.average || 0),
          lastActive: student.lastAccessed ? new Date(student.lastAccessed).toISOString() : new Date().toISOString(),
          performance: Math.round(student.scores?.average || 0)
        }));
        setTeacherStudents(formattedStudents);
      }
    };

    fetchStudents();
  }, [currentUser, fetchStudentsByTeacher]);

  // Get all courses taught by the teacher (optionally filtered by search)
  const teacherCourses = useMemo(() => {
    const allCourses = new Set();
    teacherStudents.forEach(student => {
      (student.courses || []).forEach(course => {
        if (course.courseId && course.courseName) {
          allCourses.add(JSON.stringify({ id: course.courseId, name: course.courseName }));
        }
      });
    });
    return Array.from(allCourses).map(str => JSON.parse(str));
  }, [teacherStudents]);

  // Filter students by search and course
  const filteredStudents = useMemo(() => {
    return teacherStudents.filter(student => {
      const name = student.name.toLowerCase();
      const matchesName = name.includes(searchTerm.toLowerCase());
      const matchesCourse = selectedCourse === 'all' || (student.courses || []).some(c => c.courseId === selectedCourse);
      return matchesName && matchesCourse;
    });
  }, [teacherStudents, searchTerm, selectedCourse]);

  // Handler for student selection change
  const handleStudentChange = useCallback((studentId) => {
    const student = teacherStudents.find((s) => s.id === studentId);
    setSelectedStudent(student || null);
  }, [teacherStudents]);

  // Handler to reset filters and selection
  const handleReset = () => {
    setSelectedStudent(null);
    setSelectedCourse('all');
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
        <Col xs={24} md={8}>
          <Select
            showSearch
            placeholder="Search or select student"
            value={selectedStudent?.id}
            onChange={handleStudentChange}
            className={styles.selectControl}
            filterOption={(input, option) => {
              const student = teacherStudents.find(s => s.id === option.value);
              if (!student) return false;
              const name = student.name.toLowerCase();
              return name.includes(input.toLowerCase());
            }}
            optionFilterProp="children"
            allowClear
            showArrow
            dropdownStyle={{ maxHeight: 300, overflow: 'auto' }}
          >
            {teacherStudents
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((student) => (
                <Option key={student.id} value={student.id}>
                  {student.name}
                </Option>
              ))}
          </Select>
        </Col>
        <Col xs={24} md={8}>
          <Select
            placeholder="Filter by course"
            value={selectedCourse}
            onChange={setSelectedCourse}
            className={styles.selectControl}
          >
            <Option value="all">All Courses</Option>
            {teacherCourses
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map(course => (
                <Option key={course.id} value={course.id}>{course.name}</Option>
              ))}
          </Select>
        </Col>
        <Col xs={24} md={8} style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
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