import React, { useState, useEffect, useMemo } from 'react';
import { Card as AntCard, Row, Col, Button, Empty, Spin } from 'antd';
import { useData } from '../contexts/DataContext';
import { useNavigate } from 'react-router-dom';
import styles from '../styles/modules/Courses.module.css';

const TeacherCourses = () => {
  const { fetchTeacherCourses, loading, error, currentUser } = useData();
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      if (currentUser?.email) {
        const coursesData = await fetchTeacherCourses(currentUser.email);
        setCourses(coursesData);
      }
    };

    fetchCourses();
  }, [fetchTeacherCourses, currentUser]);

  const handleViewCourse = (course) => {
    navigate(`/courses/${course.courseId}`);
  };

  const coursesCards = useMemo(() => {
    console.log("Courses for rendering:", courses); // Debugging log
    return loading
      ? []
      : courses.map((course, idx) => (
          <Col key={idx} xs={24} sm={12} md={8} lg={6}>
            <AntCard className={styles.courseCard} title={course.courseName}>
              <p><strong>Subject Area:</strong> {course.subjectArea || 'N/A'}</p>
              <p><strong>Duration:</strong> {course.startDate} - {course.endDate}</p>
              <p><strong>Enrollments:</strong> {course.studentCount || 0}</p>
              <Button
                type="primary"
                size="small"
                onClick={() => handleViewCourse(course)}
              >
                View
              </Button>
            </AntCard>
          </Col>
        ));
  }, [courses, loading]);

  if (loading) {
    return <Spin size="large" tip="Loading courses..." />;
  }

  if (error) {
    return <Empty description="Error loading courses" />;
  }

  return (
    <div className={styles.coursesPageContainer}>
      <h1 className={styles.title}>Courses</h1>
      <Row gutter={[16, 16]} className={styles.coursesList}>
        {courses.length > 0 ? coursesCards : <Empty description="No courses found" />}
      </Row>
    </div>
  );
};

export default TeacherCourses;