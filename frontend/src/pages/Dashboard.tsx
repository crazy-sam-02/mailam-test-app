import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import AdminDashboard from '@/components/admin/AdminDashboard';
import StudentDashboard from '@/components/student/StudentDashboard';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  return user.role === 'admin' ? <AdminDashboard /> : <StudentDashboard />;
};

export default Dashboard;
