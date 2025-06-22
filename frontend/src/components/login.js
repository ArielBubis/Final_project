import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import Button from "./Button";
import styles from "../styles/modules/Login.module.css";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/mainpage");
        } catch (err) {
            setError("Invalid email or password");
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

                        <h1 className={styles.loginTitle}>Welcome Back</h1>

                        <form onSubmit={handleLogin} className={styles.loginForm}>
                            <div className={styles.inputGroup}>
                                <label>Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    placeholder="Enter your email"
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    placeholder="Enter your password"
                                />
                            </div>

                            <div className={styles.forgotPassword}>
                                <a href="#" onClick={e => { e.preventDefault(); navigate('/reset-password'); }}>Forgot password?</a>
                            </div>

                            <div className={styles.loginButtonWrapper}>
                                <Button
                                    label="Sign In"
                                    onClick={handleLogin}
                                    type="submit"
                                    variant="primary"
                                    size="wide"
                                />
                            </div>

                            {error && <p className={styles.errorMessage}>{error}</p>}
                        </form>
                    </div>

                    <div className={styles.loginRight}>
                        <div className={styles.infoBox}>
                            <h2>Welcome to Revoducate</h2>
                            <p>Access your dashboard to manage courses and track student performance.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;