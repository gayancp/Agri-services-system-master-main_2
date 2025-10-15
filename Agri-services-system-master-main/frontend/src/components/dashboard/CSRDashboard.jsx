import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useAuth } from '../../context/AuthContext';

const CSRDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updateNotes, setUpdateNotes] = useState('');
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketComment, setTicketComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    fetchQueries();
    fetchAssignedTickets();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch('/api/customer-service/dashboard', {
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

  const fetchQueries = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch('/api/customer-service/queries?limit=20', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setQueries(data.data.queries);
      }
    } catch (error) {
      console.error('Error fetching queries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignedTickets = async () => {
    try {
      const token = Cookies.get('token');
      console.log('User object:', user); // Debug log
      console.log('User ID:', user?.id); // Debug log
      
      // Fetch all tickets assigned to this CSR (including resolved)
      const response = await fetch(`/api/tickets?assignedTo=${user?.id}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Tickets response:', data); // Debug log
        // Show all tickets assigned to this CSR (including resolved and closed)
        setTickets(data.data.tickets);
      } else {
        console.error('Failed to fetch tickets:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error fetching assigned tickets:', error);
    }
  };

  const fetchTicketDetails = async (ticketId) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/tickets/${ticketId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(data.data);
      } else {
        setError('Failed to fetch ticket details');
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      setError('Network error occurred');
    }
  };

  const updateTicketStatus = async (ticketId, status, notes = '') => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status, notes })
      });

      if (response.ok) {
        fetchAssignedTickets();
        setSelectedTicket(null);
      } else {
        setError('Failed to update ticket status');
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      setError('Network error occurred');
    }
  };

  const addTicketComment = async () => {
    if (!ticketComment.trim()) return;

    setIsAddingComment(true);
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/tickets/${selectedTicket._id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: ticketComment,
          isInternal: true 
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSelectedTicket(data.data);
        setTicketComment('');
        fetchAssignedTickets();
      } else {
        setError('Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setError('Network error occurred');
    } finally {
      setIsAddingComment(false);
    }
  };

  const getTicketStatusColor = (status) => {
    const colors = {
      'open': 'bg-blue-100 text-blue-800',
      'assigned': 'bg-purple-100 text-purple-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'waiting_customer': 'bg-orange-100 text-orange-800',
      'resolved': 'bg-green-100 text-green-800',
      'closed': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTicketPriorityColor = (priority) => {
    const colors = {
      'low': 'text-green-600',
      'medium': 'text-yellow-600',
      'high': 'text-orange-600',
      'urgent': 'text-red-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  const formatTicketDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/customer-service/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status, 
          notes: updateNotes 
        })
      });
      
      if (response.ok) {
        fetchQueries(); // Refresh queries list
        setSelectedOrder(null);
        setUpdateNotes('');
      } else {
        setError('Failed to update order status');
      }
    } catch (error) {
      setError('Network error occurred');
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

  const OrderManagementTable = () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Customer Orders</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-2 text-left">Order #</th>
              <th className="px-4 py-2 text-left">Customer</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Date</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queries.map((order) => (
              <tr key={order._id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">
                  #{order.orderNumber}
                </td>
                <td className="px-4 py-2">
                  <div>
                    <p className="font-medium">
                      {order.buyer?.firstName} {order.buyer?.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{order.buyer?.email}</p>
                  </div>
                </td>
                <td className="px-4 py-2">
                  LKR {order.totalAmount?.toLocaleString()}
                </td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {order.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {new Date(order.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const OrderUpdateModal = () => {
    if (!selectedOrder) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">
            Update Order #{selectedOrder.orderNumber}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Customer:</label>
              <p className="text-gray-700">
                {selectedOrder.buyer?.firstName} {selectedOrder.buyer?.lastName}
              </p>
              <p className="text-sm text-gray-500">{selectedOrder.buyer?.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Current Status:</label>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                selectedOrder.status === 'delivered' ? 'bg-green-100 text-green-800' :
                selectedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                selectedOrder.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {selectedOrder.status.toUpperCase()}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Update Status:</label>
              <select
                className="w-full p-2 border border-gray-300 rounded"
                onChange={(e) => {
                  if (e.target.value) {
                    updateOrderStatus(selectedOrder._id, e.target.value);
                  }
                }}
                defaultValue=""
              >
                <option value="">Select new status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Notes:</label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded"
                rows="3"
                value={updateNotes}
                onChange={(e) => setUpdateNotes(e.target.value)}
                placeholder="Add notes about this status update..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setSelectedOrder(null);
                setUpdateNotes('');
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  const TicketDetailModal = () => {
    if (!selectedTicket) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedTicket.title}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Ticket #{selectedTicket.ticketNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <div className="mt-1">
                  <p className="font-medium text-gray-900">
                    {selectedTicket.submittedBy?.firstName} {selectedTicket.submittedBy?.lastName}
                  </p>
                  <p className="text-sm text-gray-600">{selectedTicket.submittedBy?.email}</p>
                  {selectedTicket.submittedBy?.phone && (
                    <p className="text-sm text-gray-600">{selectedTicket.submittedBy?.phone}</p>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getTicketStatusColor(selectedTicket.status)}`}>
                  {selectedTicket.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <span className={`font-medium mt-1 block ${getTicketPriorityColor(selectedTicket.priority)}`}>
                  {selectedTicket.priority.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-900 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>
            </div>

            {/* Related Information */}
            {(selectedTicket.relatedOrder || selectedTicket.relatedService) && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Related Information</label>
                <div className="bg-blue-50 rounded-lg p-3">
                  {selectedTicket.relatedOrder && (
                    <p className="text-blue-900">
                      <span className="font-medium">Order:</span> #{selectedTicket.relatedOrder.orderNumber}
                    </p>
                  )}
                  {selectedTicket.relatedService && (
                    <p className="text-blue-900">
                      <span className="font-medium">Service:</span> {selectedTicket.relatedService.title}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Attachments */}
            {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>
                <div className="space-y-2">
                  {selectedTicket.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                      <svg className="h-5 w-5 text-gray-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm text-gray-700">{attachment.originalName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-4">Comments & Updates</label>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                  selectedTicket.comments.map((comment, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <span className="font-medium text-gray-900">
                            {comment.author.firstName} {comment.author.lastName}
                          </span>
                          {comment.author.role === 'customer_service' && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              Support Team
                            </span>
                          )}
                          {comment.isInternal && (
                            <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                              Internal
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {formatTicketDate(comment.timestamp)}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">{comment.message}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No comments yet</p>
                )}
              </div>
            </div>

            {/* Status Update Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <button
                onClick={() => updateTicketStatus(selectedTicket._id, 'in_progress')}
                className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
                disabled={selectedTicket.status === 'in_progress'}
              >
                Mark In Progress
              </button>
              <button
                onClick={() => updateTicketStatus(selectedTicket._id, 'waiting_customer')}
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                disabled={selectedTicket.status === 'waiting_customer'}
              >
                Waiting for Customer
              </button>
              <button
                onClick={() => updateTicketStatus(selectedTicket._id, 'resolved')}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                disabled={selectedTicket.status === 'resolved' || selectedTicket.status === 'closed'}
              >
                Mark Resolved
              </button>
            </div>

            {/* Add Internal Comment */}
            {selectedTicket.status !== 'closed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Add Internal Comment</label>
                <textarea
                  value={ticketComment}
                  onChange={(e) => setTicketComment(e.target.value)}
                  placeholder="Add an internal comment visible only to support team..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={addTicketComment}
                    disabled={isAddingComment || !ticketComment.trim()}
                    className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isAddingComment || !ticketComment.trim() ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isAddingComment ? 'Adding...' : 'Add Internal Comment'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Customer Service Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back, {user?.firstName}! Here's your customer service overview.</p>
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
              onClick={() => setActiveTab('tickets')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'tickets'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              All My Tickets
            </button>
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                title="Total Tickets"
                value={dashboardData.totalTickets}
                icon="🎫"
                bgColor="bg-blue-500"
              />
              
              <StatCard
                title="Resolved Cases"
                value={dashboardData.resolvedTickets}
                icon="✅"
                bgColor="bg-green-500"
              />
              <StatCard
                title="Active Customers"
                value={dashboardData.activeCustomers}
                icon="👥"
                bgColor="bg-purple-500"
              />
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Recent Customer Queries */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Customer Queries</h3>
                <div className="space-y-3">
                  {dashboardData.customerQueries?.map((customer) => (
                    <div key={customer._id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                        <p className="text-sm text-gray-600">{customer.email}</p>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && <OrderManagementTable />}

        {/* Tickets Tab */}
        {activeTab === 'tickets' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">All My Assigned Tickets</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left">Ticket #</th>
                    <th className="px-4 py-2 text-left">Customer</th>
                    <th className="px-4 py-2 text-left">Issue</th>
                    <th className="px-4 py-2 text-left">Priority</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Created</th>
                    <th className="px-4 py-2 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket._id} className="border-b hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium">
                        #{ticket.ticketNumber}
                      </td>
                      <td className="px-4 py-2">
                        <div>
                          <p className="font-medium">
                            {ticket.submittedBy?.firstName} {ticket.submittedBy?.lastName}
                          </p>
                          <p className="text-sm text-gray-600">{ticket.submittedBy?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div>
                          <p className="font-medium">{ticket.title}</p>
                          <p className="text-sm text-gray-600">
                            {ticket.issueType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`font-medium ${getTicketPriorityColor(ticket.priority)}`}>
                          {ticket.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTicketStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {formatTicketDate(ticket.createdAt)}
                      </td>
                     
                      <td className="px-4 py-2">

                        <button
                          onClick={() => fetchTicketDetails(ticket._id)}
                          className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600 mr-2"
                        >
                          View
                        </button>
                        
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {tickets.length === 0 && (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets assigned</h3>
                <p className="mt-1 text-sm text-gray-500">
                  You don't have any tickets assigned to you yet.
                </p>
              </div>
            )}
          </div>
        )}

        
        {/* Ticket Detail Modal */}
        <TicketDetailModal />
      </div>
    </div>
  );
};

export default CSRDashboard;