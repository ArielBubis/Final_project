import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import Button from "../components/shared/buttons/BaseButton";
import styles from "../styles/modules/Login.module.css";
import { useLanguage } from "../contexts/LanguageContext";
import { GlobeIcon } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();
    const { language, toggleLanguage, t } = useLanguage();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/mainpage");
        } catch (err) {
            setError("Invalid email or password");
        }
    };

    // Set direction for login box
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

                        <h1 className={styles.loginTitle}>{t("LoginPage", "Login")}</h1>

                        <form onSubmit={handleLogin} className={styles.loginForm}>
                            <div className={styles.inputGroup}>
                                <label>{t("LoginPage", "Email address")}</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder={t("Placeholders", "Enter your email")}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>{t("LoginPage", "Password")}</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder={t("Placeholders", "Enter your password")}
                                />
                            </div>

                            <div className={styles.forgotPassword}>
                                <a href="#" onClick={e => { e.preventDefault(); navigate('/reset-password'); }}>{t("LoginPage", "Forgot password?")}</a>
                            </div>

                            <div className={styles.loginButtonWrapper}>
                                <Button
                                    onClick={handleLogin}
                                    type="submit"
                                    variant="primary"
                                    size="wide"
                                >
                                    {t("LoginPage", "Login")}
                                </Button>
                            </div>

                            {error && <p className={styles.errorMessage}>{error}</p>}
                        </form>
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
                            <h2>{t("Welcome", "Welcome to Revoducate")}</h2>
                            <p>{t("Welcome", "Access your dashboard to manage courses and track student performance.")}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;