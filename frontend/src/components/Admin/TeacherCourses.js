import React from 'react';
import { Table, Tag, Card, Row, Col, Statistic, Empty } from 'antd';
import { BookOutlined, TeamOutlined, CalendarOutlined } from '@ant-design/icons';
import styles from '../../styles/modules/AdminDashboard.module.css';

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

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
      // Handle Firestore Timestamp
      return timestamp.toDate().toLocaleDateString();
    }
    if (timestamp.seconds) {
      // Handle Firestore Timestamp as object
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    }
    // Handle date string or other formats
    return new Date(timestamp).toLocaleDateString();
  };

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
      render: (date) => formatDate(date),
      sorter: (a, b) => {
        const dateA = a.startDate ? (a.startDate.seconds || 0) : 0;
        const dateB = b.startDate ? (b.startDate.seconds || 0) : 0;
        return dateA - dateB;
      },
    },
    {
      title: 'End Date',
      dataIndex: 'endDate',
      key: 'endDate',
      render: (date) => formatDate(date),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => {
        let color = 'default';
        let text = 'Unknown';
        
        const now = new Date();
        let startDate, endDate;
        
        if (record.startDate) {
          startDate = record.startDate.toDate ? 
            record.startDate.toDate() : 
            new Date(record.startDate.seconds ? record.startDate.seconds * 1000 : record.startDate);
        }
        
        if (record.endDate) {
          endDate = record.endDate.toDate ? 
            record.endDate.toDate() : 
            new Date(record.endDate.seconds ? record.endDate.seconds * 1000 : record.endDate);
        }
        
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