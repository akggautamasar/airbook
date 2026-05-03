import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Simple password-based auth — no Supabase needed.
// Passwords are stored in localStorage (admin can change via master password).

const MASTER_PASSWORD = import.meta.env.VITE_MASTER_PASSWORD || 'Air@2003';
const SESSION_KEY = 'airbook_session';
const PASSWORD_KEY = 'airbook_access_password';

interface AuthContextType {
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (password: string) => { error?: string };
  signOut: () => void;
  isMaster: boolean;
  changeAccessPassword: (newPassword: string) => void;
  accessPassword: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);

  const accessPassword = localStorage.getItem(PASSWORD_KEY) || 'Air';

  useEffect(() => {
    const session = sessionStorage.getItem(SESSION_KEY);
    if (session === 'admin' || session === 'master') {
      setIsAuthenticated(true);
      setIsMaster(session === 'master');
    }
    setLoading(false);
  }, []);

  const signIn = (password: string): { error?: string } => {
    const current = localStorage.getItem(PASSWORD_KEY) || 'Air';
    if (password === MASTER_PASSWORD) {
      sessionStorage.setItem(SESSION_KEY, 'master');
      setIsAuthenticated(true);
      setIsMaster(true);
      return {};
    }
    if (password === current) {
      sessionStorage.setItem(SESSION_KEY, 'admin');
      setIsAuthenticated(true);
      setIsMaster(false);
      return {};
    }
    return { error: 'Invalid password' };
  };

  const signOut = () => {
    sessionStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setIsMaster(false);
  };

  const changeAccessPassword = (newPassword: string) => {
    localStorage.setItem(PASSWORD_KEY, newPassword);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated,
      loading,
      signIn,
      signOut,
      isMaster,
      changeAccessPassword,
      accessPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
