import React from 'react';
import { Card as AntCard, Row, Col, Empty } from 'antd';
import styles from '../../../styles/modules/Students.module.css';
import RadarChart from '../../Visualization/RadarChart';
import PerformanceMetricsLegend from '../../Visualization/PerformanceMetricsLegend';
import { generateRadarChartData } from '../../../utils/dataProcessingUtils';
import debugLogger from '../../../utils/debugLogger';

const StudentPerformance = ({ student }) => {  // Generate radar chart data from student performance
  const radarChartData = student ? generateRadarChartData(student) : [];
    // Add debug logs for debugging
  debugLogger.logDebug('StudentPerformance', 'Render with data', { 
    hasStudent: !!student,
    studentId: student?.id,
    radarChartDataLength: radarChartData.length 
  });
  
  // Format metrics for the legend component with defensive checks
  const performanceMetrics = student ? [
    { name: 'Overall Score', value: student.averageScore || 0 },
    { name: 'Course Completion', value: student.completionRate || 0 },
    { name: 'Module Completion', value: student?.courses?.length ? 
      student.courses.reduce((sum, course) => {
        // Check if modules exist and have length
        if (!Array.isArray(course?.modules) || course.modules.length === 0) return sum;
        
        const completedModules = course.modules.filter(m => 
          m?.progress?.completion === 100
        ).length;
        
        return sum + (completedModules / course.modules.length * 100);
      }, 0) / student.courses.length : 0 
    },
    { name: 'Assignment Completion', value: student?.courses?.length ? 
      student.courses.reduce((sum, course) => {
        // Check if assignments exist and have length
        if (!Array.isArray(course?.assignments) || course.assignments.length === 0) return sum;
        
        const completedAssignments = course.assignments.filter(a => 
          a?.progress?.submittedAt
        ).length;
        
        return sum + (completedAssignments / course.assignments.length * 100);
      }, 0) / student.courses.length : 0
    }
  ] : [];

  return (
    <AntCard title="Performance Metrics" className={styles.chartCard}>
      {radarChartData.length > 0 ? (
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <RadarChart 
              data={radarChartData}
              width={400}
              height={400}
              showLegend={true}
              title="Performance Metrics"
            />
          </Col>
          <Col xs={24} md={12}>
            <PerformanceMetricsLegend metrics={performanceMetrics} />
          </Col>
        </Row>
      ) : (
        <Empty description="No performance data available" />
      )}
    </AntCard>
  );
};

export default StudentPerformance;
