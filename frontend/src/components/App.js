import React, { useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from "react-router-dom";
import Sidebar from "./SideBar";
import Mainpage from "./Mainpage";
import Login from "../pages/LoginPage";
import SettingsPage from "../pages/SettingsPage";
import AdminDashboard from "./features/admin/AdminDashboard";
import TeacherManagement from "./features/admin/TeacherManagement";
import StudentsPage from "./features/students/StudentsPage";
import Student from "./features/students/Student";
import CoursesPage from "./features/courses/CoursesPage";
import PerformanceMonitor from "./PerformanceMonitor";
import CoursePage from "./features/courses/CoursePage";
import { useAuth } from "../contexts/AuthContext";
import { useData } from "../contexts/DataContext";
import { AppProvider } from "../contexts/AppProvider";
import styles from "../styles/modules/App.module.css";
import ResetPassword from "../pages/ResetPasswordPage";

// Role-based route guard component
const RoleBasedRoute = ({ element, requiredRole }) => {
  const { userRole } = useAuth();

  // If user role doesn't match required role, redirect to dashboard
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/mainpage" replace />;
  }

  return element;
};

// AppContent component to use the auth hook
const AppContent = () => {
  const { currentUser, userRole, loading } = useAuth();
  const { loadAdminData } = useData();
  const location = useLocation();

  // Load admin data when navigating to admin routes
  useEffect(() => {
    const isAdminRoute = location.pathname.startsWith('/admin');
    if (currentUser && userRole === 'admin' && isAdminRoute) {
      loadAdminData();
    }
  }, [currentUser, userRole, location.pathname, loadAdminData]);

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  // Determine default landing page based on user role
  const getDefaultRoute = () => {
    if (!currentUser) return "/login";
    if (userRole === "admin") return "/admin";
    return "/mainpage";
  };

  return (
    <div className={styles.appContainer}>
      {/* Performance Monitor - only enabled in development */}
      <PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} />
      
      {/* Render Sidebar only when the user is logged in */}
      {currentUser && userRole && <Sidebar userRole={userRole} />}

      {/* Main Content */}
      <div className={`${styles.mainContent} ${currentUser && userRole ? styles.mainContentWithSidebar : ''}`}>
        <Routes>
          {currentUser ? (
            <>
              {/* Common routes */}
              <Route path="/mainpage" element={<Mainpage />} />
              <Route path="/students" element={<StudentsPage />} />
              <Route path="/students/:id" element={<Student />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:id" element={<CoursePage />} />
              <Route path="/settings" element={<SettingsPage />} />

              {/* Admin-specific routes */}
              <Route
                path="/admin"
                element={<RoleBasedRoute element={<AdminDashboard />} requiredRole="admin" />}
              />
              <Route
                path="/admin/teachers"
                element={<RoleBasedRoute element={<TeacherManagement />} requiredRole="admin" />}
              />
              <Route
                path="/admin/reports"
                element={<RoleBasedRoute element={<AdminDashboard />} requiredRole="admin" />}
              />
              <Route
                path="/admin/settings"
                element={<RoleBasedRoute element={<AdminDashboard />} requiredRole="admin" />}
              />

              {/* Redirects */}
              <Route path="/login" element={<Navigate to={getDefaultRoute()} replace />} />
              {/* Redirect /report to mainpage */}
              <Route path="/report" element={<Navigate to="/mainpage" replace />} />
              <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
              <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          )}
        </Routes>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </Router>
  );
};

export default App;