
import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeType = 'standard' | 'cyberpunk' | 'retro' | 'midnight';

interface ThemeContextType {
  isDarkMode: boolean;
  isAiHubMode: boolean;
  currentTheme: ThemeType;
  toggleTheme: () => void;
  toggleAiHubMode: () => void;
  setCustomTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('ai_hub_theme') === 'dark' || true);
  const [isAiHubMode, setIsAiHubMode] = useState(() => localStorage.getItem('ai_hub_beta') === 'true');
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => (localStorage.getItem('ai_hub_custom_theme') as ThemeType) || 'standard');

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) root.classList.add('dark');
    else root.classList.remove('dark');
    
    // Apply custom theme classes
    root.classList.remove('theme-cyberpunk', 'theme-retro', 'theme-midnight');
    if (currentTheme !== 'standard') {
      root.classList.add(`theme-${currentTheme}`);
    }
    
    localStorage.setItem('ai_hub_theme', isDarkMode ? 'dark' : 'light');
    localStorage.setItem('ai_hub_custom_theme', currentTheme);
  }, [isDarkMode, currentTheme]);

  const toggleTheme = () => setIsDarkMode(prev => !prev);
  const toggleAiHubMode = () => setIsAiHubMode(prev => !prev);
  const setCustomTheme = (theme: ThemeType) => setCurrentTheme(theme);

  return (
    <ThemeContext.Provider value={{ isDarkMode, isAiHubMode, currentTheme, toggleTheme, toggleAiHubMode, setCustomTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};
