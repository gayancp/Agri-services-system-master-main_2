import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { Eye, CheckCircle, XCircle, Clock, User, Phone, Mail, MapPin, DollarSign, Tag, Calendar, AlertCircle } from 'lucide-react';

const AdminServiceListingsManager = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedListing, setSelectedListing] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('pending_approval');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Review form state
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchListings();
  }, [currentPage, statusFilter, serviceTypeFilter, searchQuery]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        status: statusFilter
      });
      
      if (serviceTypeFilter !== 'all') {
        params.append('serviceType', serviceTypeFilter);
      }
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/admin/service-listings?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setListings(data.data.listings);
        setTotalPages(data.data.pagination.pages);
      } else {
        setError('Failed to fetch service listings');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (listing) => {
    setSelectedListing(listing);
    setReviewStatus('approved');
    setAdminNotes('');
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedListing) return;

    setSubmitting(true);
    setError('');

    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/admin/service-listings/${selectedListing._id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: reviewStatus,
          adminNotes
        })
      });

      if (response.ok) {
        await fetchListings();
        setShowReviewModal(false);
        setSelectedListing(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update listing status');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { icon: Clock, color: 'bg-gray-100 text-gray-800', text: 'Draft' },
      pending_approval: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', text: 'Pending Review' },
      approved: { icon: CheckCircle, color: 'bg-green-100 text-green-800', text: 'Approved' },
      rejected: { icon: XCircle, color: 'bg-red-100 text-red-800', text: 'Rejected' },
      suspended: { icon: AlertCircle, color: 'bg-orange-100 text-orange-800', text: 'Suspended' }
    };

    const badge = badges[status] || badges.draft;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.text}
      </span>
    );
  };

  const formatServiceType = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading && listings.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Service Listings Management</h2>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending_approval">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="suspended">Suspended</option>
            <option value="draft">Draft</option>
          </select>
          <select
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="equipment_rental">Equipment Rental</option>
            <option value="transportation">Transportation</option>
            <option value="processing">Processing</option>
            <option value="consulting">Consulting</option>
            <option value="harvesting">Harvesting</option>
            <option value="planting">Planting</option>
            <option value="pest_control">Pest Control</option>
            <option value="irrigation">Irrigation</option>
            <option value="soil_testing">Soil Testing</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div> 

      {/* Listings Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
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
              {listings.map((listing) => (
                <tr key={listing._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12">
                        {listing.primaryPhoto ? (
                          <img
                            className="h-12 w-12 rounded-lg object-cover"
                            src={`http://localhost:5001${listing.primaryPhoto.url}`}
                            alt={listing.title}
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                            <Tag className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{listing.title}</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {listing.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        {listing.serviceProvider.profileImage ? (
                          <img
                            className="h-8 w-8 rounded-full"
                            src={listing.serviceProvider.profileImage}
                            alt=""
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <User className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">
                          {listing.serviceProvider.firstName} {listing.serviceProvider.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{listing.serviceProvider.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatServiceType(listing.serviceType)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {listing.formattedPrice}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(listing.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(listing.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleReview(listing)}
                      className="text-blue-600 hover:text-blue-900 flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {listings.length === 0 && !loading && (
        <div className="text-center py-12">
          <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No service listings found</h3>
          <p className="text-gray-500">Try adjusting your filters to see more results.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-2 rounded-lg ${
                currentPage === page
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">Review Service Listing</h3>
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedListing(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              </div>

              {/* Listing Details */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Service Information</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <p><span className="font-medium">Title:</span> {selectedListing.title}</p>
                      <p><span className="font-medium">Type:</span> {formatServiceType(selectedListing.serviceType)}</p>
                      <p><span className="font-medium">Pricing:</span> {selectedListing.formattedPrice}</p>
                      <p><span className="font-medium">Status:</span> {getStatusBadge(selectedListing.status)}</p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Service Provider</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        <span>{selectedListing.serviceProvider.firstName} {selectedListing.serviceProvider.lastName}</span>
                      </div>
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2" />
                        <span>{selectedListing.serviceProvider.email}</span>
                      </div>
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2" />
                        <span>{selectedListing.contactInfo.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Service Areas</h4>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start">
                        <MapPin className="w-4 h-4 mr-2 mt-1" />
                        <div className="flex flex-wrap gap-1">
                          {selectedListing.serviceArea.map((area, index) => (
                            <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Listing Stats</h4>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <p><span className="font-medium">Views:</span> {selectedListing.views}</p>
                      <p><span className="font-medium">Bookings:</span> {selectedListing.bookingsCount}</p>
                      <p><span className="font-medium">Rating:</span> {selectedListing.rating.average.toFixed(1)} ({selectedListing.rating.totalReviews} reviews)</p>
                      <p><span className="font-medium">Created:</span> {new Date(selectedListing.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-gray-700">{selectedListing.description}</p>
                </div>
              </div>

              {/* Photos */}
              {selectedListing.photos && selectedListing.photos.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Photos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {selectedListing.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={`http://localhost:5001${photo.url}`}
                        alt={`Service photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Review Form */}
              <div className="border-t pt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Review Decision</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Decision *
                    </label>
                    <select
                      value={reviewStatus}
                      onChange={(e) => setReviewStatus(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="approved">Approve</option>
                      <option value="rejected">Reject</option>
                      <option value="suspended">Suspend</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Notes
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="3"
                      placeholder="Add notes about your decision (optional)"
                      maxLength="500"
                    />
                  </div>

                  <div className="flex justify-end space-x-4">
                    <button
                      onClick={() => {
                        setShowReviewModal(false);
                        setSelectedListing(null);
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={submitReview}
                      disabled={submitting}
                      className={`px-4 py-2 text-white rounded-lg transition-colors ${
                        reviewStatus === 'approved' ? 'bg-green-600 hover:bg-green-700' :
                        reviewStatus === 'rejected' ? 'bg-red-600 hover:bg-red-700' :
                        'bg-orange-600 hover:bg-orange-700'
                      } disabled:opacity-50`}
                    >
                      {submitting ? 'Submitting...' : `${reviewStatus.charAt(0).toUpperCase() + reviewStatus.slice(1)} Listing`}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServiceListingsManager;