import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useAuth } from '../../context/AuthContext';
import AdminServiceListingsManager from './AdminServiceListingsManager';
import AdminTicketManager from '../admin/AdminTicketManager';

// Move EditUserModal outside the main component
const EditUserModal = ({ 
  showEditModal, 
  editingUser, 
  setEditingUser, 
  setShowEditModal, 
  handleUpdateUser, 
  updateLoading 
}) => {
  if (!showEditModal) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
            <button
              onClick={() => {
                setShowEditModal(false);
                setEditingUser(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <form onSubmit={(e) => {
            e.preventDefault();
            handleUpdateUser(editingUser);
          }}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={editingUser?.firstName || ''}
                  onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                <input
                  type="text"
                  value={editingUser?.lastName || ''}
                  onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={editingUser?.email || ''}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={editingUser?.role || ''}
                  onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                  required
                >
                  <option value="farmer">Farmer</option>
                  <option value="service_provider">Service Provider</option>
                  <option value="customer_service_rep">Customer Service Rep</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingUser?.isActive || false}
                    onChange={(e) => setEditingUser({...editingUser, isActive: e.target.checked})}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingUser?.isVerified || false}
                    onChange={(e) => setEditingUser({...editingUser, isVerified: e.target.checked})}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Verified</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={updateLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {updateLoading ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Move DeleteUserModal outside the main component
const DeleteUserModal = ({ 
  showDeleteModal, 
  userToDelete, 
  setShowDeleteModal, 
  setUserToDelete, 
  confirmDeleteUser, 
  updateLoading 
}) => {
  if (!showDeleteModal) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mt-4">Delete User</h3>
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500">
              Are you sure you want to delete {userToDelete?.firstName} {userToDelete?.lastName}? 
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-center space-x-3 mt-6">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setUserToDelete(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={confirmDeleteUser}
              disabled={updateLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
            >
              {updateLoading ? 'Deleting...' : 'Delete User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchUsers();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
      } else {
        setError('Failed to fetch dashboard data');
      }
    } catch (error) {
      setError('Network error occurred');
    }
  };

  const fetchUsers = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch('/api/admin/users?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.data.users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserStatus = async (userId, isActive) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive })
      });
      
      if (response.ok) {
        fetchUsers(); // Refresh user list
      } else {
        setError('Failed to update user status');
      }
    } catch (error) {
      setError('Network error occurred');
    }
  };

  const handleEditUser = (userToEdit) => {
    setEditingUser({ ...userToEdit });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (updatedUser) => {
    try {
      setUpdateLoading(true);
      const token = Cookies.get('token');
      const response = await fetch(`/api/admin/users/${updatedUser._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          role: updatedUser.role,
          isActive: updatedUser.isActive,
          isVerified: updatedUser.isVerified
        })
      });
      
      if (response.ok) {
        fetchUsers(); // Refresh user list
        setShowEditModal(false);
        setEditingUser(null);
        setError('');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to update user');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteUser = (userToDelete) => {
    setUserToDelete(userToDelete);
    setShowDeleteModal(true);
  };

  const confirmDeleteUser = async () => {
    try {
      setUpdateLoading(true);
      const token = Cookies.get('token');
      const response = await fetch(`/api/admin/users/${userToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        fetchUsers(); // Refresh user list
        setShowDeleteModal(false);
        setUserToDelete(null);
        setError('');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete user');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setUpdateLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, bgColor = "bg-blue-500" }) => (
    <div className={`${bgColor} text-white p-6 rounded-lg shadow-md`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white text-sm opacity-90">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className="text-3xl opacity-80">{icon}</div>
      </div>
    </div>
  );

  const UserManagementTable = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">User Management</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Role</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Joined</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">
                  {user.firstName} {user.lastName}
                </td>
                <td className="px-4 py-2">{user.email}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                    user.role === 'service_provider' ? 'bg-blue-100 text-blue-800' :
                    user.role === 'customer_service_rep' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role.replace('_', ' ').toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="px-3 py-1 rounded text-sm font-medium bg-blue-100 text-blue-800 hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    {/* <button
                      onClick={() => updateUserStatus(user._id, !user.isActive)}
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        user.isActive 
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                          : 'bg-green-100 text-green-800 hover:bg-green-200'
                      }`}
                    >
                      {user.isActive ? 'Deactivate' : 'Activate'}
                    </button> */}
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="px-3 py-1 rounded text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.firstName}! Here's what's happening in your system.</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              User Management
            </button>
            <button
              onClick={() => setActiveTab('serviceListings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'serviceListings'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Service Listings
            </button>
            {/* <button
              onClick={() => setActiveTab('tickets')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tickets'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Support Tickets
            </button> */}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Users"
                value={dashboardData.totalUsers}
                icon="👥"
                bgColor="bg-blue-500"
              />
              <StatCard
                title="Total Products"
                value={dashboardData.totalProducts}
                icon="📦"
                bgColor="bg-green-500"
              />
              <StatCard
                title="Total Orders"
                value={dashboardData.totalOrders}
                icon="🛒"
                bgColor="bg-yellow-500"
              />
              <StatCard
                title="Open Tickets"
                value={dashboardData.openTickets || 0}
                icon="🎫"
                bgColor="bg-red-500"
              />
            </div>

            {/* Secondary Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatCard
                title="Total Revenue"
                value={`LKR ${dashboardData.totalRevenue.toLocaleString()}`}
                icon="💰"
                bgColor="bg-purple-500"
              />
              <StatCard
                title="Active Service Providers"
                value={dashboardData.activeServiceProviders || 0}
                icon="🔧"
                bgColor="bg-indigo-500"
              />
              <StatCard
                title="Pending Approvals"
                value={dashboardData.pendingApprovals || 0}
                icon="⏳"
                bgColor="bg-orange-500"
              />
            </div>

            {/* User Roles Distribution */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Users by Role</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(dashboardData.usersByRole || {}).map(([role, count]) => (
                  <div key={role} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-sm text-gray-600 capitalize">{role.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ticket Assignment Quick Actions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Support Ticket Management</h3>
                <button
                  onClick={() => setActiveTab('tickets')}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Manage All Tickets
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{dashboardData.openTickets || 0}</p>
                  <p className="text-sm text-blue-600">Open Tickets</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{dashboardData.unassignedTickets?.length || 0}</p>
                  <p className="text-sm text-red-600">Unassigned</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-2xl font-bold text-yellow-600">{dashboardData.inProgressTickets || 0}</p>
                  <p className="text-sm text-yellow-600">In Progress</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{dashboardData.resolvedTickets || 0}</p>
                  <p className="text-sm text-green-600">Resolved Today</p>
                </div>
              </div>
              
              {dashboardData.unassignedTickets && dashboardData.unassignedTickets.length > 0 && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm font-medium text-red-800">
                      {dashboardData.unassignedTickets.length} ticket(s) need immediate attention - they are not assigned to any customer service representative.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Users */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Users</h3>
                <div className="space-y-3">
                  {dashboardData.recentUsers?.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Orders</h3>
                <div className="space-y-3">
                  {dashboardData.recentOrders?.map((order) => (
                    <div key={order._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">Order #{order.orderNumber}</p>
                        <p className="text-sm text-gray-600">
                          {order.buyer?.firstName} {order.buyer?.lastName}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">LKR {order.totalAmount}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unassigned Tickets */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Unassigned Tickets</h3>
                  <button
                    onClick={() => setActiveTab('tickets')}
                    className="text-green-600 hover:text-green-800 text-sm font-medium"
                  >
                    View All
                  </button>
                </div>
                <div className="space-y-3">
                  {dashboardData.unassignedTickets?.slice(0, 5).map((ticket) => (
                    <div key={ticket._id} className="p-3 bg-red-50 rounded border-l-4 border-red-400">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">#{ticket.ticketNumber}</p>
                          <p className="text-sm text-gray-600 truncate max-w-xs">{ticket.title}</p>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded font-medium ${
                            ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                            ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {ticket.priority.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          {new Date(ticket.createdAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => setActiveTab('tickets')}
                          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                        >
                          Assign
                        </button>
                      </div>
                    </div>
                  ))}
                  {(!dashboardData.unassignedTickets || dashboardData.unassignedTickets.length === 0) && (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500">No unassigned tickets</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && <UserManagementTable />}

        {/* Service Listings Tab */}
        {activeTab === 'serviceListings' && <AdminServiceListingsManager />}

        {/* Support Tickets Tab */}
        {activeTab === 'tickets' && <AdminTicketManager />}
      </div>

      {/* Render modals outside with props */}
      <EditUserModal
        showEditModal={showEditModal}
        editingUser={editingUser}
        setEditingUser={setEditingUser}
        setShowEditModal={setShowEditModal}
        handleUpdateUser={handleUpdateUser}
        updateLoading={updateLoading}
      />

      <DeleteUserModal
        showDeleteModal={showDeleteModal}
        userToDelete={userToDelete}
        setShowDeleteModal={setShowDeleteModal}
        setUserToDelete={setUserToDelete}
        confirmDeleteUser={confirmDeleteUser}
        updateLoading={updateLoading}
      />
    </div>
  );
};

export default AdminDashboard;