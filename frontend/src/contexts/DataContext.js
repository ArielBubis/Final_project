import React, { createContext, useContext, useState, useEffect } from "react";
import { fetchAllStudents } from "../services/studentService";

// Create the context
const DataContext = createContext(null);

// Custom hook to use the data context
export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Example course data (moved from Dashboard.js)
  const courseData = [
    { name: "Math 101", level: "Beginner", thumbnailUrl: "https://via.placeholder.com/80" },
    { name: "History 202", level: "Intermediate", thumbnailUrl: "https://via.placeholder.com/80" },
    { name: "Physics 303", level: "Advanced", thumbnailUrl: "https://via.placeholder.com/80" },
    { name: "Calculus 1", level: "Intermediate", thumbnailUrl: "https://via.placeholder.com/80" }
  ];

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true);
        const fetchedStudents = await fetchAllStudents();
        setStudents(fetchedStudents);
        setError("");
      } catch (err) {
        setError("Failed to load students");
        console.error("Error loading students:", err);
      } finally {
        setLoading(false);
      }
    };
    
    loadStudents();
  }, []);

  const value = {
    students,
    courseData,
    loading,
    error
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};