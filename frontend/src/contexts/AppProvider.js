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

// Compose contexts without deep nesting
export const AppProvider = ({ children }) => {
  return (
    <ComposeProviders
      providers={[
        AuthProvider,      // Auth should be first as it's most fundamental
        LanguageProvider,  // Language should be early as it's used by many components
        DataProvider,      // Data depends on Auth
        PerformanceProvider,
        UIProvider,
        // Add new providers here easily
      ]}
    >
      {children}
    </ComposeProviders>
  );
};

export default AppProvider;