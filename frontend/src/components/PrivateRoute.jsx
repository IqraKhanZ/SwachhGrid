import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function PrivateRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <Loader2 className="w-10 h-10 text-accent animate-spin" />
      </div>
    );
  }
  return currentUser ? children : <Navigate to="/auth" replace />;
}
