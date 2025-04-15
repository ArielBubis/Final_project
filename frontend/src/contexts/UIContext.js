import React, { createContext, useContext, useState, useEffect } from "react";

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
  
  const toggleSidebar = (state) => {
    setIsSidebarOpen(typeof state === "boolean" ? state : !isSidebarOpen);
  };

  const value = {
    isSidebarOpen,
    toggleSidebar
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};