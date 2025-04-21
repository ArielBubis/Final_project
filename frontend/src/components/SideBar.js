import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import styles from "../styles/modules/Sidebar.module.css";
import classNames from "classnames";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export const menuItems = {
    teacher: [
        { name: "Dashboard", path: "/dashboard" },
        { name: "Report", path: "/report" },
        { name: "Anomaly", path: "/anomaly" },
        { name: "Courses", path: "/courses" },
        { name: "Students", path: "/students" },
        { name: "Performance", path: "/performance" }
    ],
    admin: [
        { name: "Dashboard", path: "/dashboard" },
        { name: "Admin Dashboard", path: "/admin" },
        { name: "Teacher Management", path: "/admin/teachers" },
        { name: "System Reports", path: "/admin/reports" },
        { name: "Settings", path: "/admin/settings" }
    ]
};

const Sidebar = ({ userRole }) => {
    console.log("Sidebar rendered with userRole:", userRole);
    const navigate = useNavigate();
    const { logout, currentUser } = useAuth();
    const { isSidebarOpen, toggleSidebar } = useUI();
    const [teacherName, setTeacherName] = useState("");

    useEffect(() => {
        const fetchTeacherData = async () => {
            if (currentUser && currentUser.uid) {
                try {
                    // First check in the users collection
                    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                    
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        if (userData.firstName && userData.lastName) {
                            setTeacherName(`${userData.firstName} ${userData.lastName}`);
                            return;
                        }
                    }

                    // If not found or incomplete in users, check teachers collection
                    const teacherDoc = await getDoc(doc(db, "teachers", currentUser.uid));
                    
                    if (teacherDoc.exists()) {
                        const teacherData = teacherDoc.data();
                        if (teacherData.firstName && teacherData.lastName) {
                            setTeacherName(`${teacherData.firstName} ${teacherData.lastName}`);
                            return;
                        }
                    }
                    
                    // Fallback to displayName or email if no name found in either collection
                    setTeacherName(currentUser.displayName || currentUser.email.split('@')[0] || 'Teacher');
                } catch (error) {
                    console.error("Error fetching teacher data:", error);
                    setTeacherName(currentUser.displayName || 'Teacher');
                }
            }
        };

        fetchTeacherData();
    }, [currentUser]);

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

    // Determine the appropriate menu based on user role (admin or teacher)
    const roleBasedMenu = menuItems[userRole] || menuItems.teacher;

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

                {/* Welcome message with teacher's name from Firestore */}
                <div className={styles.welcomeMessage}>
                    Welcome, {teacherName || 'Teacher'}
                </div>

                <nav className={styles.nav}>
                    <ul>
                        {roleBasedMenu.map((item) => (
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