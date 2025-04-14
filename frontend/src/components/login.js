import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { useNavigate } from "react-router-dom";
import Button from "./Button"; // Import the Button component
import "../styles/styles.css"; // Consolidated CSS for styling

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
            navigate("/Dashboard"); // Redirect after login (Change route if needed)
        } catch (err) {
            setError("Invalid email or password");
        }
    };

    return (
        <div className="app-container"> {/* Wrap in app-container */}
            <div className="login-container">
                <div className="login-box">
                    {/* Left Column */}
                    <div className="login-left">
                        <h1>Login</h1>

                        {/* Login Form */}
                        <form onSubmit={handleLogin} className="login-form">
                            <div className="input-group">
                                <label>Email address</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="forgot-password">
                                <a href="#!">Forgot password?</a>
                            </div>

                            <div className="component-button">
                                <Button
                                    label="Login"
                                    onClick={handleLogin} // Passing handleLogin directly to onClick
                                    blue={true}
                                    wide={true}
                                />
                            </div>

                            {error && <p className="error-message">{error}</p>}
                        </form>
                    </div>

                    {/* Right Column */}
                    <div className="login-right">
                        <div className="info-box">
                            <div className="login-logo">
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