import React, { useState } from 'react';
import { Tabs } from 'antd';
import TeacherOverview from './TeacherOverview';
import AssignmentAnalytics from './AssignmentAnalytics';
import { useAuth } from '../../contexts/AuthContext';
import styles from '../../styles/modules/Reports.module.css';

const Reports = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';

  const items = [
    {
      key: 'overview',
      label: 'Overview',
      children: <TeacherOverview isAdminView={isAdmin} />
    },
    {
      key: 'assignments',
      label: 'Assignment Analytics',
      children: <AssignmentAnalytics />
    }
  ];

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  return (
    <div className={styles.teacherOverviewDashboard}>
      <div className={styles.dashboardHeader}>
        <h1 className={styles.dashboardTitle}>
          {isAdmin ? 'System-wide Report Dashboard' : 'Teacher Report Dashboard'}
        </h1>
        <p className={styles.dashboardSubtitle}>
          {isAdmin 
            ? 'Comprehensive analytics and insights across all courses and teachers' 
            : 'Comprehensive analytics and insights for teacher performance monitoring'
          }
        </p>
      </div>
      
      <TeacherOverview 
        activeKey={activeTab} 
        onChange={handleTabChange} 
        items={items}
        isAdminView={isAdmin}
        className={styles.reportsTabs}
      />
    </div>
  );
};

export default Reports;