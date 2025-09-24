import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Building, Star, CheckCircle, Edit, Save, X, Receipt, Calendar, DollarSign, Clock, Eye, Trash2, AlertTriangle } from 'lucide-react';

const ProfilePage = () => {
  const { user, logout, updateProfile, setUser } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [serviceBookings, setServiceBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Sri Lanka'
    },
    serviceProviderDetails: {
      businessName: '',
      serviceType: 'equipment_rental',
      serviceArea: [],
      description: ''
    }
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || 'Sri Lanka'
        },
        serviceProviderDetails: {
          businessName: user.serviceProviderDetails?.businessName || '',
          serviceType: user.serviceProviderDetails?.serviceType || 'equipment_rental',
          serviceArea: user.serviceProviderDetails?.serviceArea || [],
          description: user.serviceProviderDetails?.description || ''
        }
      });
      
      // Fetch service bookings for farmers
      if (user.role === 'farmer') {
        fetchServiceBookings();
      }
    }
  }, [user]);

  const fetchServiceBookings = async () => {
    if (!user?._id) return;
    
    setBookingsLoading(true);
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/payments/bookings/${user._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setServiceBookings(data.data.bookings);
      } else {
        console.error('Failed to fetch service bookings');
      }
    } catch (error) {
      console.error('Error fetching service bookings:', error);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = Cookies.get('token');
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        // Directly set user with returned updated user object
        if (data?.data?.user) {
          setUser(data.data.user);
        }
        setEditing(false);
        setSuccess('Profile updated successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');

  const handleDeleteAccount = async () => {
    setDeleteError('');
    setDeleteSuccess('');
    setDeleteLoading(true);
    try {
      console.log('Attempting to delete account...');
      const resp = await authService.deleteProfile();
      console.log('Delete response:', resp);
      
      if (resp && resp.success) {
        setDeleteSuccess('Account deleted successfully. Redirecting...');
        // Clear auth and redirect after short delay
        logout();
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        const errorMessage = resp?.message || 'Failed to delete account';
        console.error('Delete failed:', errorMessage);
        setDeleteError(errorMessage);
      }
    } catch (e) {
      console.error('Delete account error:', e);
      const errorMessage = e?.response?.data?.message || e?.message || 'Failed to delete account';
      setDeleteError(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to original user data
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: {
          street: user.address?.street || '',
          city: user.address?.city || '',
          state: user.address?.state || '',
          zipCode: user.address?.zipCode || '',
          country: user.address?.country || 'Sri Lanka'
        },
        serviceProviderDetails: {
          businessName: user.serviceProviderDetails?.businessName || '',
          serviceType: user.serviceProviderDetails?.serviceType || 'equipment_rental',
          serviceArea: user.serviceProviderDetails?.serviceArea || [],
          description: user.serviceProviderDetails?.description || ''
        }
      });
    }
    setEditing(false);
    setError('');
    setSuccess('');
  };

  const addServiceArea = () => {
    setFormData({
      ...formData,
      serviceProviderDetails: {
        ...formData.serviceProviderDetails,
        serviceArea: [...formData.serviceProviderDetails.serviceArea, '']
      }
    });
  };

  const updateServiceArea = (index, value) => {
    const newServiceArea = [...formData.serviceProviderDetails.serviceArea];
    newServiceArea[index] = value;
    setFormData({
      ...formData,
      serviceProviderDetails: {
        ...formData.serviceProviderDetails,
        serviceArea: newServiceArea
      }
    });
  };

  const removeServiceArea = (index) => {
    const newServiceArea = formData.serviceProviderDetails.serviceArea.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      serviceProviderDetails: {
        ...formData.serviceProviderDetails,
        serviceArea: newServiceArea
      }
    });
  };

  const formatBookingStatus = (status) => {
    const statusMap = {
      'pending_confirmation': 'Pending Confirmation',
      'confirmed': 'Confirmed',
      'in_progress': 'In Progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled',
      'refunded': 'Refunded'
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending_confirmation': 'bg-yellow-100 text-yellow-800',
      'confirmed': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'cancelled': 'bg-red-100 text-red-800',
      'refunded': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const downloadReceipt = (booking) => {
    // Generate a simple text receipt
    const receipt = `
AGRICULTURAL SERVICES - RECEIPT
==============================

Transaction ID: ${booking.payment.transactionId}
Booking Number: ${booking.bookingNumber}
Date: ${new Date(booking.payment.paidAt).toLocaleDateString()}

Service Details:
- Service: ${booking.serviceDetails.title}
- Type: ${booking.serviceDetails.serviceType.replace('_', ' ')}
- Date: ${new Date(booking.booking.date).toLocaleDateString()}
- Time: ${booking.booking.time}

Provider: ${booking.serviceProvider.firstName} ${booking.serviceProvider.lastName}
Customer: ${booking.customer.firstName} ${booking.customer.lastName}

Amount Paid: ${booking.pricing.currency} ${booking.pricing.finalAmount}
Payment Method: ${booking.payment.method.replace('_', ' ')}
Status: ${formatBookingStatus(booking.status)}

Thank you for using our services!
    `;

    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${booking.bookingNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user?.role === 'service_provider' ? 'Service Provider Profile' : 
                 user?.role === 'farmer' ? 'Farmer Profile' : 'Profile'}
              </h1>
              <p className="text-gray-600 mt-2">Manage your account information</p>
            </div>
            
            <div className="flex items-center gap-3">
            {!editing ? (
              <button
                onClick={() => setEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
            {user && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            )}
            </div>
          </div>

          {/* Tabs for farmers */}
          {user?.role === 'farmer' && (
            <div className="mt-6 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Profile Information
                </button>
                <button
                  onClick={() => setActiveTab('transactions')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'transactions'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Service Bookings & Receipts
                </button>
              </nav>
            </div>
          )}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}
        {deleteError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {deleteError}
          </div>
        )}
        {deleteSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {deleteSuccess}
          </div>
        )}

        <div className="space-y-6">
          {/* Show profile content for non-farmers or when profile tab is active */}
          {(user?.role !== 'farmer' || activeTab === 'profile') && (
            <>
              {/* Basic Information */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Basic Information
                </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{user?.firstName}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{user?.lastName}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-gray-400" />
                  <p className="text-gray-900">{user?.email}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                {editing ? (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ) : (
                  <div className="flex items-center py-2">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <p className="text-gray-900">{user?.phone || 'Not provided'}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Role: {user?.role?.replace('_', ' ') || 'N/A'}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                user?.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                Status: {user?.isActive ? 'Active' : 'Inactive'}
              </span>
              {user?.isVerified && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </span>
              )}
            </div>
          </div>

          {/* Address Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Address Information
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{user?.address?.street || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.address.city}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, city: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{user?.address?.city || 'Not provided'}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State/Province</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.address.state}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, state: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                ) : (
                  <p className="text-gray-900 py-2">{user?.address?.state || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Service Provider Details */}
          {user?.role === 'service_provider' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Service Provider Details
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                  {editing ? (
                    <input
                      type="text"
                      value={formData.serviceProviderDetails.businessName}
                      onChange={(e) => setFormData({
                        ...formData,
                        serviceProviderDetails: {
                          ...formData.serviceProviderDetails,
                          businessName: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 py-2">{user?.serviceProviderDetails?.businessName || 'Not provided'}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                  {editing ? (
                    <select
                      value={formData.serviceProviderDetails.serviceType}
                      onChange={(e) => setFormData({
                        ...formData,
                        serviceProviderDetails: {
                          ...formData.serviceProviderDetails,
                          serviceType: e.target.value
                        }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="equipment_rental">Equipment Rental</option>
                      <option value="transportation">Transportation</option>
                      <option value="processing">Processing</option>
                      <option value="consulting">Consulting</option>
                      <option value="other">Other</option>
                    </select>
                  ) : (
                    <p className="text-gray-900 py-2">
                      {user?.serviceProviderDetails?.serviceType?.replace('_', ' ')?.toUpperCase() || 'Not provided'}
                    </p>
                  )}
                </div>
                
                {/* Service Areas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service Areas</label>
                  {editing ? (
                    <div className="space-y-2">
                      {formData.serviceProviderDetails.serviceArea.map((area, index) => (
                        <div key={index} className="flex gap-2">
                          <input
                            type="text"
                            value={area}
                            onChange={(e) => updateServiceArea(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="e.g., Colombo, Gampaha"
                          />
                          {formData.serviceProviderDetails.serviceArea.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeServiceArea(index)}
                              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addServiceArea}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        + Add Service Area
                      </button>
                    </div>
                  ) : (
                    <div className="py-2">
                      {user?.serviceProviderDetails?.serviceArea?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.serviceProviderDetails.serviceArea.map((area, index) => (
                            <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {area}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-900">Not provided</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-2 text-yellow-400" />
                    <span className="text-sm text-gray-700">
                      Rating: {user?.serviceProviderDetails?.rating?.toFixed(1) || '0.0'} 
                      ({user?.serviceProviderDetails?.totalReviews || 0} reviews)
                    </span>
                  </div>
                  
                  {user?.serviceProviderDetails?.isVerifiedProvider && (
                    <div className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      <span className="text-sm text-green-700">Verified Provider</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Farm Details for Farmers */}
          {user?.role === 'farmer' && user?.farmDetails && activeTab === 'profile' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-4">Farm Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Farm Name</label>
                  <p className="text-gray-900">{user.farmDetails.farmName || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Farm Size</label>
                  <p className="text-gray-900">{user.farmDetails.farmSize ? `${user.farmDetails.farmSize} acres` : 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Farm Type</label>
                  <p className="text-gray-900">{user.farmDetails.farmType || 'Not specified'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crops</label>
                  <p className="text-gray-900">{user.farmDetails.crops?.join(', ') || 'Not specified'}</p>
                </div>
              </div>
            </div>
          )}
          </>
          )}

          {/* Service Bookings & Transactions Tab (Only for farmers) */}
          {user?.role === 'farmer' && activeTab === 'transactions' && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-semibold mb-6 flex items-center">
                <Receipt className="w-5 h-5 mr-2" />
                Service Bookings & Transaction History
              </h3>

              {bookingsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : serviceBookings.length > 0 ? (
                <div className="space-y-4">
                  {serviceBookings.map((booking) => (
                    <div key={booking._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">{booking.serviceDetails.title}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {booking.serviceDetails.serviceType.replace('_', ' ')} • Booking #{booking.bookingNumber}
                          </p>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {formatBookingStatus(booking.status)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Calendar className="w-4 h-4 mr-2" />
                          <span>{new Date(booking.booking.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Clock className="w-4 h-4 mr-2" />
                          <span>{booking.booking.time}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <DollarSign className="w-4 h-4 mr-2" />
                          <span>{booking.pricing.currency} {booking.pricing.finalAmount}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Provider:</span> {booking.serviceProvider.firstName} {booking.serviceProvider.lastName}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => downloadReceipt(booking)}
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                          >
                            <Receipt className="w-4 h-4 mr-1" />
                            Download Receipt
                          </button>
                          {booking.payment.transactionId && (
                            <span className="text-xs text-gray-500">
                              TXN: {booking.payment.transactionId}
                            </span>
                          )}
                        </div>
                      </div>

                      {booking.timeline && booking.timeline.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            Last updated: {new Date(booking.timeline[booking.timeline.length - 1].timestamp).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Service Bookings Yet</h4>
                  <p className="text-gray-600 mb-4">
                    You haven't made any service bookings yet. Browse our services to get started.
                  </p>
                  <a
                    href="/services"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                  >
                    Browse Services
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    {showDeleteConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 mr-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-1">Delete Account</h2>
              <p className="text-sm text-gray-600">This will permanently deactivate your account and you will lose access to all your data. This action cannot be undone. Are you sure you want to continue?</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              disabled={deleteLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
};

export default ProfilePage;