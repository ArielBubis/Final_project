import React from "react";
import { AuthProvider } from "./AuthContext";
import { UIProvider } from "./UIContext";
import { DataProvider } from "./DataContext";

export const AppProvider = ({ children }) => {
  return (
    <AuthProvider>
      <UIProvider>
        <DataProvider>
          {children}
        </DataProvider>
      </UIProvider>
    </AuthProvider>
  );
};