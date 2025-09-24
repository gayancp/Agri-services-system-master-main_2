import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Import components
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import HomePage from './components/pages/HomePage';
import ServiceBrowserPage from './components/pages/ServiceBrowserPage';
import ServiceDetailPage from './components/pages/ServiceDetailPage';
import ServicePaymentPage from './components/payment/ServicePaymentPage';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
// Product components removed
import DashboardPage from './components/dashboard/DashboardPage';
import ProfilePage from './components/profile/ProfilePage';
// CreateProductPage removed
import OrdersPage from './components/orders/OrdersPage';
import CartPage from './components/cart/CartPage';
import LoadingSpinner from './components/common/LoadingSpinner';

// Forum components
import ForumPage from './components/forum/ForumPage';
import CreateEditForumPost from './components/forum/CreateEditForumPost';
import ForumPostDetail from './components/forum/ForumPostDetail';

// Ticket components
import TicketsPage from './components/tickets/TicketsPage';
import TicketSubmissionPage from './components/tickets/TicketSubmissionPage';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

// Public Route component (redirect to dashboard if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!isAuthenticated) return children;
  // Redirect based on role when already authenticated
  if (user?.role === 'farmer') return <Navigate to="/" />;
  return <Navigate to="/dashboard" />;
};

function App() {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/services" element={<ServiceBrowserPage />} />
          <Route path="/services/:id" element={<ServiceDetailPage />} />
          {/* Products routes removed */}
          
          {/* Auth routes */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            } 
          />
          <Route 
            path="/register" 
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            } 
          />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/payment/service" 
            element={
              <ProtectedRoute>
                <ServicePaymentPage />
              </ProtectedRoute>
            } 
          />
          {/* Create product route removed */}
          <Route 
            path="/orders" 
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/cart" 
            element={
              <ProtectedRoute>
                <CartPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Forum routes */}
          <Route path="/forum" element={<ForumPage />} />
          <Route 
            path="/forum/new" 
            element={
              <ProtectedRoute>
                <CreateEditForumPost />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/forum/edit/:id" 
            element={
              <ProtectedRoute>
                <CreateEditForumPost />
              </ProtectedRoute>
            } 
          />
          <Route path="/forum/post/:id" element={<ForumPostDetail />} />
          
          {/* Ticket routes */}
          <Route 
            path="/tickets" 
            element={
              <ProtectedRoute>
                <TicketsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tickets/new" 
            element={
              <ProtectedRoute>
                <TicketSubmissionPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/support" 
            element={
              <ProtectedRoute>
                <TicketsPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default App;