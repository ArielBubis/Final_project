import React, { useMemo, useState } from 'react';
import { Card as AntCard, Button, Row, Col, Divider } from 'antd';
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
    <Row gutter={[16, 16]}>
      {/* Main Info Card */}
      <Col xs={24} xl={16}>
        <AntCard title={`${student.firstName || 'Unknown'} ${student.lastName || 'Student'}`} className={styles.detailCard}>
          {/* Info and Risk Section */}          <Row gutter={[24, 16]}>
            {/* Student Details - Left Side */}
            <Col span={12}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ color: '#8c8c8c', marginBottom: '4px' }}>Email</div>
                  <div style={{ fontWeight: 'bold' }}>{student.email || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: '#8c8c8c', marginBottom: '4px' }}>Gender</div>
                  <div style={{ fontWeight: 'bold' }}>{student.gender || 'N/A'}</div>
                </div>
                <div>
                  <div style={{ color: '#8c8c8c', marginBottom: '4px' }}>Courses Enrolled</div>
                  <div style={{ fontWeight: 'bold' }}>{student.courseCount || 0}</div>
                </div>
              </div>
            </Col>

            {/* Risk Status Section - Right Side */}
            <Col span={12}>
              {student.isAtRisk ? (
                <div style={{ 
                  padding: '16px',
                  backgroundColor: '#fff2f0',
                  border: '1px solid #ffccc7',
                  borderRadius: '4px',
                  height: '100%'
                }}>
                  <span style={{ color: '#cf1322', fontSize: '16px', fontWeight: 'bold' }}>Performance Risk</span>
                  {student.riskReasons && student.riskReasons.length > 0 && (
                    <ul style={{ 
                      margin: '12px 0 0 0',
                      padding: '0 0 0 16px',
                      fontSize: '13px',
                      color: '#434343'
                    }}>
                      {student.riskReasons.map((reason, idx) => (
                        <li key={idx} style={{ marginBottom: '8px' }}>{reason}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div style={{ 
                  padding: '16px',
                  backgroundColor: '#f6ffed',
                  border: '1px solid #b7eb8f',
                  borderRadius: '4px',
                  height: '100%'
                }}>
                  <span style={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}>On Track</span>
                  <p style={{ margin: '12px 0 0 0', color: '#434343', fontSize: '13px' }}>
                    Student is performing well with no risk factors detected.
                  </p>
                </div>
              )}            </Col>
          </Row>

          <Divider style={{ margin: '24px 0' }} />

          {/* Performance Overview Section */}
          <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
            <Col>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
                <span style={{ fontSize: '48px', fontWeight: 'bold', color: '#262626', lineHeight: 1 }}>
                  {student.averageScore !== undefined ? Math.round(student.averageScore) : 'N/A'}
                </span>
                <span style={{ fontSize: '16px', color: '#8c8c8c' }}>Course Average</span>
              </div>
            </Col>
            <Col>
              <Button 
                size="small"
                onClick={() => setSortAscending(!sortAscending)}
                icon={sortAscending ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                style={{ marginLeft: 'auto' }}
              >
                Sort {sortAscending ? 'Descending' : 'Ascending'}
              </Button>
            </Col>
          </Row>

          {/* Course Performance Chart Section */}
          <div style={{ 
            backgroundColor: '#fafafa', 
            padding: '20px', 
            borderRadius: '4px'
          }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              marginBottom: '16px',
              color: '#262626'
            }}>
              Course Performance
            </div>
            
            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={courseGradeData} margin={{ top: 5, right: 5, bottom: 50, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ 
                      fontSize: 11,
                      fill: '#595959',
                      width: 100,
                      wordWrap: 'break-word'
                    }}
                    tickFormatter={(value) => {
                      return value.length > 20 ? `${value.substring(0, 20)}...` : value;
                    }}
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    tick={{ fontSize: 11, fill: '#595959' }}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}`, 'Grade']}
                    labelStyle={{ color: '#595959' }}
                    contentStyle={{
                      borderRadius: '4px',
                      border: '1px solid #f0f0f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                    }}
                  />
                  <Bar 
                    dataKey="grade" 
                    fill="#8884d8"
                    name="Grade"
                    isAnimationActive={true}
                    radius={[4, 4, 0, 0]}
                  >
                    {courseGradeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.grade)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </AntCard>
      </Col>

      {/* Right Side Card - Empty for now */}
      <Col xs={24} xl={8}>
        <AntCard 
          title="Additional Information" 
          className={styles.detailCard}
          style={{ height: '100%' }}
        >
          {/* Content for the right card can be added later */}
        </AntCard>
      </Col>
    </Row>
  );
};

export default StudentInfo;
