import React from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import Sidebar from "./SideBar";
import Dashboard from "./Dashboard";
import Login from "./login";
import { useAuth } from "../contexts/AuthContext";
import { AppProvider } from "../contexts/AppProvider";
import "../styles/styles.css";

// AppContent component to use the auth hook
const AppContent = () => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app-container">
      {/* Render Sidebar only when the user is logged in */}
      {currentUser && userRole && <Sidebar userRole={userRole} />}

      {/* Main Content */}
      <div className="main-content">
        <Routes>
          {currentUser ? (
            <>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/login" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </>
          ) : (
            <>
              <Route path="/login" element={<Login />} />
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