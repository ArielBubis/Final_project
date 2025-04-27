import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
    en: {
        translation: {
            "welcome": "Welcome",
            "logout": "Logout",
            "teacher": "Teacher",
            "dashboard": "Dashboard",
            "settings": "Settings",
            "name": "Name",
            "menu": {
                "courses": "Courses",
                "students": "Students",
                "performance": "Performance",
                "report": "Report",
                "anomaly": "Anomaly",
                "admin dashboard": "Admin Dashboard",
                "teacher management": "Teacher Management",
                "system reports": "System Reports"
            },
        }
    },
    he: {
        translation: {
            "welcome": "ברוך הבא",
            "logout": "התנתקות",
            "teacher": "מורה",
            "Dashboard": "סקירה כללית",
            "settings": "הגדרות",
            "name": "שם",
            "menu": {
                "courses": "קורסים",
                "Report": "דוח",
                "anomaly": "חריגות",
                "students": "תלמידים",
                "performance": "ביצועים",
                "admin dashboard": "לוח מנהל",
                "teacher management": "ניהול מורים",
                "system reports": "דוחות מערכת",
                "logout": "התנתקות",
            },
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: "en",
        fallbackLng: "en",
        interpolation: {
            escapeValue: false
        }
    });

export default i18n;