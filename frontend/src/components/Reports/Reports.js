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
  ];

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  return (
    <div className={styles.teacherOverviewDashboard}>
      <div className={styles.dashboardHeader}>
        <h1 className={styles.dashboardTitle}>Teacher Report Dashboard</h1>
        <p className={styles.dashboardSubtitle}>
          Comprehensive analytics and insights for teacher performance monitoring
        </p>
      </div>
      
      <TeacherOverview 
        activeKey={activeTab} 
        onChange={handleTabChange} 
        items={items}
        className={styles.reportsTabs}
      />
    </div>
  );
};

export default Reports;