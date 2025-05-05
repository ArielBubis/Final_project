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

  // Get user role from Firestore document
  const getUserRole = useCallback(async (user) => {
    if (!user) return null;
    
    try {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("User data:", userData);
        // Check roles and return the appropriate one
        if (userData.roles) {
          if (userData.roles.admin) return "admin";
          if (userData.roles.teacher) return "teacher";
          if (userData.roles.student) return "student";
        }
      }
      
      // Default to student instead of user if no specific role is found
      // This ensures we only provide valid roles for the Sidebar component
      return "student";
    } catch (error) {
      console.error("Error getting user role:", error);
      return "student"; // Default fallback role
    }
  }, []);

  // Effect to monitor auth state
  useEffect(() => {
    let isMounted = true;
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Only update state if the component is still mounted
      if (!isMounted) return;
      
      if (user) {
        setCurrentUser(user);
        // Fetch user role from Firestore
        try {
          const role = await getUserRole(user);
          if (isMounted) {
            setUserRole(role);
          }
        } catch (err) {
          console.error("Error fetching user role:", err);
          // Default to teacher role for backward compatibility
          if (isMounted) {
            setUserRole("teacher");
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

    // Cleanup function
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [getUserRole]);

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