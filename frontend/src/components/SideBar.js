import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import { useUI } from "../contexts/UIContext";
import styles from "../styles/modules/Sidebar.module.css";
import classNames from "classnames";
import { useLanguage } from "../contexts/LanguageContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import Button from "../components/Button";
import translate from "../utils/translate.json";

export const menuItems = {
    teacher: [
        { nameKey: "dashboard", path: "/dashboard" },
        { nameKey: "report", path: "/report" },
        { nameKey: "anomaly", path: "/anomaly" },
        { nameKey: "courses", path: "/courses" },
        { nameKey: "students", path: "/students" },
        { nameKey: "performance", path: "/performance" }
    ],
    admin: [
        { nameKey: "admin dashboard", path: "/admin" },
        { nameKey: "teacher management", path: "/admin/teachers" },
        { nameKey: "system reports", path: "/admin/reports" },
        { nameKey: "settings", path: "/admin/settings" }
    ]
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

    const roleBasedMenu = useMemo(() => {
        const originalMenu = menuItems[userRole] || menuItems.teacher;
    
        if (language === "HE") {
            // If Hebrew is selected, translate the names
            return originalMenu.map(item => ({
                ...item,
                translatedName: t("menu", item.nameKey)
            }));
        }
    
        // If English, no translation needed
        return originalMenu.map(item => ({
            ...item,
            translatedName: item.nameKey
        }));
    }, [userRole, language, t]);
    

    // Memoize the link click handler
    const handleLinkClick = useCallback(() => {
        handleToggleSidebar(false);
    }, [handleToggleSidebar]);

    const handleLanguageToggle = () => {
        toggleLanguage();
    };

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
                    label={language === "EN" ? "EN" : "עב"}
                    onClick={handleLanguageToggle}
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
                    {t("general", "welcome")}, {teacherName || 'Teacher'}                </div>
                <nav className={styles.nav}>
                    <ul>
                        {roleBasedMenu.map((item) => (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={styles.navLink}
                                    onClick={handleLinkClick}
                                >
                                    {t("menu", item.nameKey)}  
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
                <button className={styles.logoutButton} onClick={handleLogout}>
                    {t("general", "logout")}
                </button>            </div>
        </>
    );
});

Sidebar.propTypes = {
    userRole: PropTypes.oneOf(["teacher", "admin"]).isRequired
};

export default Sidebar;