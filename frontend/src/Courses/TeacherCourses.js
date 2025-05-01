import React from 'react';
import { Table, Tag, Card, Row, Col, Statistic, Empty } from 'antd';
import { BookOutlined, TeamOutlined, CalendarOutlined } from '@ant-design/icons';
import { formatFirebaseTimestamp, formatTimestampForDisplay } from '../utils/firebaseUtils';
import styles from '../styles/modules/Courses.module.css'; // Adjust the path as necessary

const TeacherCourses = ({ teacher }) => {
  if (!teacher || !teacher.courses || teacher.courses.length === 0) {
    return (
      <Empty 
        description={`No courses assigned to ${teacher?.firstName || 'this teacher'} yet.`}
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  // Summary statistics for this teacher
  const totalStudents = teacher.courses.reduce((sum, course) => sum + (course.studentCount || 0), 0);
  const totalAssignments = teacher.courses.reduce((sum, course) => sum + (course.assignmentCount || 0), 0);

  // Table columns for courses
  const columns = [
    {
      title: 'Course Name',
      dataIndex: 'courseName',
      key: 'courseName',
      render: (text, record) => (
        <div>
          <BookOutlined style={{ marginRight: 8 }} />
          <span style={{ fontWeight: 500 }}>{text || 'Unnamed Course'}</span>
        </div>
      ),
    },
    {
      title: 'Subject Area',
      dataIndex: 'subjectArea',
      key: 'subjectArea',
      render: (text) => text || 'N/A',
    },
    {
      title: 'Students',
      dataIndex: 'studentCount',
      key: 'studentCount',
      render: (count) => count || 0,
      sorter: (a, b) => (a.studentCount || 0) - (b.studentCount || 0),
    },
    {
      title: 'Start Date',
      dataIndex: 'startDate',
      key: 'startDate',
      render: (date) => formatTimestampForDisplay(date),
      sorter: (a, b) => {
        // Convert both timestamps to Date objects for comparison
        const dateA = formatFirebaseTimestamp(a.startDate);
        const dateB = formatFirebaseTimestamp(b.startDate);
        // Compare milliseconds for stable sorting
        return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
      },
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => formatTimestampForDisplay(date),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        let color = 'default';
        let text = 'Unknown';
        
        const now = new Date();
        const startDate = formatFirebaseTimestamp(record.startDate);
        const endDate = formatFirebaseTimestamp(record.endDate);
        
        if (startDate && endDate) {
          if (now < startDate) {
            color = 'gold';
            text = 'Upcoming';
          } else if (now > endDate) {
            color = 'default';
            text = 'Completed';
          } else {
            color = 'green';
            text = 'Active';
          }
        }
        
        return <Tag color={color}>{text}</Tag>;
      },
    },
  ];

  return (
    <div className={styles.teacherCourses}>
      {/* Summary statistics */}
      <Row gutter={16} className={styles.summaryStats}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic 
              title="Courses" 
              value={teacher.courses.length} 
              prefix={<BookOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic 
              title="Total Students" 
              value={totalStudents} 
              prefix={<TeamOutlined />} 
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic 
              title="Total Assignments" 
              value={totalAssignments} 
              prefix={<CalendarOutlined />} 
            />
          </Card>
        </Col>
      </Row>

      {/* Courses table */}
      <Table
        columns={columns}
        dataSource={teacher.courses}
        rowKey="id"
        pagination={false}
        className={styles.coursesTable}
      />
    </div>
  );
};

export default TeacherCourses;