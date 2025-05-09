import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import styles from "../styles/modules/Sidebar.module.css";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import Button from "../components/Button";

export const menuItems = {
    teacher: [
        { nameKey: "Main page", path: "/mainpage" },
        // Report path removed
        { nameKey: "Courses", path: "/courses" },
        { nameKey: "Students", path: "/students" }
    ],
    admin: [
        { nameKey: "Admin Dashboard", path: "/admin" },
        { nameKey: "Teacher Management", path: "/admin/teachers" },
        { nameKey: "System Reports", path: "/admin/reports" },
        { nameKey: "Settings", path: "/admin/settings" }
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

    const roleBasedMenu = useMemo(() => menuItems[userRole] || menuItems.teacher, [userRole]);

    return (
        <div className={styles.sidebar}>
            <Button
                label={language === 'EN' ? 'EN' : 'HE'}
                onClick={toggleLanguage}
                variant="default"
                size="small"
                className={styles.languageButton}
            />

            <div className={styles.welcomeMessage}>
                {teacherName || t("teacher")}
            </div>

            <nav className={styles.nav}>
                <ul>
                    {roleBasedMenu.map((item) => (
                        <li key={item.path}>
                            <Link to={item.path} className={styles.navLink}>
                                {t("menu", item.nameKey.toLowerCase())}
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
            <button className={styles.logoutButton} onClick={handleLogout}>Logout</button>
        </div>
    );
});

Sidebar.propTypes = {
    userRole: PropTypes.oneOf(["student", "teacher", "admin"]).isRequired
};

export default Sidebar;