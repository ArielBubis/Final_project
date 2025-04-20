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
            alert("Login Successful!");
            navigate("/report"); // Redirect after login (Change route if needed)
        } catch (err) {
            setError("Invalid email or password");
        }
    };

    return (
        <div className={styles.appContainer}>
            <div className={styles.loginContainer}>
                <div className={styles.loginBox}>
                    {/* Left Column */}
                    <div className={styles.loginLeft}>
                        <h1>Login</h1>

                        {/* Login Form */}
                        <form onSubmit={handleLogin} className={styles.loginForm}>
                            <div className={styles.inputGroup}>
                                <label>Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className={styles.forgotPassword}>
                                <a href="#!">Forgot password?</a>
                            </div>

                            <Button
                                label="Login"
                                onClick={handleLogin}
                                type="submit"
                                variant="primary"
                                size="wide"
                            />

                            {error && <p className={styles.errorMessage}>{error}</p>}
                        </form>
                    </div>

                    {/* Right Column */}
                    <div className={styles.loginRight}>
                        <div className={styles.infoBox}>
                            <div className={styles.loginLogo}>
                                <img
                                    src="https://icons.veryicon.com/png/o/business/colorful-office-icons/book-52.png"
                                    alt="Logo"
                                />
                                <h4>ClassInsight</h4>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;