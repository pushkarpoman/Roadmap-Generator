"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getCurrentUser, login, logout, register } from "@/services/api";
import type { UserDTO } from "@/types/roadmap";

type AppContextType = {
  user: UserDTO | null;
  authLoading: boolean;
  theme: "dark" | "light";
  setTheme: (theme: "dark" | "light") => void;
  toggleTheme: () => void;
  loginUser: (email: string, password: string) => Promise<void>;
  registerUser: (name: string, email: string, password: string) => Promise<void>;
  logoutUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [theme, setThemeState] = useState<"dark" | "light">("dark");

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem("theme");
      if (savedTheme === "light" || savedTheme === "dark") {
        setThemeState(savedTheme);
        document.documentElement.setAttribute("data-theme", savedTheme);
        return;
      }
    }

    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const setTheme = useCallback((nextTheme: "dark" | "light") => {
    setThemeState(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem("theme", nextTheme);
      document.documentElement.setAttribute("data-theme", nextTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  const loginUser = useCallback(async (email: string, password: string) => {
    const data = await login(email, password);
    setUser(data.user);
  }, []);

  const registerUser = useCallback(async (name: string, email: string, password: string) => {
    const data = await register(name, email, password);
    setUser(data.user);
  }, []);

  const logoutUser = useCallback(async () => {
    await logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      authLoading,
      theme,
      setTheme,
      toggleTheme,
      loginUser,
      registerUser,
      logoutUser,
      refreshUser,
    }),
    [authLoading, loginUser, logoutUser, refreshUser, registerUser, setTheme, theme, toggleTheme, user]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }
  return context;
}
