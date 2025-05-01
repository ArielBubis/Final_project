import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import { useLanguage } from "../contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import styles from "../styles/modules/Sidebar.module.css";
import classNames from "classnames";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import Button from "../components/Button";
import StudentsPage from "./Students/StudentsPage";

export const menuItems = {
    teacher: [
        { nameKey: "Dashboard", path: "/dashboard" },
        { nameKey: "Report", path: "/report" },
        { nameKey: "Anomaly", path: "/anomaly" },
        { nameKey: "Courses", path: "/courses" },
        { nameKey: "Students", path: "/students" },
        { nameKey: "Performance", path: "/performance" }
    ],
    admin: [
        { nameKey: "Admin Dashboard", path: "/admin" },
        { nameKey: "Teacher Management", path: "/admin/teachers" },
        { nameKey: "System Reports", path: "/admin/reports" },
        { nameKey: "Settings", path: "/admin/settings" }
    ],
    // student: []
};

// Cache to avoid redundant teacher name fetches
const teacherNameCache = new Map();

const Sidebar = React.memo(({ userRole }) => {
    const navigate = useNavigate();
    const { logout, currentUser } = useAuth();
    const { isSidebarOpen, toggleSidebar } = useUI();
    const [teacherName, setTeacherName] = useState("");
    const { language, toggleLanguage, t } = useLanguage();

    // Memoize toggle function to prevent recreation on each render
    const handleToggleSidebar = useCallback((state) => {
        toggleSidebar(state);
    }, [toggleSidebar]);

    // Effect to fetch teacher data with proper cleanup and caching
    useEffect(() => {
        if (!currentUser?.uid) return;

        // Check cache first
        if (teacherNameCache.has(currentUser.uid)) {
            setTeacherName(teacherNameCache.get(currentUser.uid));
            return;
        }

        let isMounted = true;

        const fetchTeacherData = async () => {
            try {
                // Batch fetch user and teacher data in parallel for efficiency
                const [userDoc, teacherDoc] = await Promise.all([
                    getDoc(doc(db, "users", currentUser.uid)),
                    getDoc(doc(db, "teachers", currentUser.uid))
                ]);

                if (!isMounted) return;

                // First try to get name from user document
                if (userDoc.exists() && userDoc.data().firstName && userDoc.data().lastName) {
                    const userData = userDoc.data();
                    const name = `${userData.firstName} ${userData.lastName}`;
                    setTeacherName(name);
                    teacherNameCache.set(currentUser.uid, name);
                    return;
                }

                // Then try teacher document
                if (teacherDoc.exists() && teacherDoc.data().firstName && teacherDoc.data().lastName) {
                    const teacherData = teacherDoc.data();
                    const name = `${teacherData.firstName} ${teacherData.lastName}`;
                    setTeacherName(name);
                    teacherNameCache.set(currentUser.uid, name);
                    return;
                }

                // Fallback
                const fallbackName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Teacher';
                setTeacherName(fallbackName);
                teacherNameCache.set(currentUser.uid, fallbackName);
            } catch (error) {
                console.error("Error fetching teacher data:", error);
                if (isMounted) {
                    const fallbackName = currentUser.displayName || 'Teacher';
                    setTeacherName(fallbackName);
                    teacherNameCache.set(currentUser.uid, fallbackName);
                }
            }
        };

        fetchTeacherData();

        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [currentUser]);

    // Memoize logout handler
    const handleLogout = useCallback(async () => {
        try {
            await logout();
            handleToggleSidebar(false);
            navigate("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }, [logout, navigate, handleToggleSidebar]);

    // Memoize CSS classes to prevent recreating objects on each render
    const sidebarClasses = useMemo(() => {
        return classNames(
            styles.sidebar,
            { [styles.open]: isSidebarOpen, [styles.closed]: !isSidebarOpen }
        );
    }, [isSidebarOpen]);

    // Memoize the menu items based on user role
    const roleBasedMenu = useMemo(() => {
        return menuItems[userRole] || menuItems.teacher;
    }, [userRole]);

    // Memoize the link click handler
    const handleLinkClick = useCallback(() => {
        handleToggleSidebar(false);
    }, [handleToggleSidebar]);

    return (
        <>
            {!isSidebarOpen && (
                <button
                    className={styles.menuButton}
                    onClick={() => handleToggleSidebar(true)}
                >
                    ☰
                </button>
            )}

            <div className={sidebarClasses}>
                <Button
                    label={language === 'EN' ? 'EN' : 'HE'}
                    onClick={toggleLanguage} // Use context function here
                    variant="default"
                    size="small"
                    className={styles.languageButton}
                />
                {/* Close button only on small screens */}
                <div>
                    <button
                        className={styles.closeBtn}
                        onClick={() => handleToggleSidebar(false)}
                    >
                        ✖
                    </button>
                </div>

                {/* Welcome message with teacher's name from Firestore */}
                <div className={styles.welcomeMessage}>
                    {teacherName || t("teacher")}
                </div>

                <nav className={styles.nav}>
                    <ul>
                        {roleBasedMenu.map((item) => (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={styles.navLink}
                                    onClick={handleLinkClick}
                                >
                                    {t("menu", item.nameKey.toLowerCase())}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <button className={styles.logoutButton} onClick={handleLogout}>Logout</button>
            </div>
        </>
    );
});

Sidebar.propTypes = {
    userRole: PropTypes.oneOf(["student", "teacher", "admin"]).isRequired
};

export default Sidebar;