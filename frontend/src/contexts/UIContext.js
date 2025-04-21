import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const UIContext = createContext(null);

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
};

export const UIProvider = ({ children }) => {
  // Get initial sidebar state from sessionStorage
  const initialSidebarState = sessionStorage.getItem("sidebarOpen") === "false" ? false : true;
  const [isSidebarOpen, setIsSidebarOpen] = useState(initialSidebarState);
  
  // Save sidebar state to sessionStorage when it changes
  useEffect(() => {
    sessionStorage.setItem("sidebarOpen", isSidebarOpen);
  }, [isSidebarOpen]);
  
  // Use useCallback to memoize the toggleSidebar function
  const toggleSidebar = useCallback((state) => {
    setIsSidebarOpen(prev => typeof state === "boolean" ? state : !prev);
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = React.useMemo(() => ({
    isSidebarOpen,
    toggleSidebar
  }), [isSidebarOpen, toggleSidebar]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};