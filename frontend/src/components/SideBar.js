import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import styles from "../styles/modules/Sidebar.module.css";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import Button from "../components/Button";
import { 
    HomeIcon, 
    BookOpenIcon, 
    UsersIcon, 
    LineChartIcon, 
    SettingsIcon, 
    LogOutIcon,
    GlobeIcon
} from 'lucide-react';

export const menuItems = {
    teacher: [
        { nameKey: "main page", path: "/mainpage", icon: HomeIcon },
        { nameKey: "Courses", path: "/courses", icon: BookOpenIcon },
        { nameKey: "Students", path: "/students", icon: UsersIcon },
    ],
    admin: [
        { nameKey: "Admin Dashboard", path: "/admin", icon: HomeIcon },
        { nameKey: "Teacher Management", path: "/admin/teachers", icon: UsersIcon },
        { nameKey: "System Reports", path: "/admin/reports", icon: LineChartIcon },
        { nameKey: "Settings", path: "/admin/settings", icon: SettingsIcon }
    ],
};

// Cache to avoid redundant teacher name fetches
const teacherNameCache = new Map();

const Sidebar = React.memo(({ userRole }) => {
    const navigate = useNavigate();
    const { logout, currentUser } = useAuth();
    const [teacherName, setTeacherName] = useState("");
    const { language, toggleLanguage, t } = useLanguage();

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
                const [userDoc, teacherDoc] = await Promise.all([
                    getDoc(doc(db, "users", currentUser.uid)),
                    getDoc(doc(db, "teachers", currentUser.uid))
                ]);

                if (!isMounted) return;

                // Try to get name from user document first, then teacher document
                const userData = userDoc.exists() ? userDoc.data() : null;
                const teacherData = teacherDoc.exists() ? teacherDoc.data() : null;

                const name = userData?.firstName && userData?.lastName
                    ? `${userData.firstName} ${userData.lastName}`
                    : teacherData?.firstName && teacherData?.lastName
                        ? `${teacherData.firstName} ${teacherData.lastName}`
                        : currentUser.displayName || currentUser.email?.split('@')[0] || 'Teacher';

                setTeacherName(name);
                teacherNameCache.set(currentUser.uid, name);
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
        return () => { isMounted = false; };
    }, [currentUser]);

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    console.log("Sidebar rendered with userRole:", userRole);    const location = useLocation();
    const roleBasedMenu = useMemo(() => menuItems[userRole] || menuItems.teacher, [userRole]);

    const isActive = (path) => location.pathname === path;

    return (
        <div className={styles.sidebar}>
            <div className={styles.logoContainer}>
                <Link to="/mainpage" aria-label="Go to main page">
                    <img
                        src="/REVODUCATE-LOGO.png"
                        alt="Revoducate Logo"
                        className={styles.logo}
                    />
                </Link>            </div>

            <div className={styles.profileSection}>
                <div className={styles.userName}>
                    {teacherName || "Allison Sanchez"}
                </div>
                <div className={styles.userRole}>
                    {t("teacher")}
                </div>
            </div>

            <nav className={styles.navSection}>
                {roleBasedMenu.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`${styles.navItem} ${isActive(item.path) ? styles.active : ''}`}
                        >
                            <Icon className={styles.navIcon} />
                            {t("SidebBar", item.nameKey.toLowerCase())}
                        </Link>
                    );
                })}
            </nav>            <div className={styles.bottomSection}>                <button 
                    className={styles.bottomMenuItem}
                    onClick={toggleLanguage}
                    aria-label="Change language"
                >                    <GlobeIcon 
                        className={styles.menuIcon} 
                        aria-hidden="true"
                        size={20}
                        strokeWidth={1.5}
                         style={{ marginTop: '6px' }}
                    />
                    <span className={styles.languageIndicator}>{language}</span>
                </button>

                <button 
                    className={styles.bottomMenuItem}
                    onClick={() => navigate("/settings")}
                    aria-label="Open settings"
                >
                    <SettingsIcon 
                        className={styles.menuIcon} 
                        aria-hidden="true"
                        size={20}
                        strokeWidth={1.5}
                    />
                    <span className={styles.menuLabel}>Settings</span>
                </button>

                <button 
                    className={`${styles.bottomMenuItem} ${styles.logout}`}
                    onClick={handleLogout}
                    aria-label="Sign out"
                >
                    <LogOutIcon 
                        className={styles.menuIcon} 
                        aria-hidden="true"
                        size={20}
                        strokeWidth={1.5}
                    />
                    <span className={styles.menuLabel}>Logout</span>
                </button>
            </div>
        </div>
    );
});

Sidebar.propTypes = {
    userRole: PropTypes.oneOf(["student", "teacher", "admin"]).isRequired
};

export default Sidebar;