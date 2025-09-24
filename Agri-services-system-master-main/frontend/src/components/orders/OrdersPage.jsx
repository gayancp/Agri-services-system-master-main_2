import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Cookies from 'js-cookie';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  CreditCard,
  Download,
  XCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
  Filter,
  RefreshCw,
  Edit,
  Trash2
} from 'lucide-react';

const OrdersPage = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(''); // 'cancel', 'update', 'delete'
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [updateData, setUpdateData] = useState({
    date: '',
    time: '',
    notes: ''
  });

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user, statusFilter]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');
      
      const url = statusFilter === 'all' 
        ? `http://localhost:5001/api/payments/bookings/${user._id}`
        : `http://localhost:5001/api/payments/bookings/${user._id}?status=${statusFilter}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${Cookies.get('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBookings(data.data.bookings);
      } else {
        setError('Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setError('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending_confirmation: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: AlertCircle },
      confirmed: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
      in_progress: { bg: 'bg-purple-100', text: 'text-purple-800', icon: Clock },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
      refunded: { bg: 'bg-gray-100', text: 'text-gray-800', icon: RefreshCw }
    };

    const config = statusConfig[status] || statusConfig.pending_confirmation;
    const IconComponent = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        <IconComponent className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const downloadReceipt = (booking) => {
    const receiptContent = `
AGRICULTURAL SERVICES RECEIPT
============================

Transaction ID: ${booking.payment.transactionId}
Booking Number: ${booking.bookingNumber}
Date: ${new Date(booking.payment.paidAt).toLocaleDateString()}

Service Details:
- Service: ${booking.serviceDetails.title}
- Type: ${booking.serviceDetails.serviceType}
- Date: ${new Date(booking.booking.date).toLocaleDateString()}
- Time: ${booking.booking.time}

Provider:
- Name: ${booking.serviceProvider.firstName} ${booking.serviceProvider.lastName}
- Email: ${booking.serviceProvider.email}
- Phone: ${booking.serviceProvider.phone}

Customer:
- Name: ${booking.customer.firstName} ${booking.customer.lastName}
- Email: ${booking.customer.email}

Payment:
- Amount: ${booking.pricing.currency} ${booking.pricing.finalAmount}
- Method: ${booking.payment.method.toUpperCase()}
- Status: ${booking.payment.status.toUpperCase()}

Status: ${booking.status.toUpperCase()}

