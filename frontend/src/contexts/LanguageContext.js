import React, { createContext, useContext, useState } from "react";
import translate from "../utils/translate.json";

// 1. Create the context
const LanguageContext = createContext(null);

// 2. Create the hook first
const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};

// 3. Create the provider component
const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(translate.language.options[0]); // default "EN"

  const toggleLanguage = () => {
    setLanguage((prev) =>
      prev === translate.language.options[0]
        ? translate.language.options[1]
        : translate.language.options[0]
    );
  };

  const t = (category, key) => {
    if (language === "HE") {
      return translate.categories?.[category]?.[key] || key;
    }
    return key; // English is default (keys are in English)
  };

  const value = React.useMemo(
    () => ({
      language,
      toggleLanguage,
      t,
    }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

// 4. Export everything at the end
export { LanguageProvider, useLanguage };
