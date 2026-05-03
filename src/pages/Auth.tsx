import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Auth is now handled by PasswordProtectedIndex (no email/password signup needed).
const Auth = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/password-protected', { replace: true }); }, [navigate]);
  return null;
};

export default Auth;
