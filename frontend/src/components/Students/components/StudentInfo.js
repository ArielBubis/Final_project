import React, { useMemo, useState } from 'react';
import { Card as AntCard, Button, Row, Col, Divider } from 'antd';
import { SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import styles from '../../../styles/modules/Students.module.css';

const StudentInfo = ({ student, debugInfo = {}, style }) => {
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
    <AntCard 
      title={`${student.firstName || 'Unknown'} ${student.lastName || 'Student'}`} 
      className={styles.detailCard}
      style={{ 
        ...style,
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      bodyStyle={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}
    >
      {/* Info and Risk Section */}
      <Row gutter={[16, 16]}>
        {/* Student Details - Left Side */}
        <Col xs={24} sm={12}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            fontSize: '13px'
          }}>
            <div>
              <div style={{ color: '#8c8c8c', marginBottom: '2px', fontSize: '12px' }}>Email</div>
              <div style={{ fontWeight: 500 }}>{student.email || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: '#8c8c8c', marginBottom: '2px', fontSize: '12px' }}>Gender</div>
              <div style={{ fontWeight: 500 }}>{student.gender || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: '#8c8c8c', marginBottom: '2px', fontSize: '12px' }}>Courses Enrolled</div>
              <div style={{ fontWeight: 500 }}>{student.courseCount || 0}</div>
            </div>
          </div>
        </Col>

        {/* Risk Status Section - Right Side */}
        <Col xs={24} sm={12}>
          {student.isAtRisk ? (
            <div style={{ 
              padding: '12px',
              backgroundColor: '#fff2f0',
              border: '1px solid #ffccc7',
              borderRadius: '4px'
            }}>
              <span style={{ color: '#cf1322', fontSize: '14px', fontWeight: 'bold' }}>Performance Risk</span>
              {student.riskReasons && student.riskReasons.length > 0 && (
                <ul style={{ 
                  margin: '8px 0 0 0',
                  padding: '0 0 0 16px',
                  fontSize: '12px',
                  color: '#434343',
                  lineHeight: '1.4'
                }}>
                  {student.riskReasons.map((reason, idx) => (
                    <li key={idx} style={{ marginBottom: '4px' }}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div style={{ 
              padding: '12px',
              backgroundColor: '#f6ffed',
              border: '1px solid #b7eb8f',
              borderRadius: '4px'
            }}>
              <span style={{ color: '#52c41a', fontSize: '14px', fontWeight: 'bold' }}>On Track</span>
              <p style={{ margin: '8px 0 0 0', color: '#434343', fontSize: '12px', lineHeight: '1.4' }}>
                Student is performing well with no risk factors detected.
              </p>
            </div>
          )}
        </Col>
      </Row>

      {/* Course Performance Chart Section */}
      <div style={{ 
        backgroundColor: '#fafafa', 
        padding: '12px', 
        borderRadius: '4px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#262626', lineHeight: 1 }}>
              {student.averageScore !== undefined ? Math.round(student.averageScore) : 'N/A'}
            </span>
            <span style={{ fontSize: '12px', color: '#8c8c8c' }}>Course Average</span>
          </div>
          <Button 
            size="small"
            onClick={() => setSortAscending(!sortAscending)}
            icon={sortAscending ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
          >
            Sort {sortAscending ? 'Desc' : 'Asc'}
          </Button>
        </div>
        
        <div style={{ 
          flex: 1,
          minHeight: '240px',
          maxHeight: '300px'
        }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={courseGradeData} 
              margin={{ top: 5, right: 5, bottom: 45, left: 0 }}
              barSize={60}  // Increased bar thickness
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={60}  // Increased height for better text spacing
                interval={0}
                tick={{ 
                  fontSize: 12,  // Slightly larger font
                  fill: '#595959'
                }}
                tickFormatter={(value) => {
                  // Improved text wrapping - show more characters
                  return value.length > 20 ? `${value.substring(0, 20)}...` : value;
                }}
              />
              <YAxis 
                domain={[0, 100]} 
                tick={{ fontSize: 11, fill: '#595959' }}
                tickCount={6}
              />
              <Tooltip 
                formatter={(value) => [`${value}%`, 'Grade']}
                labelStyle={{ fontSize: '11px', color: '#595959' }}
                contentStyle={{
                  fontSize: '12px',
                  padding: '8px',
                  borderRadius: '4px',
                  border: '1px solid #f0f0f0'
                }}
              />
              <Bar 
                dataKey="grade" 
                name="Grade"
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
  );
};

export default StudentInfo;
