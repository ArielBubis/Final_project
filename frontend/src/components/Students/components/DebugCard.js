import React from 'react';
import { Card as AntCard, Collapse, Button } from 'antd';
import styles from '../../../styles/modules/Students.module.css';

// Debug helper function to safely stringify objects with circular references
const safeStringify = (obj, indent = 2) => {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return '[Circular Reference]';
      }
      cache.add(value);
    }
    // Handle Firebase timestamp objects
    if (value && typeof value === 'object' && value.toDate && typeof value.toDate === 'function') {
      try {
        return `Date: ${value.toDate().toISOString()}`;
      } catch (e) {
        return '[Invalid Date]';
      }
    }
    return value;
  }, indent);
};

const DebugCard = ({ debugInfo, show = true }) => {
  const { Panel } = Collapse;
  
  if (!show) return null;
  
  return (
    <AntCard title="Debug Information - Student Data Flow" className={styles.debugCard} style={{ marginTop: 20, marginBottom: 20 }}>
      <Collapse defaultActiveKey={['1']}>
        <Panel header="Student Basic Data" key="1">
          <pre style={{ maxHeight: '300px', overflow: 'auto' }}>
            {safeStringify(debugInfo.studentData || 'No student data')}
          </pre>
        </Panel>
        <Panel header="User Data" key="2">
          <pre style={{ maxHeight: '300px', overflow: 'auto' }}>
            {safeStringify(debugInfo.userData || 'No user data')}
          </pre>
        </Panel>
        <Panel header="Enrollments" key="3">
          <pre style={{ maxHeight: '300px', overflow: 'auto' }}>
            {safeStringify(debugInfo.enrollments || 'No enrollments data')}
          </pre>
        </Panel>
        <Panel header="Courses Data (Overview)" key="4">
          <pre style={{ maxHeight: '300px', overflow: 'auto' }}>
            {debugInfo.coursesData ? 
              `Found ${debugInfo.coursesData.length} courses` + 
              debugInfo.coursesData.map((course, i) => 
                `\n\nCourse ${i+1}: ${course.courseName || 'Unknown'} (${course.id})`
              ).join('') 
              : 'No courses data'}
          </pre>
        </Panel>
        <Panel header="Final Student Object" key="5">
          <pre style={{ maxHeight: '300px', overflow: 'auto' }}>
            {safeStringify(debugInfo.finalStudentObject || 'No final student object')}
          </pre>
        </Panel>
        {debugInfo.error && (
          <Panel header="Errors" key="6" style={{ backgroundColor: '#fff1f0' }}>
            <pre style={{ maxHeight: '300px', overflow: 'auto', color: 'red' }}>
              {debugInfo.error}
              {debugInfo.errorStack && `\n\n${debugInfo.errorStack}`}
            </pre>
          </Panel>
        )}
      </Collapse>
      
      <div style={{ marginTop: 16 }}>
        <Button 
          type="primary" 
          onClick={() => console.log('Full debug info:', debugInfo)}
        >
          Log Full Debug Info to Console
        </Button>
      </div>
    </AntCard>
  );
};

export default DebugCard;
