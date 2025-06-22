import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import Button from "./Button";
import styles from "../styles/modules/Login.module.css";

const ResetPassword = () => {
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const validateEmail = (email) => {
        // Simple email regex
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess("");
        if (!validateEmail(email)) {
            setError("Please enter a valid email address.");
            return;
        }
        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess("A password reset email has been sent. Please check your inbox.");
        } catch (err) {
            // Firebase error codes
            if (err.code === "auth/user-not-found") {
                setError("No user found with this email address.");
            } else if (err.code === "auth/invalid-email") {
                setError("Invalid email address.");
            } else if (err.code === "auth/too-many-requests") {
                setError("Too many requests. Please try again later.");
            } else if (err.code === "auth/network-request-failed") {
                setError("Network error. Please check your connection.");
            } else {
                setError("Failed to send reset email. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.appContainer}>
            <div className={styles.loginContainer}>
                <div className={styles.loginBox}>
                    <div className={styles.loginLeft}>
                        <div className={styles.loginLogo}>
                            <img
                                src="/REVODUCATE-LOGO.png"
                                alt="Revoducate"
                                className={styles.brandLogo}
                            />
                        </div>
                        <h1 className={styles.loginTitle}>Reset Password</h1>
                        <form onSubmit={handleSubmit} className={styles.loginForm}>
                            <div className={styles.inputGroup}>
                                <label>Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="Enter your email"
                                    disabled={loading || !!success}
                                />
                            </div>
                            {error && <p className={styles.errorMessage}>{error}</p>}
                            {success && <p style={{ color: '#27ae60', textAlign: 'center', marginTop: 10 }}>{success}</p>}
                            <div className={styles.loginButtonWrapper}>
                                <Button
                                    label={loading ? "Sending..." : "Send Reset Email"}
                                    type="submit"
                                    variant="primary"
                                    size="wide"
                                    disabled={loading || !!success}
                                />
                            </div>
                        </form>
                        <div style={{ textAlign: 'center', marginTop: 20 }}>
                            <Button
                                label="Back to Login"
                                variant="secondary"
                                size="wide"
                                onClick={() => navigate("/login")}
                                disabled={loading}
                            />
                        </div>
                    </div>
                    <div className={styles.loginRight}>
                        <div className={styles.infoBox}>
                            <h2>Forgot your password?</h2>
                            <p>Enter your email address and we'll send you a link to reset your password.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
