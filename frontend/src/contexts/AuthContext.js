import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import { 
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

// Create the context
const AuthContext = createContext(null);

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Login function
  const login = async (email, password) => {
    try {
      setError("");
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err) {
      setError("Invalid email or password");
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      return true;
    } catch (err) {
      setError("Failed to log out");
      return false;
    }
  };

  // Effect to monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Fetch user role from Firestore
        try {
          let role = "user"; // Default role
          
          // Check if user exists in Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log("User data:", userData);
            if (userData.roles) {
              if (userData.roles.admin) {
                console.log("User is an admin");
                role = "admin";
              } else if (userData.roles.teacher) {
                console.log("User is a teacher");
                role = "teacher";
              } else if (userData.roles.student) {
                console.log("User is a student");
                role = "student";
              }
            }
          }
          
          setUserRole(role);
        } catch (err) {
          console.error("Error fetching user role:", err);
          // Default to teacher role for backward compatibility
          setUserRole("teacher");
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    login,
    logout,
    error,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};