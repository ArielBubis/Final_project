import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card as AntCard, Row, Col, Table, Spin, Empty, Alert, Select, Statistic, Avatar, Button, Input } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import styles from '../../styles/modules/Students.module.css';

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

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png';

const StudentsPage = () => {
  const { students, loading, error, fetchStudentsByTeacher } = useData();
  const { currentUser } = useAuth();
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDisplayCount, setStudentDisplayCount] = useState(10);
  const [teacherStudents, setTeacherStudents] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  // Fetch students dynamically based on the logged-in teacher's email
  useEffect(() => {
    const fetchStudents = async () => {
      if (currentUser?.email) {
        const studentsData = await fetchStudentsByTeacher(currentUser.email);
        setTeacherStudents(studentsData);
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
      const name = `${student.firstName} ${student.lastName}`.toLowerCase();
      const matchesName = name.includes(searchTerm.toLowerCase());
      // Only show students who are enrolled in the selected course (if not 'all')
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
              const name = `${student.firstName} ${student.lastName}`.toLowerCase();
              return name.includes(input.toLowerCase());
            }}
            optionFilterProp="children"
            allowClear
            showArrow
            dropdownStyle={{ maxHeight: 300, overflow: 'auto' }}
          >
            {teacherStudents
              .slice()
              .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
              .map((student) => (
                <Option key={student.id} value={student.id}>
                  {`${student.firstName} ${student.lastName}`}
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
        <Col xs={24} md={8} style={{ dis play: 'flex', alignItems: 'center', marginBottom: 16 }}>
          <Button onClick={handleReset} className={styles.resetButton}>
            Reset
          </Button>
        </Col>
      </Row>
      <Row gutter={[16, 16]} className={styles.studentsList}>
        {filteredStudents.length > 0 ? (
          filteredStudents.map((student) => (
            <Col key={student.id || student.studentId} xs={24} sm={12} md={8} lg={6}>
              <AntCard className={styles.studentCard}>
                <div className={styles.studentCardContent}>
                  <Avatar
                    size={64}
                    src={student.avatarUrl || student.profileImage || DEFAULT_AVATAR}
                    icon={<UserOutlined />}
                    style={{ marginBottom: 12 }}
                  />
                  <div className={styles.studentName}>{student.firstName} {student.lastName}</div>
                  <div className={styles.studentEmail}>{student.email}</div>
                  <div>Courses: {student.courseCount || (student.courses ? student.courses.length : 0)}</div>
                  <div>Avg. Score: {student.averageScore ? Math.round(student.averageScore) : 'N/A'}%</div>
                  <Button
                    type="primary"
                    size="small"
                    className={styles.studentViewButton}
                    onClick={() => navigate(`/students/${student.id || student.studentId}`)}
                  >
                    View
                  </Button>
                </div>
              </AntCard>
            </Col>
          ))
        ) : (
          <Empty description="No students found" />
        )}
      </Row>

      <IndividualStudentReport selectedStudent={selectedStudent} />
    </div>
  );
};

export default StudentsPage;