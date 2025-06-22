import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import Button from "./Button";
import styles from "../styles/modules/Login.module.css";
import { useLanguage } from "../contexts/LanguageContext";
import { GlobeIcon } from 'lucide-react';

const ResetPassword = () => {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { language, toggleLanguage, t } = useLanguage();

    const validateEmail = (email) => {
        // Simple email regex
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        if (!validateEmail(email)) {
            setError(t("ResetPassword", "Enter your email address and we'll send you a link to reset your password."));
            return;
        }
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess(t("ResetPassword", "A password reset email has been sent. Please check your inbox."));
        } catch (err) {
            // Firebase error codes
            if (err.code === "auth/user-not-found") {
                setError(t("ResetPassword", "No user found with this email address."));
            } else if (err.code === "auth/invalid-email") {
                setError(t("ResetPassword", "Invalid email address."));
            } else if (err.code === "auth/too-many-requests") {
                setError(t("ResetPassword", "Too many requests. Please try again later."));
            } else if (err.code === "auth/network-request-failed") {
                setError(t("ResetPassword", "Network error. Please check your connection."));
            } else {
                setError(t("ResetPassword", "Failed to send reset email. Please try again."));
            }
        } finally {
            setLoading(false);
        }
    };

    // Set direction for reset password box
    const dir = language === "HE" ? "rtl" : "ltr";

    return (
        <div className={styles.appContainer}>
            <div className={styles.loginContainer}>
                <div className={styles.loginBox} dir={dir}>
                    <div className={styles.loginLeft}>
                        <div className={styles.loginLogo}>
                            <img
                                src="/REVODUCATE-LOGO.png"
                                alt="Revoducate"
                                className={styles.brandLogo}
                            />
                        </div>
                        <h1 className={styles.loginTitle}>{t("ResetPassword", "Reset Password")}</h1>
                        <form onSubmit={handleSubmit} className={styles.loginForm}>
                            <div className={styles.inputGroup}>
                                <label>{t("LoginPage", "Email address")}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder={t("Placeholders", "Enter your email")}
                                    disabled={loading || !!success}
                                />
                            </div>
                            {error && <p className={styles.errorMessage}>{error}</p>}
                            {success && <p style={{ color: '#27ae60', textAlign: 'center', marginTop: 10 }}>{success}</p>}
                            <div className={styles.loginButtonWrapper}>
                                <Button
                                    label={loading ? t("ResetPassword", "Sending...") : t("ResetPassword", "Send Reset Link")}
                                    type="submit"
                                    variant="primary"
                                    size="wide"
                                    disabled={loading || !!success}
                                />
                            </div>
                        </form>
                        <div style={{ textAlign: 'center', marginTop: 20 }}>
                            <Button
                                label={t("ResetPassword", "Back to Login")}
                                variant="secondary"
                                size="wide"
                                onClick={() => navigate("/login")}
                                disabled={loading}
                            />
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 24 }}>
                            <button
                                className={styles.languageButton}
                                onClick={toggleLanguage}
                                aria-label="Change language"
                                type="button"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', marginTop: 12 }}
                            >
                                <GlobeIcon style={{ marginRight: 6 }} size={20} strokeWidth={1.5} />
                                <span style={{ fontWeight: 600 }}>{language}</span>
                            </button>
                        </div>
                    </div>
                    <div className={styles.loginRight}>
                        <div className={styles.infoBox}>
                            <h2>{t("ResetPassword", "Forgot your password?")}</h2>
                            <p>{t("ResetPassword", "Enter your email address and we'll send you a link to reset your password.")}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
