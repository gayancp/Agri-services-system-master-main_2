import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, CheckCircle, Clock, XCircle, AlertCircle, Upload, X } from 'lucide-react';
import Cookies from 'js-cookie';

const BACKEND_ORIGIN = import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:5001';

const buildUploadUrl = (val) => {
  if (!val) return null;
  let url = typeof val === 'string' ? val : (val.url || val.path || '');
  if (!url) return null;
  // Normalize leading slashes
  url = url.replace(/^\/+/, '/');
  // Common relative cases
  if (url.startsWith('/uploads')) return `${BACKEND_ORIGIN}${url}`;
  if (url.startsWith('uploads')) return `${BACKEND_ORIGIN}/${url}`;
  if (/^https?:\/\//i.test(url)) return url;
  // Fallback: assume backend origin
  return `${BACKEND_ORIGIN}/${url.replace(/^\/+/, '')}`;
};

const ServiceListingsManager = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingListing, setEditingListing] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    serviceType: 'equipment_rental',
    pricing: {
      type: 'fixed',
      amount: '',
      currency: 'LKR',
      description: ''
    },
    serviceArea: [''],
    contactInfo: {
      phone: '',
      email: '',
      whatsapp: '',
      preferredContactMethod: 'phone'
    },
    availability: {
      status: 'available',
      schedule: {
        monday: { available: true, hours: '8:00 AM - 6:00 PM' },
        tuesday: { available: true, hours: '8:00 AM - 6:00 PM' },
        wednesday: { available: true, hours: '8:00 AM - 6:00 PM' },
        thursday: { available: true, hours: '8:00 AM - 6:00 PM' },
        friday: { available: true, hours: '8:00 AM - 6:00 PM' },
        saturday: { available: true, hours: '8:00 AM - 6:00 PM' },
        sunday: { available: false, hours: '' }
      }
    },
    requirements: {
      minimumBookingDuration: { value: 1, unit: 'hours' },
      advanceBookingRequired: { value: 24, unit: 'hours' },
      specialRequirements: []
    },
    tags: []
  });
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchListings();
  }, [currentPage, statusFilter, searchQuery]);

  const fetchListings = async () => {
    try {
      setLoading(true);
      const token = Cookies.get('token');
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        status: statusFilter
      });
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/service-listings?${params}`, {
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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file types and sizes
    const validFiles = files.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type);
      const isValidSize = file.size <= 5 * 1024 * 1024; // 5MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setError('Some files were rejected. Only JPEG, PNG, and WebP images under 5MB are allowed.');
    }

    setSelectedFiles(prev => [...prev, ...validFiles].slice(0, 10)); // Max 10 files
    
    // Create preview URLs
    validFiles.forEach(file => {
      const url = URL.createObjectURL(file);
      setPreviewUrls(prev => [...prev, url]);
    });
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Client-side validation to prevent common 400s
    const errors = [];
    if (!formData.title || formData.title.trim().length < 5) {
      errors.push('Title must be at least 5 characters.');
    }
    if (!formData.description || formData.description.trim().length < 20) {
      errors.push('Description must be at least 20 characters.');
    }
    const areas = Array.isArray(formData.serviceArea) ? formData.serviceArea.filter(a => a && a.trim().length > 0) : [];
    if (areas.length === 0) {
      errors.push('Please add at least one service area.');
    }
    if (!formData.contactInfo?.phone || !/^[0-9+()\-\s]{7,20}$/.test(formData.contactInfo.phone)) {
      errors.push('Please provide a valid phone number.');
    }
    // Require at least one image for new listing
    if (!editingListing && selectedFiles.length === 0) {
      errors.push('Please upload at least one image.');
    }
    // Pricing validation (allow empty amount when negotiable)
    if (formData.pricing?.type && formData.pricing.type !== 'negotiable') {
      const amt = formData.pricing.amount;
      if (amt === '' || isNaN(Number(amt)) || Number(amt) < 0) {
        errors.push('Please enter a valid pricing amount.');
      }
    }

    if (errors.length > 0) {
      setSubmitting(false);
      setError(errors.join(' '));
      return;
    }

    try {
      const token = Cookies.get('token');
      const formDataToSend = new FormData();

      // Add form data
      const normalized = { ...formData, serviceArea: areas };
      Object.keys(normalized).forEach(key => {
        if (typeof normalized[key] === 'object') {
          formDataToSend.append(key, JSON.stringify(normalized[key]));
        } else {
          formDataToSend.append(key, normalized[key]);
        }
      });

      // Add files
      selectedFiles.forEach(file => {
        formDataToSend.append('images', file);
      });

      const url = editingListing 
        ? `/api/service-listings/${editingListing._id}`
        : '/api/service-listings';
      
      const method = editingListing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (response.ok) {
        await fetchListings();
        resetForm();
        setShowCreateForm(false);
        setEditingListing(null);
      } else {
        let msg = 'Failed to save listing';
        try {
          const errorData = await response.json();
          if (errorData?.details && Array.isArray(errorData.details)) {
            msg = errorData.details.map(d => d.msg || d.message).join(' ');
          } else if (errorData?.error) {
            msg = errorData.error;
          }
        } catch {}
        setError(msg);
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      serviceType: 'equipment_rental',
      pricing: {
        type: 'fixed',
        amount: '',
        currency: 'LKR',
        description: ''
      },
      serviceArea: [''],
      contactInfo: {
        phone: '',
        email: '',
        whatsapp: '',
        preferredContactMethod: 'phone'
      },
      availability: {
        status: 'available',
        schedule: {
          monday: { available: true, hours: '8:00 AM - 6:00 PM' },
          tuesday: { available: true, hours: '8:00 AM - 6:00 PM' },
          wednesday: { available: true, hours: '8:00 AM - 6:00 PM' },
          thursday: { available: true, hours: '8:00 AM - 6:00 PM' },
          friday: { available: true, hours: '8:00 AM - 6:00 PM' },
          saturday: { available: true, hours: '8:00 AM - 6:00 PM' },
          sunday: { available: false, hours: '' }
        }
      },
      requirements: {
        minimumBookingDuration: { value: 1, unit: 'hours' },
        advanceBookingRequired: { value: 24, unit: 'hours' },
        specialRequirements: []
      },
      tags: []
    });
    setSelectedFiles([]);
    setPreviewUrls([]);
  };

  const handleEdit = (listing) => {
    setEditingListing(listing);
    setFormData({
      title: listing.title,
      description: listing.description,
      serviceType: listing.serviceType,
      pricing: listing.pricing,
      serviceArea: listing.serviceArea,
      contactInfo: listing.contactInfo,
      availability: listing.availability,
      requirements: listing.requirements || {
        minimumBookingDuration: { value: 1, unit: 'hours' },
        advanceBookingRequired: { value: 24, unit: 'hours' },
        specialRequirements: []
      },
      tags: listing.tags || []
    });
    setShowCreateForm(true);
  };

  const handleDelete = async (listingId) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;

    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/service-listings/${listingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await fetchListings();
      } else {
        setError('Failed to delete listing');
      }
    } catch (error) {
      setError('Network error occurred');
    }
  };

  const toggleStatus = async (listingId, currentStatus) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/service-listings/${listingId}/toggle-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (response.ok) {
        await fetchListings();
      } else {
        setError('Failed to update listing status');
      }
    } catch (error) {
      setError('Network error occurred');
    }
  };

  const submitForApproval = async (listingId) => {
    try {
      const token = Cookies.get('token');
      const response = await fetch(`/api/service-listings/${listingId}/submit-for-approval`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchListings();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit for approval');
      }
    } catch (error) {
      setError('Network error occurred');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      draft: { icon: Edit2, color: 'bg-gray-100 text-gray-800', text: 'Draft' },
      pending_approval: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
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

  // Derived validation state for enabling submit button
  const isFormValid = () => {
    const titleOk = formData.title && formData.title.trim().length >= 5;
    const descOk = formData.description && formData.description.trim().length >= 20;
    const areas = Array.isArray(formData.serviceArea) ? formData.serviceArea.filter(a => a && a.trim().length > 0) : [];
    const areaOk = areas.length > 0;
    const phoneOk = formData.contactInfo?.phone && /^[0-9+()\-\s]{7,20}$/.test(formData.contactInfo.phone);
    const priceOk = formData.pricing?.type === 'negotiable' || (formData.pricing && formData.pricing.amount !== '' && !isNaN(Number(formData.pricing.amount)) && Number(formData.pricing.amount) >= 0);
    const imagesOk = !!editingListing || selectedFiles.length > 0; // require image only on create
    return titleOk && descOk && areaOk && phoneOk && priceOk && imagesOk;
  };

  if (loading && listings.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Service Listings</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Listing</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Listings Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <div key={listing._id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Image */}
            <div className="h-48 bg-gray-200 relative">
              {(() => {
                const src = buildUploadUrl(listing.primaryPhoto || (listing.photos && listing.photos[0]));
                return src ? (
                  <img
                    src={src}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <Upload className="w-12 h-12" />
                  </div>
                );
              })()}
              <div className="absolute top-2 right-2">
                {getStatusBadge(listing.status)}
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{listing.title}</h3>
              <p className="text-gray-600 text-sm mb-3 line-clamp-2">{listing.description}</p>
              
              <div className="flex justify-between items-center mb-3">
                <span className="text-lg font-bold text-green-600">{listing.formattedPrice}</span>
                <span className={`text-sm ${listing.isActive ? 'text-green-600' : 'text-gray-500'}`}>
                  {listing.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(listing)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(listing._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleStatus(listing._id, listing.isActive)}
                    className={`p-2 rounded-lg transition-colors ${
                      listing.isActive 
                        ? 'text-gray-600 hover:bg-gray-50' 
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={listing.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {listing.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {listing.status === 'draft' && (
                  <button
                    onClick={() => submitForApproval(listing._id)}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Submit for Approval
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {listings.length === 0 && !loading && (
        <div className="text-center py-12">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No service listings yet</h3>
          <p className="text-gray-500 mb-4">Create your first service listing to get started.</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            Add New Listing
          </button>
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
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {page}
            </button>
          ))}
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold">
                  {editingListing ? 'Edit Service Listing' : 'Create New Service Listing'}
                </h3>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setEditingListing(null);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                      maxLength="100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Service Type *
                    </label>
                    <select
                      value={formData.serviceType}
                      onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
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

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows="4"
                    required
                    minLength="20"
                    maxLength="2000"
                  />
                </div>

                {/* Pricing */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pricing Type *
                    </label>
                    <select
                      value={formData.pricing.type}
                      onChange={(e) => setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, type: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    >
                      <option value="fixed">Fixed Price</option>
                      <option value="hourly">Per Hour</option>
                      <option value="daily">Per Day</option>
                      <option value="per_acre">Per Acre</option>
                      <option value="per_unit">Per Unit</option>
                      <option value="negotiable">Negotiable</option>
                    </select>
                  </div>

                  {formData.pricing.type !== 'negotiable' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount *
                      </label>
                      <input
                        type="number"
                        value={formData.pricing.amount}
                        onChange={(e) => setFormData({
                          ...formData,
                          pricing: { ...formData.pricing, amount: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        required={formData.pricing.type !== 'negotiable'}
                        min="0"
                        step="0.01"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={formData.pricing.currency}
                      onChange={(e) => setFormData({
                        ...formData,
                        pricing: { ...formData.pricing, currency: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="LKR">LKR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                {/* Service Areas */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Areas *
                  </label>
                  {formData.serviceArea.map((area, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={area}
                        onChange={(e) => {
                          const newAreas = [...formData.serviceArea];
                          newAreas[index] = e.target.value;
                          setFormData({ ...formData, serviceArea: newAreas });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., Colombo, Gampaha"
                        required
                      />
                      {formData.serviceArea.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newAreas = formData.serviceArea.filter((_, i) => i !== index);
                            setFormData({ ...formData, serviceArea: newAreas });
                          }}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      serviceArea: [...formData.serviceArea, '']
                    })}
                    className="text-green-600 hover:text-green-700 text-sm"
                  >
                    + Add Service Area
                  </button>
                </div>

                {/* Contact Information */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={formData.contactInfo.phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, phone: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={formData.contactInfo.email}
                      onChange={(e) => setFormData({
                        ...formData,
                        contactInfo: { ...formData.contactInfo, email: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Photos */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photos * (Max 10 images, 5MB each)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <input
                      type="file"
                      multiple
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileSelect}
                      className="w-full"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      Select JPEG, PNG, or WebP images (max 5MB each)
                    </p>
                  </div>

                  {/* Preview Images */}
                  {previewUrls.length > 0 && (
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="relative">
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-4 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      setEditingListing(null);
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !isFormValid()}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                    title={!isFormValid() ? 'Fill required fields, add at least one area and photo' : ''}
                  >
                    {submitting ? 'Saving...' : (editingListing ? 'Update Listing' : 'Create Listing')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceListingsManager;