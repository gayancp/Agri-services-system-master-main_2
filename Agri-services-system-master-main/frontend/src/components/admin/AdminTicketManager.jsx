import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const AdminTicketManager = () => {
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assignedTo: ''
  });
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [assignmentData, setAssignmentData] = useState({
    assignedTo: '',
    notes: ''
  });
  const [ticketStats, setTicketStats] = useState(null);

  useEffect(() => {
    fetchTickets();
    fetchCustomerServiceReps();
    fetchTicketStats();
  }, [filters]);

  const fetchTickets = async () => {
    try {
      const token = Cookies.get('token');
      const queryParams = new URLSearchParams(filters).toString();
      const response = await fetch(`/api/tickets?${queryParams}&limit=50`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTickets(data.data.tickets);
      } else {
        setError('Failed to fetch tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerServiceReps = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch('/api/admin/users?role=customer_service_rep', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Customer service reps response:', data); // Debug log
        setCustomers(data.data.users || []);
      } else {
        console.error('Failed to fetch customer service reps:', response.status);
        setError('Failed to fetch customer service representatives');
      }
    } catch (error) {
      console.error('Error fetching customer service reps:', error);
      setError('Network error while fetching customer service representatives');
    }
  };

  const fetchTicketStats = async () => {
    try {
      const token = Cookies.get('token');
      const response = await fetch('/api/tickets/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTicketStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
    }
  };

  const assignTicket = async () => {
    if (!assignmentData.assignedTo) {
      setError('Please select a customer service representative');
      return;
    }

    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/tickets/${selectedTicket._id}/assign`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ assignedTo: assignmentData.assignedTo })
      });

      if (response.ok) {
        setSelectedTicket(null);
        setAssignmentData({ assignedTo: '', notes: '' });
        fetchTickets();
        fetchTicketStats();
        setError('');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to assign ticket');
      }
    } catch (error) {
      console.error('Error assigning ticket:', error);
      setError('Network error occurred');
    }
  };

  const updateTicketStatus = async (ticketId, status) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchTickets();
        fetchTicketStats();
      } else {
        setError('Failed to update ticket status');
      }
    } catch (error) {
      console.error('Error updating ticket status:', error);
      setError('Network error occurred');
    }
  };

  const getStatusColor = (status) => {
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

  const getPriorityColor = (priority) => {
    const colors = {
      'low': 'text-green-600',
      'medium': 'text-yellow-600',
      'high': 'text-orange-600',
      'urgent': 'text-red-600'
    };
    return colors[priority] || 'text-gray-600';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const StatCard = ({ title, value, color }) => (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 rounded-md ${color} flex items-center justify-center`}>
            <span className="text-white font-bold">{value}</span>
          </div>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  const AssignmentModal = () => {
    if (!selectedTicket) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="text-lg font-semibold mb-4">
            Assign Ticket #{selectedTicket.ticketNumber}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Customer:</label>
              <p className="text-gray-700">
                {selectedTicket.submittedBy?.firstName} {selectedTicket.submittedBy?.lastName}
              </p>
              <p className="text-sm text-gray-500">{selectedTicket.submittedBy?.email}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Issue:</label>
              <p className="text-gray-700">{selectedTicket.title}</p>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${getPriorityColor(selectedTicket.priority)}`}>
                {selectedTicket.priority.toUpperCase()} Priority
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Assign to:</label>
              <select
                value={assignmentData.assignedTo}
                onChange={(e) => setAssignmentData(prev => ({ ...prev, assignedTo: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded"
                required
              >
                <option value="">Select Customer Service Rep</option>
                {customers.map((rep) => (
                  <option key={rep._id} value={rep._id}>
                    {rep.firstName} {rep.lastName} ({rep.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Assignment Notes (Optional):</label>
              <textarea
                value={assignmentData.notes}
                onChange={(e) => setAssignmentData(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded"
                rows="3"
                placeholder="Add any specific instructions or context for the assigned representative..."
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setSelectedTicket(null);
                setAssignmentData({ assignedTo: '', notes: '' });
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={assignTicket}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Assign Ticket
            </button>
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Ticket Management</h2>
        <p className="text-gray-600 mt-1">Manage and assign customer support tickets</p>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Statistics */}
      {ticketStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Tickets"
            value={ticketStats.total}
            color="bg-blue-500"
          />
          <StatCard
            title="Open Tickets"
            value={ticketStats.open + ticketStats.assigned}
            color="bg-yellow-500"
          />
          <StatCard
            title="In Progress"
            value={ticketStats.in_progress}
            color="bg-orange-500"
          />
          <StatCard
            title="Resolved"
            value={ticketStats.resolved}
            color="bg-green-500"
          />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Filter Tickets</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting_customer">Waiting for Customer</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <select
              value={filters.assignedTo}
              onChange={(e) => setFilters(prev => ({ ...prev, assignedTo: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-md"
            >
              <option value="">All Representatives</option>
              <option value="unassigned">Unassigned</option>
              {customers.map((rep) => (
                <option key={rep._id} value={rep._id}>
                  {rep.firstName} {rep.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Issue Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tickets.map((ticket) => (
                <tr key={ticket._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                        {ticket.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        #{ticket.ticketNumber}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {ticket.submittedBy?.firstName} {ticket.submittedBy?.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {ticket.submittedBy?.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {ticket.issueType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <select
                      value={ticket.status}
                      onChange={(e) => updateTicketStatus(ticket._id, e.target.value)}
                      className={`text-xs font-semibold rounded-full px-2 py-1 border-0 ${getStatusColor(ticket.status)}`}
                    >
                      <option value="open">OPEN</option>
                      <option value="assigned">ASSIGNED</option>
                      <option value="in_progress">IN PROGRESS</option>
                      <option value="waiting_customer">WAITING CUSTOMER</option>
                      <option value="resolved">RESOLVED</option>
                      <option value="closed">CLOSED</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {ticket.assignedTo ? (
                      <div>
                        <div className="font-medium">
                          {ticket.assignedTo.firstName} {ticket.assignedTo.lastName}
                        </div>
                        <div className="text-gray-500">
                          {ticket.assignedTo.email}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatDate(ticket.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      {!ticket.assignedTo && (
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                        >
                          Assign
                        </button>
                      )}
                      {ticket.assignedTo && ticket.status !== 'closed' && (
                        <button
                          onClick={() => setSelectedTicket(ticket)}
                          className="text-green-600 hover:text-green-900 text-sm font-medium"
                        >
                          Reassign
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {tickets.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tickets found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No tickets match the current filters.
            </p>
          </div>
        )}
      </div>

      {/* Assignment Modal */}
      <AssignmentModal />
    </div>
  );
};

    // Still Not Working

export default AdminTicketManager;