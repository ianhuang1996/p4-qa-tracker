import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { ADMIN_EMAILS, SORT_EDITOR_EMAILS } from '../constants';
import { AppPage } from '../types';

interface AppContextValue {
  user: FirebaseUser | null;
  isAuthReady: boolean;
  isAdmin: boolean;
  canSort: boolean;
  currentPage: AppPage;
  setCurrentPage: (page: AppPage) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  handleLogin: () => Promise<void>;
  handleLogout: () => Promise<void>;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [currentPage, setCurrentPage] = useState<AppPage>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('currentPage');
      if (['overview', 'todo', 'qa', 'release', 'wiki'].includes(saved || '')) return saved as AppPage;
    }
    return 'overview';
  });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark';
    }
    return false;
  });

  // Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // Persist page
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  // Persist dark mode
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const isAdmin = useMemo(() => !!user?.email && ADMIN_EMAILS.includes(user.email), [user]);
  const canSort = useMemo(() => !!user?.email && SORT_EDITOR_EMAILS.includes(user.email), [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try { await signInWithPopup(auth, provider); } catch (error) { console.error("Login failed", error); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (error) { console.error("Logout failed", error); }
  };

  const value: AppContextValue = {
    user,
    isAuthReady,
    isAdmin,
    canSort,
    currentPage,
    setCurrentPage,
    isDarkMode,
    toggleDarkMode: () => setIsDarkMode(prev => !prev),
    sidebarCollapsed,
    toggleSidebar: () => setSidebarCollapsed(prev => !prev),
    handleLogin,
    handleLogout,
    unreadCount,
    setUnreadCount,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
