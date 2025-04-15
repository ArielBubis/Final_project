import React from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import "../styles/Sidebar.css";

export const menuItems = {
    teacher: [
        { name: "Dashboard", path: "/dashboard" },
        { name: "Report", path: "/report" },
        { name: "Anomaly", path: "/anomaly" },
        { name: "Courses", path: "/courses" },
        { name: "Students", path: "/students" },
        { name: "Performance", path: "/performance" }
    ]
};

const Sidebar = ({ userRole }) => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const { isSidebarOpen, toggleSidebar } = useUI();

    const handleLogout = async () => {
        try {
            await logout();
            toggleSidebar(false);
            navigate("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    return (
        <>
            {!isSidebarOpen && (
                <button className="menu-button" onClick={() => toggleSidebar(true)}>☰</button>
            )}

            <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
                {/* Close button only on small screens */}
                <div className="close-btn-wrapper">
                    <button className="close-btn" onClick={() => toggleSidebar(false)}>✖</button>
                </div>

                <ul>
                    {menuItems[userRole]?.map((item) => (
                        <li key={item.path}>
                            <Link to={item.path} onClick={() => toggleSidebar(false)}>{item.name}</Link>
                        </li>
                    ))}
                </ul>
                <button className="logout-button" onClick={handleLogout}>Logout</button>
            </div>
        </>
    );
};

Sidebar.propTypes = {
    userRole: PropTypes.oneOf(["teacher", "admin"]).isRequired
};

export default Sidebar;