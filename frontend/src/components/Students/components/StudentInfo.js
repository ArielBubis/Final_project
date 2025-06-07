import React, { useMemo, useState } from 'react';
import { Card as AntCard, Button, Row, Col } from 'antd';
import { SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import styles from '../../../styles/modules/Students.module.css';

const StudentInfo = ({ student, debugInfo = {} }) => {
  const [sortAscending, setSortAscending] = useState(true);

  // Transform courses data for the chart with memoization
  const courseGradeData = useMemo(() => {
    if (!student?.courses) return [];
    
    let grades = student.courses.map(course => ({
      name: course.courseName || course.name || 'Unnamed Course',
      grade: course.summary?.overallScore || 0
    }));

    // Sort the grades
    return grades.sort((a, b) => 
      sortAscending ? a.grade - b.grade : b.grade - a.grade
    );
  }, [student?.courses, sortAscending]);

  // Function to determine bar color based on grade
  const getBarColor = (grade) => {
    if (grade >= 85) return '#52c41a'; // Green
    if (grade >= 60) return '#faad14'; // Orange
    return '#f5222d'; // Red
  };

  if (!student) {
    return <AntCard title="Student Info" className={styles.detailCard}>
      <p>No student data available</p>
    </AntCard>;
  }
  
  return (
    <AntCard title={`${student.firstName || 'Unknown'} ${student.lastName || 'Student'}`} className={styles.detailCard}>
      <Row gutter={[16, 16]}>
        <Col span={24} md={12}>
          <p><strong>Email:</strong> {student.email || 'N/A'}</p>
          <p><strong>Gender:</strong> {student.gender || 'N/A'}</p>
          <p><strong>Courses Enrolled:</strong> {student.courseCount || 0}</p>
          <p><strong>Average Score:</strong> {student.averageScore !== undefined ? `${Math.round(student.averageScore)}%` : 'N/A'}</p>
          {student.isAtRisk && Array.isArray(student.riskReasons) && student.riskReasons.length > 0 && (
            <div className={styles.riskAlert}>
              <h3>At Risk</h3>
              <ul>
                {student.riskReasons.map((reason, idx) => (
                  <li key={idx}>{reason}</li>
                ))}
              </ul>
            </div>
          )}
        </Col>
        <Col span={24} md={12}>
          <div style={{ marginBottom: '16px', textAlign: 'right' }}>
            <Button 
              onClick={() => setSortAscending(!sortAscending)}
              icon={sortAscending ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
            >
              Sort {sortAscending ? 'Descending' : 'Ascending'}
            </Button>
          </div>
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={courseGradeData} margin={{ top: 5, right: 5, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  tick={{ fontSize: 12 }}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value) => [`${value}`, 'Grade']}
                  labelStyle={{ color: '#666' }}
                />
                <Bar 
                  dataKey="grade" 
                  fill="#8884d8"
                  cellFill="#ffffff"
                  name="Grade"
                  isAnimationActive={true}
                >
                  {courseGradeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.grade)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Col>
      </Row>
    </AntCard>
  );
};

export default StudentInfo;
