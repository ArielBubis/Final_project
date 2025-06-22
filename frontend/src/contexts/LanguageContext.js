import React, { createContext, useContext, useState, useEffect } from "react";
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
  // Load language from localStorage or default to EN
  const getInitialLanguage = () => {
    const stored = localStorage.getItem("language");
    if (stored && translate.language.options.includes(stored)) return stored;
    return translate.language.options[0];
  };
  const [language, setLanguage] = useState(getInitialLanguage);

  useEffect(() => {
    localStorage.setItem("language", language);
    // Set dir attribute on body for RTL/LTR
    document.body.setAttribute("dir", language === "HE" ? "rtl" : "ltr");
  }, [language]);

  const toggleLanguage = () => {
    setLanguage((prev) =>
      prev === translate.language.options[0]
        ? translate.language.options[1]
        : translate.language.options[0]
    );
  };

  const t = (category, key) => {
    if (language === "HE") {
      return (
        translate.categories?.[category]?.[key] ||
        translate.categories?.LoginPage?.[key] ||
        key
      );
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
