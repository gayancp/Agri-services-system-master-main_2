import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import CSRDashboard from './CSRDashboard';
import ServiceProviderDashboard from './ServiceProviderDashboard';
import ProfilePage from '../profile/ProfilePage';

const DashboardPage = () => {
  const { user } = useAuth();

  // Route to specific dashboard based on user role
  switch (user?.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'customer_service_rep':
      return <CSRDashboard />;
    case 'service_provider':
      return <ServiceProviderDashboard />;
    case 'farmer':
      // Route farmers to the Profile management page
      return <ProfilePage />;
    default:
      return (
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            Welcome back, {user?.firstName}!
          </h1>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Your Role</h3>
              <p className="text-3xl font-bold text-green-600 capitalize">{user?.role}</p>
            </div>
            
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Total Orders</h3>
              <p className="text-3xl font-bold text-blue-600">0</p>
            </div>
            
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Products Listed</h3>
              <p className="text-3xl font-bold text-orange-600">0</p>
            </div>
          </div>

          <div className="card p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h2>
            <p className="text-gray-600 text-lg">
              Dashboard not configured for your role. Please contact administrator.
            </p>
          </div>
        </div>
      );
  }
};

export default DashboardPage;