import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { loginStudent, registerStudent, type StudentAccount } from '@/lib/telegram';

// ── Admin auth (password-based, unchanged) ────────────────────
const MASTER_PASSWORD = import.meta.env.VITE_MASTER_PASSWORD || 'Air@2003';
const ADMIN_SESSION_KEY = 'airbook_admin_session';
const PASSWORD_KEY = 'airbook_access_password';

// ── Student session stored in sessionStorage ──────────────────
const STUDENT_SESSION_KEY = 'airbook_student_session';

interface AuthContextType {
  // Admin
  isAuthenticated: boolean;
  loading: boolean;
  signIn: (password: string) => { error?: string };
  signOut: () => void;
  isMaster: boolean;
  changeAccessPassword: (newPassword: string) => void;
  accessPassword: string;
  // Student
  student: StudentAccount | null;
  studentLoading: boolean;
  studentSignIn: (email: string, password: string) => Promise<{ error?: string }>;
  studentSignUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  studentSignOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Admin state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMaster, setIsMaster] = useState(false);
  const [loading, setLoading] = useState(true);

  // Student state
  const [student, setStudent] = useState<StudentAccount | null>(null);
  const [studentLoading, setStudentLoading] = useState(true);

  const accessPassword = localStorage.getItem(PASSWORD_KEY) || 'Air';

  useEffect(() => {
    // Restore admin session
    const session = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (session === 'admin' || session === 'master') {
      setIsAuthenticated(true);
      setIsMaster(session === 'master');
    }
    setLoading(false);

    // Restore student session
    const raw = sessionStorage.getItem(STUDENT_SESSION_KEY);
    if (raw) {
      try { setStudent(JSON.parse(raw)); } catch {}
    }
    setStudentLoading(false);
  }, []);

  // Admin sign in
  const signIn = (password: string): { error?: string } => {
    const current = localStorage.getItem(PASSWORD_KEY) || 'Air';
    if (password === MASTER_PASSWORD) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'master');
      setIsAuthenticated(true); setIsMaster(true); return {};
    }
    if (password === current) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'admin');
      setIsAuthenticated(true); setIsMaster(false); return {};
    }
    return { error: 'Invalid password' };
  };

  const signOut = () => {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAuthenticated(false); setIsMaster(false);
  };

  const changeAccessPassword = (newPassword: string) => {
    localStorage.setItem(PASSWORD_KEY, newPassword);
  };

  // Student sign in
  const studentSignIn = async (email: string, password: string): Promise<{ error?: string }> => {
    const result = await loginStudent(email, password);
    if (result.error) return { error: result.error };
    setStudent(result.student!);
    sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(result.student));
    return {};
  };

  // Student sign up
  const studentSignUp = async (name: string, email: string, password: string): Promise<{ error?: string }> => {
    const result = await registerStudent(name, email, password);
    if (result.error) return { error: result.error };
    setStudent(result.student!);
    sessionStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(result.student));
    return {};
  };

  const studentSignOut = () => {
    sessionStorage.removeItem(STUDENT_SESSION_KEY);
    setStudent(null);
  };

  return (
    <AuthContext.Provider value={{
      isAuthenticated, loading, signIn, signOut, isMaster,
      changeAccessPassword, accessPassword,
      student, studentLoading, studentSignIn, studentSignUp, studentSignOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
