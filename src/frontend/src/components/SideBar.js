import React from "react";
import { Link, useNavigate } from "react-router-dom"; // Replace useHistory with useNavigate
import PropTypes from "prop-types";
import { getAuth, signOut } from "firebase/auth"; // Import Firebase auth
import "./SideBar.css";

// Define menu items based on user roles
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

const Sidebar = ({ userRole, isOpen, toggleSidebar }) => {
    const navigate = useNavigate(); // Initialize useNavigate hook

    const handleLogout = async () => {
        try {
            const auth = getAuth();
            await signOut(auth);
            toggleSidebar(false); // 🔹 Close sidebar before navigating
            navigate("/login"); // 🔹 Navigate to login page
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };      

    return (
        <div className={`sidebar ${isOpen ? "open" : ""}`}>
            <button className="close-btn md:hidden" onClick={() => toggleSidebar(false)}>✖</button>
            <ul>
                {menuItems[userRole]?.map((item) => (
                    <li key={item.path}>
                        <Link to={item.path} onClick={() => toggleSidebar(false)}>{item.name}</Link>
                    </li>
                ))}
            </ul>
            <button className="logout-button" onClick={handleLogout}>Logout</button>
        </div>
    );
};

// Define PropTypes
Sidebar.propTypes = {
    userRole: PropTypes.oneOf(["teacher", "admin"]).isRequired,
    isOpen: PropTypes.bool.isRequired,
    toggleSidebar: PropTypes.func.isRequired
};

export default Sidebar;
