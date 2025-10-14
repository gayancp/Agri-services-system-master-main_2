import React, { useState, useEffect, useCallback } from 'react';
import { Search, Filter, MapPin, Star, DollarSign, Clock, Grid, List, SlidersHorizontal, Loader2, Navigation, MapPinIcon } from 'lucide-react';
import ServiceListingCard from '../common/ServiceListingCard';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';

const ServiceBrowserPage = () => {
  const { user, isAuthenticated } = useAuth();
  
  // State management
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    serviceType: 'all',
    minPrice: '',
    maxPrice: '',
    currency: 'LKR',
    location: '',
    minRating: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  
  // Location state
  const [userLocation, setUserLocation] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [searchRadius, setSearchRadius] = useState(50);
  const [userProfile, setUserProfile] = useState(null);
  const [myLocationEnabled, setMyLocationEnabled] = useState(false);
  
  // Pagination state
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalListings: 0,
    limit: 12
  });
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);

  // Service type options
  const serviceTypeOptions = [
    { value: 'all', label: 'All Services' },
    { value: 'equipment_rental', label: 'Equipment Rental' },
    { value: 'transportation', label: 'Transportation' },
    { value: 'processing', label: 'Processing' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'harvesting', label: 'Harvesting' },
    { value: 'planting', label: 'Planting' },
    { value: 'pest_control', label: 'Pest Control' },
    { value: 'irrigation', label: 'Irrigation' },
    { value: 'soil_testing', label: 'Soil Testing' },
    { value: 'other', label: 'Other' }
  ];

  // Sort options
  const sortOptions = [
    { value: 'createdAt', label: 'Newest First' },
    { value: 'rating', label: 'Highest Rated' },
    { value: 'price', label: 'Price' },
    { value: 'views', label: 'Most Popular' },
    { value: 'distance', label: 'Nearest First' },
    { value: 'relevance', label: 'Most Relevant' }
  ];

  // Get user profile and location
  const getUserProfile = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await authService.getProfile();
      if (response.success) {
        setUserProfile(response.data.user);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }, [isAuthenticated]);

  // Use farmer's location from profile
  const useMyLocation = useCallback(() => {
    if (!userProfile) {
      setError('Please log in to use your location.');
      return;
    }
    
    let locationFound = false;
    
    // Try to get location from farm details first (coordinates)
    if (userProfile.farmDetails?.location?.latitude && userProfile.farmDetails?.location?.longitude) {
      setUserLocation({
        lat: userProfile.farmDetails.location.latitude,
        lng: userProfile.farmDetails.location.longitude,
        address: userProfile.farmDetails.farmName || 'My Farm'
      });
      setLocationEnabled(true);
      setMyLocationEnabled(true);
      locationFound = true;
    }
    // Fallback to address city for text-based filtering
    else if (userProfile.address?.city && userProfile.address.city.trim() !== '') {
      // Use the city as a location filter
      setFilters(prev => ({
        ...prev,
        location: userProfile.address.city.trim()
      }));
      setMyLocationEnabled(true);
      setLocationEnabled(false); // No GPS coordinates, just text search
      locationFound = true;
    }
    // Check if state is available as additional location info
    else if (userProfile.address?.state && userProfile.address.state.trim() !== '') {
      setFilters(prev => ({
        ...prev,
        location: userProfile.address.state.trim()
      }));
      setMyLocationEnabled(true);
      setLocationEnabled(false);
      locationFound = true;
    }

    if (!locationFound) {
      setError('No location information found in your profile. Please update your address (city) or farm location in your profile.');
    } else {
      setError(''); // Clear any previous errors
      // Trigger a new search with the location filter
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    }
  }, [userProfile]);

  // Get user location via GPS
  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationEnabled(true);
          setMyLocationEnabled(false);
          setLoading(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Could not get your location. You can still browse services without location-based features.');
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      setError('Geolocation is not supported by this browser.');
    }
  }, []);

  // Fetch service listings
  const fetchListings = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: pagination.currentPage,
        limit: pagination.limit
      });

      // Add filters
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key] !== 'all' && filters[key] !== '') {
          params.append(key, filters[key]);
        }
      });

      // Add search query if present
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      // Add location parameters if available
      if (locationEnabled && userLocation && userLocation.lat && userLocation.lng) {
        params.append('lat', userLocation.lat);
        params.append('lng', userLocation.lng);
        params.append('radius', searchRadius);
      }

      const response = await fetch(`/api/public/service-listings?${params}`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setListings(data.data.listings || []);
        setPagination(data.data.pagination);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch service listings');
      }
    } catch (error) {
      console.error('Fetch listings error:', error);
      setError('Failed to load service listings. Please try again.');
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters, pagination.currentPage, pagination.limit, userLocation, locationEnabled, searchRadius]);

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const [typesRes, locationsRes] = await Promise.all([
        fetch('/api/public/service-listings/stats/types'),
        fetch('/api/public/service-listings/stats/locations')
      ]);

      if (typesRes.ok) {
        const typesData = await typesRes.json();
        setServiceTypes(typesData.data);
      }

      if (locationsRes.ok) {
        const locationsData = await locationsRes.json();
        setAvailableLocations(locationsData.data);
      }
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== undefined) {
        setPagination(prev => ({ ...prev, currentPage: 1 }));
        fetchListings();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, fetchListings]);

  // Fetch listings when filters change
  useEffect(() => {
    fetchListings();
  }, [filters, pagination.currentPage]);

  // Initial load
  useEffect(() => {
    fetchFilterOptions();
    fetchListings();
    if (isAuthenticated) {
      getUserProfile();
    }
  }, [isAuthenticated]);

  // Load user profile when authenticated
  useEffect(() => {
    if (isAuthenticated && !userProfile) {
      getUserProfile();
    }
  }, [isAuthenticated, userProfile, getUserProfile]);

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle sort change
  const handleSortChange = (sortBy, sortOrder = 'desc') => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder
    }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      serviceType: 'all',
      minPrice: '',
      maxPrice: '',
      currency: 'LKR',
      location: '',
      minRating: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setSearchQuery('');
    setLocationEnabled(false);
    setMyLocationEnabled(false);
    setUserLocation(null);
    setError('');
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  // Handle view details
  const handleViewDetails = (listing) => {
    // Open service details in a new tab
    const url = `/services/${listing._id}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Handle contact provider
  const handleContactProvider = (listing) => {
    // TODO: Open contact modal or navigate to contact page
    console.log('Contact provider for:', listing.title);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Agricultural Services
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Find and book agricultural services in your area
              </p>
            </div>
            
            {/* Location Buttons */}
            <div className="mt-4 md:mt-0 md:ml-4 flex gap-2">
              {isAuthenticated && userProfile && (
                <button
                  onClick={useMyLocation}
                  disabled={loading}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                    myLocationEnabled 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-purple-600 hover:bg-purple-700'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50`}
                >
                  <MapPinIcon className="w-4 h-4 mr-2" />
                  {myLocationEnabled ? 'Using My Location' : 'Filter My Location'}
                </button>
              )}
              
              {/* <button
                onClick={getCurrentLocation}
                disabled={loading}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  locationEnabled && !myLocationEnabled
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50`}
              >
                <Navigation className="w-4 h-4 mr-2" />
                {locationEnabled && !myLocationEnabled ? 'GPS Enabled' : 'Enable GPS'}
              </button> */}
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters Section */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search for services, equipment, locations..."
                />
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex flex-wrap gap-2">
              { <select
                value={filters.serviceType}
                onChange={(e) => handleFilterChange('serviceType', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {serviceTypeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select> }

              { <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  handleSortChange(sortBy, sortOrder);
                }}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={`${option.value}-desc`}>
                    {option.label}
                  </option>
                ))}
              </select> }

              {/* Filter Toggle */}
              {/* <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md ${
                  showFilters
                    ? 'border-blue-500 text-blue-700 bg-blue-50'
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                } focus:outline-none focus:ring-1 focus:ring-blue-500`}
              >
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Filters
              </button> */}

              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded-md">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-2 text-sm font-medium ${
                    viewMode === 'grid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  } rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 text-sm font-medium ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  } rounded-r-md border-l border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Location Filter Status */}
          {myLocationEnabled && (
            <div className="mt-2 flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-3 py-2">
              <div className="flex items-center text-sm text-purple-800">
                <MapPinIcon className="w-4 h-4 mr-2" />
                <span>Filtering by your location: {filters.location || userLocation?.address || 'Your area'}</span>
              </div>
              <button
                onClick={() => {
                  setMyLocationEnabled(false);
                  setLocationEnabled(false);
                  setUserLocation(null);
                  setFilters(prev => ({ ...prev, location: '' }));
                }}
                className="text-purple-600 hover:text-purple-800 text-sm font-medium"
              >
                Clear
              </button>
            </div>
          )}

          {/* Advanced Filters Panel */}
          {showFilters && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price Range
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="City or district"
                    value={filters.location}
                    onChange={(e) => handleFilterChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Rating */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Rating
                  </label>
                  <select
                    value={filters.minRating}
                    onChange={(e) => handleFilterChange('minRating', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Any Rating</option>
                    <option value="4">4+ Stars</option>
                    <option value="3">3+ Stars</option>
                    <option value="2">2+ Stars</option>
                    <option value="1">1+ Stars</option>
                  </select>
                </div>

                {/* Search Radius (if location enabled) */}
                {locationEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search Radius ({searchRadius} km)
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="200"
                      value={searchRadius}
                      onChange={(e) => setSearchRadius(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Filter Actions */}
              <div className="mt-4 flex justify-between items-center">
                <button
                  onClick={clearFilters}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Clear all filters
                </button>
                <div className="text-sm text-gray-600">
                  {pagination.totalListings} services found
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Results */}
        {!loading && listings.length > 0 && (
          <>
            {/* Results Header */}
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  {pagination.totalListings} services found
                </h2>
                <p className="text-sm text-gray-500">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </p>
              </div>
            </div>

            {/* Service Listings Grid/List */}
            <div className={`mb-8 ${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
                : 'space-y-4'
            }`}>
              {listings.map((listing) => (
                <ServiceListingCard 
                  key={listing._id} 
                  listing={listing} 
                  viewMode={viewMode}
                  showDistance={locationEnabled}
                  onViewDetails={handleViewDetails}
                  onContact={handleContactProvider}
                />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => handlePageChange(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          pagination.currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && listings.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No services found</h3>
            <p className="text-gray-500 mb-4">
              Try adjusting your search terms or filters to find what you're looking for.
            </p>
            <button
              onClick={clearFilters}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceBrowserPage;