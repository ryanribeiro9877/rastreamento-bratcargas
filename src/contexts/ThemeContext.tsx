// contexts/ThemeContext.tsx - Contexto de Tema (Claro/Escuro)

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'claro' | 'escuro';

interface ThemeContextType {
  tema: Theme;
  setTema: (tema: Theme) => void;
  toggleTema: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [tema, setTemaState] = useState<Theme>(() => {
    const saved = localStorage.getItem('tema');
    return (saved as Theme) || 'claro';
  });

  useEffect(() => {
    localStorage.setItem('tema', tema);
    
    // Aplicar classes no documento
    if (tema === 'escuro') {
      document.documentElement.classList.add('dark');
      document.body.style.backgroundColor = '#1f2937';
      document.body.style.color = '#f9fafb';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    }
  }, [tema]);

  const setTema = (novoTema: Theme) => {
    setTemaState(novoTema);
  };

  const toggleTema = () => {
    setTemaState(prev => prev === 'claro' ? 'escuro' : 'claro');
  };

  return (
    <ThemeContext.Provider value={{ tema, setTema, toggleTema }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de ThemeProvider');
  }
  return context;
}

export default ThemeContext;
