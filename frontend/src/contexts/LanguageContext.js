import React, { createContext, useContext, useState } from "react";
import translate from "../utils/translate.json";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
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

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
