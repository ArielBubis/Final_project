import React, { useState } from 'react';
import { Tabs } from 'antd';
import TeacherOverview from './TeacherOverview';
import styles from '../../styles/modules/Reports.module.css';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const items = [
    {
      key: 'overview',
      label: 'Overview',
      children: <TeacherOverview />
    },
    {
      key: 'student',
      label: 'Student Performance',
      children: (
        <div className={styles.placeholder}>
          <h3>Student Detailed Reports</h3>
          <p>Detailed student performance analysis will be available here.</p>
        </div>
      )
    },
    {
      key: 'course',
      label: 'Course Analytics',
      children: (
        <div className={styles.placeholder}>
          <h3>Course Analytics Reports</h3>
          <p>In-depth course analytics will be available here.</p>
        </div>
      )
    },
    {
      key: 'assignment',
      label: 'Assignment Analysis',
      children: (
        <div className={styles.placeholder}>
          <h3>Assignment Performance</h3>
          <p>Detailed assignment completion and performance metrics will be available here.</p>
        </div>
      )
    }
  ];

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  return (
    <div className={styles.reportsContainer}>
      <div className={styles.pageHeader}>
        <h1>Reports</h1>
        <p>Analytics and data insights</p>
      </div>
      
      <Tabs 
        activeKey={activeTab} 
        onChange={handleTabChange} 
        items={items}
        className={styles.reportsTabs}
      />
    </div>
  );
};

export default Reports;