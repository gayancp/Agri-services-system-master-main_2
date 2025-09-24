import React from 'react';
import { 
  Star, 
  MapPin, 
  Clock, 
  User, 
  Phone, 
  Mail, 
  Calendar,
  Shield,
  Eye,
  Heart,
  Share2
} from 'lucide-react';

const ServiceListingCard = ({ listing, viewMode = 'grid', showDistance = false, onViewDetails, onContact }) => {
  // Helper functions
  const formatPrice = (pricing) => {
    if (pricing.type === 'negotiable') {
      return 'Negotiable';
    }
    return `${pricing.currency} ${pricing.amount}/${pricing.type.replace('_', ' ')}`;
  };

  const formatServiceType = (type) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'available':
        return 'text-green-600 bg-green-100';
      case 'busy':
        return 'text-yellow-600 bg-yellow-100';
      case 'unavailable':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getAvailabilityText = (status) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'busy':
        return 'Busy';
      case 'unavailable':
        return 'Not Available';
      default:
        return 'Unknown';
    }
  };

  const formatRating = (rating) => {
    if (!rating || !rating.average) return { display: 'New', count: 0 };
    return {
      display: rating.average.toFixed(1),
      count: rating.totalReviews || 0
    };
  };

  const buildImageUrl = (photo) => {
    if (!photo) return null;
    if (photo.url) {
      return photo.url.startsWith('http') ? photo.url : `http://localhost:5001${photo.url}`;
    }
    return null;
  };

  const rating = formatRating(listing.rating);
  const primaryImageUrl = buildImageUrl(listing.primaryPhoto || (listing.photos && listing.photos[0]));

  // List View
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow duration-200">
        <div className="p-6">
          <div className="flex items-start space-x-6">
            {/* Image */}
            <div className="flex-shrink-0 w-32 h-32 bg-gray-200 rounded-lg overflow-hidden">
              {primaryImageUrl ? (
                <img
                  src={primaryImageUrl}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Eye className="w-12 h-12" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 truncate mr-4">
                      {listing.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <button className="text-gray-400 hover:text-red-500 transition-colors">
                        <Heart className="w-5 h-5" />
                      </button>
                      <button className="text-gray-400 hover:text-blue-500 transition-colors">
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Service Type and Availability */}
                  <div className="flex items-center space-x-3 mb-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {formatServiceType(listing.serviceType)}
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAvailabilityColor(listing.availability?.status)}`}>
                      <Clock className="w-3 h-3 mr-1" />
                      {getAvailabilityText(listing.availability?.status)}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-gray-600 text-sm line-clamp-2 mb-4">
                    {listing.description}
                  </p>

                  {/* Provider and Location Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Service Provider</h4>
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          {listing.serviceProvider?.profileImage ? (
                            <img
                              src={buildImageUrl(listing.serviceProvider.profileImage)}
                              alt="Provider"
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {listing.serviceProvider?.firstName} {listing.serviceProvider?.lastName}
                          </p>
                          {listing.serviceProvider?.isVerifiedProvider && (
                            <div className="flex items-center text-xs text-green-600">
                              <Shield className="w-3 h-3 mr-1" />
                              Verified Provider
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Service Area</h4>
                      <div className="flex items-start space-x-2">
                        <MapPin className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-gray-600">
                            {listing.serviceArea?.slice(0, 2).join(', ')}
                            {listing.serviceArea?.length > 2 && ` +${listing.serviceArea.length - 2} more`}
                          </p>
                          {showDistance && listing.distance && (
                            <p className="text-xs text-gray-500">{listing.distance} km away</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rating and Stats */}
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="font-medium text-gray-900">{rating.display}</span>
                      {rating.count > 0 && (
                        <span className="ml-1">({rating.count} reviews)</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {listing.views || 0} views
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(listing.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Price and Actions */}
                <div className="ml-6 text-right">
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-gray-900">
                      {formatPrice(listing.pricing)}
                    </div>
                    {listing.pricing.description && (
                      <p className="text-sm text-gray-500 mt-1">
                        {listing.pricing.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <button
                      onClick={() => onViewDetails?.(listing)}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => onContact?.(listing)}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      Contact Provider
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-lg transition-shadow duration-200 group">
      {/* Image */}
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        {primaryImageUrl ? (
          <img
            src={primaryImageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Eye className="w-16 h-16" />
          </div>
        )}
        
        {/* Overlay badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
          <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getAvailabilityColor(listing.availability?.status)}`}>
            {getAvailabilityText(listing.availability?.status)}
          </span>
          <div className="flex space-x-1">
            <button className="bg-white bg-opacity-80 hover:bg-opacity-100 p-1.5 rounded-full transition-all">
              <Heart className="w-4 h-4 text-gray-600" />
            </button>
            <button className="bg-white bg-opacity-80 hover:bg-opacity-100 p-1.5 rounded-full transition-all">
              <Share2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Rating badge */}
        {rating.display !== 'New' && (
          <div className="absolute bottom-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded-md text-sm flex items-center">
            <Star className="w-4 h-4 text-yellow-400 mr-1" />
            <span className="font-medium">{rating.display}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Header */}
        <div className="mb-2">
          <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
            {listing.title}
          </h3>
          <div className="flex items-center justify-between mt-1">
            <span className="text-sm text-blue-600 font-medium">
              {formatServiceType(listing.serviceType)}
            </span>
            {listing.serviceProvider?.isVerifiedProvider && (
              <div className="flex items-center text-xs text-green-600">
                <Shield className="w-3 h-3 mr-1" />
                Verified
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">
          {listing.description}
        </p>

        {/* Provider Info */}
        <div className="flex items-center space-x-2 mb-3">
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
            {listing.serviceProvider?.profileImage ? (
              <img
                src={buildImageUrl(listing.serviceProvider.profileImage)}
                alt="Provider"
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <User className="w-3 h-3 text-gray-500" />
            )}
          </div>
          <span className="text-sm text-gray-700 truncate">
            {listing.serviceProvider?.firstName} {listing.serviceProvider?.lastName}
          </span>
        </div>

        {/* Location and Distance */}
        <div className="flex items-center text-sm text-gray-500 mb-3">
          <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
          <span className="truncate">{listing.serviceArea?.[0]}</span>
          {showDistance && listing.distance && (
            <span className="ml-auto text-xs bg-gray-100 px-2 py-1 rounded">
              {listing.distance} km
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
          <div className="flex items-center space-x-3">
            <span className="flex items-center">
              <Eye className="w-3 h-3 mr-1" />
              {listing.views || 0}
            </span>
            <span>{rating.count} reviews</span>
          </div>
          <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
        </div>

        {/* Price and Action */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-lg font-bold text-gray-900">
              {formatPrice(listing.pricing)}
            </div>
            {listing.pricing.description && (
              <p className="text-xs text-gray-500 truncate">
                {listing.pricing.description}
              </p>
            )}
          </div>
          <button
            onClick={() => onViewDetails?.(listing)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceListingCard;