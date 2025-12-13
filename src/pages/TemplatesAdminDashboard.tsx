import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const TemplatesAdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Always redirect to login page for the templates admin area.
  useEffect(() => {
    navigate('/templates-gestion/login');
  }, [navigate]);

  return null; // immediate redirect, no UI needed here
};

export default TemplatesAdminDashboard;
