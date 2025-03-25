import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { auth } from "../firebaseConfig"; // Import Firebase auth
import { onAuthStateChanged } from "firebase/auth";
import Sidebar from "./SideBar"; // Import Sidebar
import Dashboard from "./Dashboard";
import Login from "./login";
import { Menu } from "lucide-react";
import "./App.css";

const App = () => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Sidebar toggle state

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                // Fetch user role from Firestore (replace with real Firestore call)
                const mockUserRole = "teacher"; // Example: "teacher" or "admin"
                setUserRole(mockUserRole);
            } else {
                setUser(null);
                setUserRole(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <Router>
            <div className="app-container">
                {/* Sidebar Toggle Button for Small Screens */}
                {user && userRole && (
                    <button className="menu-button md:hidden" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
                        <Menu size={24} />
                    </button>
                )}

                {/* Sidebar */}
                {user && userRole && <Sidebar userRole={userRole} isOpen={isSidebarOpen} toggleSidebar={setIsSidebarOpen} />}

                {/* Main Content */}
                <div className={`main-content ${isSidebarOpen ? "sidebar-open" : ""}`}>
                    <Routes>
                        {!user ? (
                            <Route path="*" element={<Navigate to="/login" replace />} />
                        ) : (
                            <>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                                {/* Add other routes here */}
                                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            </>
                        )}
                    </Routes>
                </div>
            </div>
        </Router>
    );
};

export default App;
