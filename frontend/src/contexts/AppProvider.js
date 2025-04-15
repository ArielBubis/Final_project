import React from "react";
import { AuthProvider } from "./AuthContext";
import { DataProvider } from "./DataContext";
import { UIProvider } from "./UIContext";

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
        AuthProvider,
        DataProvider,
        UIProvider,
        // Add new providers here easily
      ]}
    >
      {children}
    </ComposeProviders>
  );
};