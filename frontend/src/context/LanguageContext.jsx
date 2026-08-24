import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

const translations = {
  en: {
    dashboard: 'Dashboard',
    tournaments: 'Tournaments',
    leaderboard: 'Leaderboards',
    forums: 'Community Forums',
    replays: 'Replay Center',
    wallet: 'Arena Wallet',
    store: 'Reward Store',
    settings: 'Account Settings',
    hallOfFame: 'Hall of Fame',
    esportsNews: 'Esports News',
    recruitment: 'LFT / LFP Board',
    logout: 'Logout',
    profile: 'Player Profile',
    searchPlaceholder: 'Search tournaments, players, teams...',
    generalSettings: 'General Preferences',
    saveSettings: 'Save General Settings',
    availabilityStatus: 'Competitor Availability Status',
    uiLanguage: 'UI Language',
    themeMode: 'Theme Mode',
    available: '🟢 Available',
    busy: '🔴 Busy / In Match',
    lookingForTournament: '🏆 Looking for Tournament',
    lookingForTeam: '🛡️ Looking for Team (LFT)',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    tournaments: 'टूर्नामेंट्स',
    leaderboard: 'लीडरबोर्ड',
    forums: 'कम्युनिटी फोरम',
    replays: 'रिप्ले सेंटर',
    wallet: 'अरेना वॉलेट',
    store: 'रिवॉर्ड स्टोर',
    settings: 'अकाउंट सेटिंग्स',
    hallOfFame: 'हॉल ऑफ फेम',
    esportsNews: 'ई-स्पोर्ट्स समाचार',
    recruitment: 'LFT / LFP बोर्ड',
    logout: 'लॉगआउट',
    profile: 'प्लेयर प्रोफाइल',
    searchPlaceholder: 'टूर्नामेंट, खिलाड़ी, टीम खोजें...',
    generalSettings: 'सामान्य प्राथमिकताएं',
    saveSettings: 'सामान्य सेटिंग्स सहेजें',
    availabilityStatus: 'प्रतियोगी उपलब्धता स्थिति',
    uiLanguage: 'भाषा चुनें',
    themeMode: 'थीम मोड',
    available: '🟢 उपलब्ध (Available)',
    busy: '🔴 व्यस्त / मैच में',
    lookingForTournament: '🏆 टूर्नामेंट की तलाश',
    lookingForTeam: '🛡️ टीम की तलाश (LFT)',
  },
  gu: {
    dashboard: 'ડેશબોર્ડ',
    tournaments: 'ટૂર્નામેન્ટ્સ',
    leaderboard: 'લીડરબોર્ડ',
    forums: 'કમ્યુનિટી ફોરમ',
    replays: 'રિપ્લે સેન્ટર',
    wallet: 'એરેના વોલેટ',
    store: 'રિવોર્ડ સ્ટોર',
    settings: 'એકાઉન્ટ સેટિંગ્સ',
    hallOfFame: 'હોલ ઓફ ફેમ',
    esportsNews: 'ઈ-સ્પોર્ટ્સ ન્યૂઝ',
    recruitment: 'LFT / LFP બોર્ડ',
    logout: 'લોગઆઉટ',
    profile: 'પ્લેયર પ્રોફાઈલ',
    searchPlaceholder: 'ટૂર્નામેન્ટ, ખેલાડીઓ, ટીમ શોધો...',
    generalSettings: 'સામાન્ય પ્રાથમિકતાઓ',
    saveSettings: 'સામાન્ય સેટિંગ્સ સાચવો',
    availabilityStatus: 'સ્પર્ધક ઉપલબ્ધતા સ્થિતિ',
    uiLanguage: 'ભાષા પસંદ કરો',
    themeMode: 'થીમ મોડ',
    available: '🟢 ઉપલબ્ધ (Available)',
    busy: '🔴 વ્યસ્ત / મેચમાં',
    lookingForTournament: '🏆 ટૂર્નામેન્ટની શોધમાં',
    lookingForTeam: '🛡️ ટીમની શોધમાં (LFT)',
  },
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('arenaverse-lang') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('arenaverse-lang', language);
  }, [language]);

  const changeLanguage = (newLang) => {
    if (translations[newLang]) {
      setLanguage(newLang);
    }
  };

  const t = (key) => {
    return translations[language]?.[key] || translations.en?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
