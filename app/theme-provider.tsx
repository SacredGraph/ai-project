'use client';

import { Theme } from '@radix-ui/themes';
import { useEffect, useState } from 'react';

export default function ThemeProvider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // This is a client component to handle system theme preferences
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Effect to check user's preferred color scheme
  useEffect(() => {
    setMounted(true);
    const darkModePreference = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(darkModePreference);
    
    // Add listener for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setIsDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply dark theme class to body
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }, [isDarkMode]);

  return (
    <Theme
      appearance={mounted ? (isDarkMode ? 'dark' : 'light') : 'light'}
      accentColor="blue"
      grayColor="gray"
      scaling="100%"
      radius="medium"
    >
      {children}
    </Theme>
  );
}