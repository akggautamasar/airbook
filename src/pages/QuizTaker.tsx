import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Quiz taking is now handled by opening the HTML file directly in a new tab.
// This page redirects to mock-tests if someone lands on the old route.
const QuizTaker = () => {
  const navigate = useNavigate();
  useEffect(() => { navigate('/mock-tests', { replace: true }); }, [navigate]);
  return null;
};

export default QuizTaker;
