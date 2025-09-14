import React, { useState } from "react";
import { Tabs, Card, Row, Col, Statistic } from "antd";
import { 
  UserOutlined, 
  BookOutlined, 
  TeamOutlined,
  DatabaseOutlined
} from "@ant-design/icons";
import TeacherManagement from "./TeacherManagement";
import styles from "../../../styles/modules/AdminDashboard.module.css";
import { useData } from "../../../contexts/DataContext";

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const { teachers, courseData, loading, error } = useData();
  
  // Tab items for the admin dashboard
  const items = [
    {
      key: "overview",
      label: "Overview",
      children: (
        <div className={styles.dashboardOverview}>
          <h1 className={styles.welcomeTitle}>Admin Dashboard</h1>
          <p className={styles.welcomeSubtitle}>
            Manage teachers, courses, and view system statistics
          </p>
          
          {/* Stats Cards */}
          <Row gutter={[16, 16]} className={styles.statsRow}>
            <Col xs={24} sm={12} md={6}>
              <Card className={styles.statCard}>
                <Statistic
                  title="Total Teachers"
                  value={teachers?.length || 0}
                  prefix={<UserOutlined />}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className={styles.statCard}>
                <Statistic
                  title="Total Courses"
                  value={courseData?.length || 0}
                  prefix={<BookOutlined />}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className={styles.statCard}>
                <Statistic
                  title="Active Students"
                  value={calculateTotalStudents(courseData)}
                  prefix={<TeamOutlined />}
                  loading={loading}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Card className={styles.statCard}>
                <Statistic
                  title="Total Assignments"
                  value={calculateTotalAssignments(courseData)}
                  prefix={<DatabaseOutlined />}
                  loading={loading}
                />
              </Card>
            </Col>
          </Row>
          
          {/* Admin Quick Actions */}
          <div className={styles.quickActions}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={8}>
                <Card 
                  title="Manage Teachers" 
                  className={styles.actionCard}
                  onClick={() => setActiveTab("teachers")}
                  hoverable
                >
                  <p>Add, edit, or manage teacher accounts and their course assignments.</p>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card 
                  title="System Reports" 
                  className={styles.actionCard}
                  onClick={() => setActiveTab("reports")}
                  hoverable
                >
                  <p>View comprehensive reports across all courses and teachers.</p>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={8}>
                <Card 
                  title="System Settings" 
                  className={styles.actionCard}
                  hoverable
                >
                  <p>Configure system-wide settings and preferences.</p>
                </Card>
              </Col>
            </Row>
          </div>
        </div>
      ),
    },
    {
      key: "teachers",
      label: "Teacher Management",
      children: <TeacherManagement />,
    },
    {
      key: "reports",
      label: "System Reports",
      children: (
        <div className={styles.reportsSection}>
          <h2>System-wide Reports</h2>
          <p>View aggregated statistics and insights across all courses and teachers.</p>
          {/* This section can be expanded with more detailed reporting components */}
        </div>
      ),
    },
    {
      key: "settings",
      label: "System Settings",
      children: (
        <div className={styles.settingsSection}>
          <h2>System Settings</h2>
          <p>Configure system-wide settings and preferences.</p>
          {/* This section can be expanded with settings components */}
        </div>
      ),
    },
  ];

  const handleTabChange = (key) => {
    setActiveTab(key);
  };

  if (error) {
    return <div className={styles.error}>Error loading data: {error}</div>;
  }

  return (
    <div className={styles.adminDashboard}>
      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={items}
        className={styles.adminTabs}
      />
    </div>
  );
};

// Helper function to calculate total students
const calculateTotalStudents = (courseData) => {
  if (!courseData || !Array.isArray(courseData)) return 0;
  return courseData.reduce((total, course) => total + (course.studentCount || 0), 0);
};

// Helper function to calculate total assignments
const calculateTotalAssignments = (courseData) => {
  if (!courseData || !Array.isArray(courseData)) return 0;
  return courseData.reduce((total, course) => total + (course.assignmentCount || 0), 0);
};

export default AdminDashboard;