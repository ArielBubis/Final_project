import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
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

  // Login function - memoize with useCallback
  const login = useCallback(async (email, password) => {
    try {
      setError("");
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (err) {
      setError("Invalid email or password");
      return false;
    }
  }, []);

  // Logout function - memoize with useCallback
  const logout = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      return true;
    } catch (err) {
      setError("Failed to log out");
      return false;
    }
  }, []);

  // Effect to monitor auth state
  useEffect(() => {
    let isMounted = true;

  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    if (!isMounted) return;

    if (user) {
      setCurrentUser(user);

      try {
        let role = "user"; // Default role

        // Fetch user document from Firestore
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log("User data:", userData);

          // Check roles field
          const roles = userData.roles || {};
          if (roles.admin) {
            console.log("User is an admin");
            role = "admin";
          } else if (roles.teacher) {
            console.log("User is a teacher");
            role = "teacher";
          } else if (roles.student) {
            console.log("User is a student");
            role = "student";
          } else {
            console.warn("No specific role found, defaulting to 'user'");
          }
        } else {
          console.warn("User document does not exist in Firestore");
        }

        if (isMounted) {
          setUserRole(role);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
        if (isMounted) {
          setUserRole("teacher"); // Default to teacher for backward compatibility
        }
      }
    } else {
      if (isMounted) {
        setCurrentUser(null);
        setUserRole(null);
      }
    }

    if (isMounted) {
      setLoading(false);
    }
  });

  return () => {
    isMounted = false;
    unsubscribe();
  };
}, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    currentUser,
    userRole,
    login,
    logout,
    error,
    loading
  }), [currentUser, userRole, login, logout, error, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};