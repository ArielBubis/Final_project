import React from "react";
import { AuthProvider } from "./AuthContext";
import { DataProvider } from "./DataContext";
import { UIProvider } from "./UIContext";
import { PerformanceProvider } from "./PerformanceContext";
import { LanguageProvider } from "./LanguageContext";

// Helper component to compose multiple providers
const ComposeProviders = ({ providers = [], children }) => {
  return providers.reduceRight((acc, Provider) => {
    return <Provider>{acc}</Provider>;
  }, children);
};

export const AppProvider = ({ children }) => {
  return (
    <ComposeProviders
      providers={[
        AuthProvider,      
        LanguageProvider,  
        DataProvider,     
        PerformanceProvider,
        UIProvider,

      ]}
    >
      {children}
    </ComposeProviders>
  );
};

export default AppProvider;