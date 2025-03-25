import React from "react";
import { Link } from "react-router-dom";
import PropTypes from "prop-types";
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
