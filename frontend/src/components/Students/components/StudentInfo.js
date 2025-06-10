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
  return (    <AntCard 
      title={`${student.firstName || 'Unknown'} ${student.lastName || 'Student'}`} 
      style={style}
      bodyStyle={{ padding: 0 }}
      className={styles.detailCard}
    >
      {/* Info and Risk Section */}
      <Row gutter={[16, 16]}>
        {/* Student Details - Left Side */}
        <Col xs={24} sm={12}>          <div className={styles.studentInfoColumn}>
            <div>
              <div className={styles.infoField}>Email</div>
              <div className={styles.infoValue}>{student.email || 'N/A'}</div>
            </div>
            <div>
              <div className={styles.infoField}>Gender</div>
              <div className={styles.infoValue}>{student.gender || 'N/A'}</div>
            </div>
            <div>
              <div className={styles.infoField}>Courses Enrolled</div>
              <div className={styles.infoValue}>{student.courseCount || 0}</div>
            </div>
          </div>
        </Col>

        {/* Risk Status Section - Right Side */}
        <Col xs={24} sm={12}>
          {student.isAtRisk ? (            <div className={`${styles.riskAlert} ${styles.atRisk}`}>
              <span className={`${styles.riskAlertTitle} ${styles.atRisk}`}>Performance Risk</span>
              {student.riskReasons && student.riskReasons.length > 0 && (
                <ul className={styles.riskReasonsList}>
                  {student.riskReasons.map((reason, idx) => (
                    <li key={idx} className={styles.riskReason}>{reason}</li>
                  ))}
                </ul>
              )}
            </div>
          ) : (            <div className={`${styles.riskAlert} ${styles.riskAlertSafe}`}>
              <span className={`${styles.riskTitle} ${styles.riskTitleSafe}`}>On Track</span>
              <p className={styles.safeMessage}>
                Student is performing well with no risk factors detected.
              </p>
            </div>
          )}
        </Col>
      </Row>

      {/* Course Performance Chart Section */}      <div className={styles.chartSection}>
        <div className={styles.chartHeader}>
          <div className={styles.chartHeaderStats}>
            <span className={styles.chartScore}>
              {student.averageScore !== undefined ? Math.round(student.averageScore) : 'N/A'}
            </span>
            <span className={styles.chartLabel}>Course Average</span>
          </div>
          <Button 
            size="small"
            onClick={() => setSortAscending(!sortAscending)}
            icon={sortAscending ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
          >
            Sort {sortAscending ? 'Desc' : 'Asc'}
          </Button>
        </div>          <div className={styles.chartContent}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={courseGradeData} 
              margin={{ top: 20, right: 30, bottom: 60, left: 20 }}
              barSize={60}
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
