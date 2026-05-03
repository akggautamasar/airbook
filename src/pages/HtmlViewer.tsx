import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const HtmlViewer = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/mock-tests', { replace: true }); }, [navigate]);
  return null;
};

export default HtmlViewer;
