import React from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import styles from "../styles/modules/Sidebar.module.css";
import classNames from "classnames";

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

    const sidebarClasses = classNames(
        styles.sidebar,
        { [styles.open]: isSidebarOpen, [styles.closed]: !isSidebarOpen }
    );

    return (
        <>
            {!isSidebarOpen && (
                <button className={styles.menuButton} onClick={() => toggleSidebar(true)}>☰</button>
            )}

            <div className={sidebarClasses}>
                {/* Close button only on small screens */}
                <div>
                    <button className={styles.closeBtn} onClick={() => toggleSidebar(false)}>✖</button>
                </div>

                <nav className={styles.nav}>
                    <ul>
                        {menuItems[userRole]?.map((item) => (
                            <li key={item.path}>
                                <Link to={item.path} className={styles.navLink} onClick={() => toggleSidebar(false)}>
                                    {item.name}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <button className={styles.logoutButton} onClick={handleLogout}>Logout</button>
            </div>
        </>
    );
};

Sidebar.propTypes = {
    userRole: PropTypes.oneOf(["teacher", "admin"]).isRequired
};

export default Sidebar;