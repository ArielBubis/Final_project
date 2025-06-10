import React from 'react';
import { Card as AntCard, Row, Col, Empty } from 'antd';
import styles from '../../../styles/modules/Students.module.css';
import RadarChart from '../../Visualization/RadarChart';
import PerformanceMetricsLegend from '../../Visualization/PerformanceMetricsLegend';
import { generateRadarChartData } from '../../../utils/dataProcessingUtils';
import debugLogger from '../../../utils/debugLogger';

const StudentPerformance = ({ student, style }) => {
  const radarChartData = student ? generateRadarChartData(student) : [];
  
  debugLogger.logDebug('StudentPerformance', 'Render with data', { 
    hasStudent: !!student,
    studentId: student?.id,
    radarChartDataLength: radarChartData.length 
  });
  
  const performanceMetrics = student ? [
    { name: 'Overall Score', value: student.averageScore || 0 },
    { name: 'Course Completion', value: student.completionRate || 0 },
    { name: 'Assignment Completion', value: student?.courses?.length ? 
      student.courses.reduce((sum, course) => {
        if (!Array.isArray(course?.assignments) || course.assignments.length === 0) return sum;
        
        const completedAssignments = course.assignments.filter(a => 
          a?.progress?.submittedAt || a?.progress?.submissionDate
        ).length;
        
        return sum + (completedAssignments / course.assignments.length * 100);
      }, 0) / student.courses.length : 0 
    }
  ] : [];

  return (
    <AntCard 
      title="Performance Metrics" 
      className={styles.chartCard}
      style={{ 
        ...style,
        height: '100%',
        maxHeight: '600px',  // Set maximum height
        display: 'flex',
        flexDirection: 'column'
      }}
      bodyStyle={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'auto'  // Enable scrolling if content overflows
      }}
    >
      {radarChartData.length > 0 ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flex: 1,
          minHeight: 0  // Allow container to shrink
        }}>
          <div style={{ 
            flex: '0 0 auto',  // Don't allow chart to shrink
            height: 300, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center' 
          }}>
            <RadarChart 
              data={radarChartData}
              width={400}
              height={300}
              showLegend={false}
              studentColor="#722ed1"
            />
          </div>
          <div style={{ 
            marginTop: 16,
            flex: '0 0 auto'  // Don't allow legend to shrink
          }}>
            <PerformanceMetricsLegend metrics={performanceMetrics} />
          </div>
        </div>
      ) : (
        <Empty description="No performance data available" />
      )}
    </AntCard>
  );
};

export default StudentPerformance;
