/**
 * Authentication service for handling login, registration, and other auth-related functions
 */
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";

/**
 * Login user with email and password
 * Uses the exact original email as entered by user
 * 
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {Promise<Object>} Result object with success status and message or user data
 */
export const loginWithEmailAndPassword = async (email, password) => {
  try {
    // Use the original email directly without normalization
    console.log(`Login attempt with original email: ${email}`);
    
    // Attempt firebase authentication with the original email
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    return {
      success: true,
      user: userCredential.user
    };
  } catch (error) {
    console.error("Login error:", error.code, error.message);
    
    // Provide user-friendly error messages based on Firebase error codes
    let message = "";
    switch (error.code) {
      case 'auth/invalid-email':
        message = "Invalid email format. Please check your email address.";
        break;
      case 'auth/invalid-credential':
        message = "Invalid email or password. Please check your credentials and try again.";
        break;
      case 'auth/user-disabled':
        message = "This account has been disabled. Please contact support.";
        break;
      case 'auth/user-not-found':
        message = "No account found with this email. Please check your email or sign up.";
        break;
      case 'auth/wrong-password':
        message = "Incorrect password. Please try again.";
        break;
      case 'auth/too-many-requests':
        message = "Too many failed login attempts. Please try again later or reset your password.";
        break;
      default:
        message = error.message || "An error occurred during login. Please try again.";
    }
    
    return {
      success: false,
      error: error.code,
      message: message
    };
  }
};

/**
 * Check if there is a currently authenticated user
 * 
 * @returns {Object|null} The current user object or null
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Log out the current user
 * 
 * @returns {Promise<void>}
 */
export const logout = async () => {
  try {
    await auth.signOut();
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return { 
      success: false, 
      message: error.message 
    };
  }
};