Thank you for using our Agricultural Services platform!
    `;

    const blob = new Blob([receiptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${booking.bookingNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking) return;
    // Require reason from customer; provider/admin may proceed without one
    if (!cancelReason.trim() && !(isAdmin || isUserProvider(selectedBooking))) return;

    try {
      setCancelling(true);
      const response = await fetch(`http://localhost:5001/api/payments/booking/${selectedBooking._id}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('token')}`
        },
        body: JSON.stringify({ reason: cancelReason })
      });

      if (response.ok) {
        await fetchBookings(); // Refresh bookings
        setShowModal(false);
        setSelectedBooking(null);
        setCancelReason('');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      setError('Failed to cancel booking');
    } finally {
      setCancelling(false);
    }
  };

  const handleUpdateBooking = async () => {
    if (!selectedBooking) return;

    try {
      setUpdating(true);
      const updatePayload = {};
      
      if (updateData.date) updatePayload.bookingDate = updateData.date;
      if (updateData.time) updatePayload.bookingTime = updateData.time;
      if (updateData.notes !== undefined) updatePayload.notes = updateData.notes;

      const response = await fetch(`http://localhost:5001/api/payments/booking/${selectedBooking._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('token')}`
        },
        body: JSON.stringify(updatePayload)
      });

      if (response.ok) {
        await fetchBookings(); // Refresh bookings
        setShowModal(false);
        setSelectedBooking(null);
        setUpdateData({ date: '', time: '', notes: '' });
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update booking');
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      setError('Failed to update booking');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteBooking = async () => {
    if (!selectedBooking) return;

    try {
      setDeleting(true);
      const response = await fetch(`http://localhost:5001/api/payments/booking/${selectedBooking._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${Cookies.get('token')}`
        }
      });

      if (response.ok) {
        await fetchBookings(); // Refresh bookings
        setShowModal(false);
        setSelectedBooking(null);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete booking');
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      setError('Failed to delete booking');
    } finally {
      setDeleting(false);
    }
  };

  const isUserCustomer = (booking) => booking.customer._id === user._id;
  const isUserProvider = (booking) => booking.serviceProvider._id === user._id;
  const isAdmin = user?.role === 'admin';

  const canCancelBooking = (booking) => {
    if (['cancelled', 'completed', 'refunded'].includes(booking.status)) return false;
    const bookingDateTime = new Date(booking.booking.date);
    const [hours, minutes] = booking.booking.time.split(':');
    bookingDateTime.setHours(parseInt(hours), parseInt(minutes));
    const hoursUntilBooking = (bookingDateTime - new Date()) / (1000 * 60 * 60);
    return hoursUntilBooking >= 24 || isAdmin; // admin override
  };

  const canUpdateBooking = (booking) => {
    if (['completed', 'cancelled', 'refunded'].includes(booking.status)) return false;
    const bookingDateTime = new Date(booking.booking.date);
    const [hours, minutes] = booking.booking.time.split(':');
    bookingDateTime.setHours(parseInt(hours), parseInt(minutes));
    const hoursUntilBooking = (bookingDateTime - new Date()) / (1000 * 60 * 60);
    return hoursUntilBooking >= 24 || isUserProvider(booking) || isAdmin;
  };

  const canDeleteBooking = (booking) => ['cancelled', 'completed', 'refunded'].includes(booking.status) && (isUserCustomer(booking) || isAdmin);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">My Bookings</h1>
        <button
          onClick={fetchBookings}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      {/* <div className="mb-6">
        <div className="flex items-center space-x-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Bookings</option>
            <option value="pending_confirmation">Pending Confirmation</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div> */}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">No bookings found</h3>
          <p className="text-gray-500">
            {statusFilter === 'all' 
              ? "You haven't made any service bookings yet." 
              : `No bookings with status "${statusFilter.replace('_', ' ')}" found.`
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {bookings.map((booking) => (
            <div key={booking._id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-1">
                      {booking.serviceDetails.title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Booking #{booking.bookingNumber}
                    </p>
                  </div>
                  <div className="text-right">
                    {getStatusBadge(booking.status)}
                    <p className="text-lg font-bold text-gray-800 mt-1">
                      {booking.pricing.currency} {booking.pricing.finalAmount}
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>{new Date(booking.booking.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      <span>{booking.booking.time}</span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <CreditCard className="w-4 h-4 mr-2" />
                      <span>{booking.payment.method.replace('_', ' ').toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center text-gray-600">
                      <User className="w-4 h-4 mr-2" />
                      <span>
                        {isUserCustomer(booking) 
                          ? `Provider: ${booking.serviceProvider.firstName} ${booking.serviceProvider.lastName}`
                          : `Customer: ${booking.customer.firstName} ${booking.customer.lastName}`
                        }
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Mail className="w-4 h-4 mr-2" />
                      <span>
                        {isUserCustomer(booking) 
                          ? booking.serviceProvider.email
                          : booking.customer.email
                        }
                      </span>
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>
                        {isUserCustomer(booking) 
                          ? booking.serviceProvider.phone || 'Not provided'
                          : booking.customer.phone || 'Not provided'
                        }
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-500">
                    Transaction ID: {booking.payment.transactionId}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => downloadReceipt(booking)}
                      className="flex items-center px-3 py-1 text-blue-600 border border-blue-600 rounded hover:bg-blue-50"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Receipt
                    </button>
                    
                    {( (isUserCustomer(booking) || isUserProvider(booking) || isAdmin) && canUpdateBooking(booking)) && (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setModalType('update');
                          setUpdateData({
                            date: new Date(booking.booking.date).toISOString().split('T')[0],
                            time: booking.booking.time,
                            notes: booking.notes?.customer || ''
                          });
                          setShowModal(true);
                        }}
                        className="flex items-center px-3 py-1 text-green-600 border border-green-600 rounded hover:bg-green-50"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Update
                      </button>
                    )}
                    
                    {( (isUserCustomer(booking) || isUserProvider(booking) || isAdmin) && canCancelBooking(booking)) && (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setModalType('cancel');
                          setShowModal(true);
                        }}
                        className="flex items-center px-3 py-1 text-red-600 border border-red-600 rounded hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancel
                      </button>
                    )}

                    {canDeleteBooking(booking) && (
                      <button
                        onClick={() => {
                          setSelectedBooking(booking);
                          setModalType('delete');
                          setShowModal(true);
                        }}
                        className="flex items-center px-3 py-1 text-gray-600 border border-gray-600 rounded hover:bg-gray-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Cancel, Update, or Delete */}
      {showModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            {modalType === 'cancel' && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Cancel Booking
                </h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to cancel this booking for "{selectedBooking.serviceDetails.title}"?
                </p>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Please provide a reason for cancellation..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  required
                />
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedBooking(null);
                      setCancelReason('');
                      setModalType('');
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                    disabled={cancelling}
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleCancelBooking}
                    disabled={cancelling || !cancelReason.trim()}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cancelling...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Booking
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {modalType === 'update' && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Update Booking
                </h3>
                <p className="text-gray-600 mb-4">
                  Update your booking details for "{selectedBooking.serviceDetails.title}"
                </p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Booking Date
                    </label>
                    <input
                      type="date"
                      value={updateData.date}
                      onChange={(e) => setUpdateData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      disabled={isUserProvider(selectedBooking) && !isAdmin && !isUserCustomer(selectedBooking)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Booking Time
                    </label>
                    <input
                      type="time"
                      value={updateData.time}
                      onChange={(e) => setUpdateData(prev => ({ ...prev, time: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      disabled={isUserProvider(selectedBooking) && !isAdmin && !isUserCustomer(selectedBooking)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={updateData.notes}
                      onChange={(e) => setUpdateData(prev => ({ ...prev, notes: e.target.value }))}
                      placeholder="Add any special instructions or notes..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="3"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedBooking(null);
                      setUpdateData({ date: '', time: '', notes: '' });
                      setModalType('');
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                    disabled={updating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateBooking}
                    disabled={updating}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Edit className="w-4 h-4 mr-2" />
                        Update Booking
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {modalType === 'delete' && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Delete Booking
                </h3>
                <p className="text-gray-600 mb-4">
                  Are you sure you want to permanently delete this booking for "{selectedBooking.serviceDetails.title}"? This action cannot be undone.
                </p>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <p className="text-yellow-800 text-sm">
                    <strong>Warning:</strong> This will permanently remove the booking from your records.
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedBooking(null);
                      setModalType('');
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                    disabled={deleting}
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleDeleteBooking}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Booking
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersPage;