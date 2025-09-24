import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  MapPin, 
  Clock, 
  Star, 
  Shield, 
  Calendar,
  DollarSign,
  User,
  Phone,
  Mail,
  MessageCircle,
  ImageIcon,
  Loader2,
  ArrowLeft,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

const ServiceDetailPage = () => {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [fieldSize, setFieldSize] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // Fetch service listing details
  useEffect(() => {
    const fetchServiceDetails = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/public/service-listings/${id}`);
        
        if (response.ok) {
          const data = await response.json();
          setListing(data.data);
        } else {
          throw new Error('Service not found');
        }
      } catch (error) {
        console.error('Error fetching service details:', error);
        setError('Failed to load service details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchServiceDetails();
    }
  }, [id]);

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

  const buildImageUrl = (photo) => {
    if (!photo) return null;
    if (photo.url) {
      return photo.url.startsWith('http') ? photo.url : `http://localhost:5001${photo.url}`;
    }
    return null;
  };

  const formatRating = (rating) => {
    if (!rating || !rating.average) return { display: 'New', count: 0 };
    return {
      display: rating.average.toFixed(1),
      count: rating.totalReviews || 0
    };
  };

  const getAvailabilityStatus = (status) => {
    switch (status) {
      case 'available':
        return { text: 'Available', color: 'text-green-600', bgColor: 'bg-green-100' };
      case 'busy':
        return { text: 'Busy', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
      case 'unavailable':
        return { text: 'Not Available', color: 'text-red-600', bgColor: 'bg-red-100' };
      default:
        return { text: 'Unknown', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    return slots;
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const calculateTotalCost = () => {
    if (!fieldSize || !listing?.pricing?.amount) return 0;
    return parseFloat(fieldSize) * parseFloat(listing.pricing.amount);
  };

  const handleBookNow = () => {
    if (!selectedDate || !selectedTime) {
      alert('Please select both date and time');
      return;
    }
    
    if (!fieldSize || parseFloat(fieldSize) <= 0) {
      alert('Please enter a valid field size');
      return;
    }
    
    // Navigate to payment page with service details
    const bookingData = {
      serviceId: id,
      serviceName: listing.title,
      provider: listing.serviceProvider,
      date: selectedDate,
      time: selectedTime,
      fieldSize: parseFloat(fieldSize),
      pricing: listing.pricing,
      totalCost: calculateTotalCost(),
      notes: bookingNotes
    };
    
    // Store booking data in session storage for payment page
    sessionStorage.setItem('bookingData', JSON.stringify(bookingData));
    
    // Open payment page in same tab or new tab
    window.location.href = `/payment/service`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Service Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.close()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
          >
            Close Window
          </button>
        </div>
      </div>
    );
  }

  const rating = formatRating(listing.rating);
  const availabilityStatus = getAvailabilityStatus(listing.availability?.status);
  const images = listing.photos || [];
  const timeSlots = generateTimeSlots();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Service Details</h1>
            <button
              onClick={() => window.close()}
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Image Gallery */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
              <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                {images.length > 0 ? (
                  <img
                    src={buildImageUrl(images[selectedImageIndex])}
                    alt={listing.title}
                    className="w-full h-96 object-cover"
                  />
                ) : (
                  <div className="w-full h-96 flex items-center justify-center text-gray-400">
                    <ImageIcon className="w-24 h-24" />
                  </div>
                )}
              </div>
              
              {images.length > 1 && (
                <div className="p-4">
                  <div className="flex space-x-2 overflow-x-auto">
                    {images.map((photo, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImageIndex(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          selectedImageIndex === index ? 'border-blue-500' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={buildImageUrl(photo)}
                          alt={`Image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Service Information */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                  <div className="flex items-center space-x-4 mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {formatServiceType(listing.serviceType)}
                    </span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${availabilityStatus.bgColor} ${availabilityStatus.color}`}>
                      <Clock className="w-4 h-4 mr-1" />
                      {availabilityStatus.text}
                    </span>
                    {rating.display !== 'New' && (
                      <div className="flex items-center">
                        <Star className="w-5 h-5 text-yellow-400 mr-1" />
                        <span className="font-medium">{rating.display}</span>
                        <span className="text-gray-500 ml-1">({rating.count} reviews)</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">
                    {formatPrice(listing.pricing)}
                  </div>
                  {listing.pricing.description && (
                    <p className="text-sm text-gray-600 mt-1">{listing.pricing.description}</p>
                  )}
                </div>
              </div>

              <div className="prose max-w-none">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{listing.description}</p>
              </div>
            </div>

            {/* Service Provider */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Provider</h3>
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                  {listing.serviceProvider?.profileImage ? (
                    <img
                      src={buildImageUrl(listing.serviceProvider.profileImage)}
                      alt="Provider"
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-8 h-8 text-gray-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-xl font-semibold text-gray-900">
                      {listing.serviceProvider?.firstName} {listing.serviceProvider?.lastName}
                    </h4>
                    {listing.serviceProvider?.isVerifiedProvider && (
                      <div className="flex items-center text-green-600">
                        <Shield className="w-5 h-5 mr-1" />
                        <span className="text-sm font-medium">Verified Provider</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      <span>{listing.contactInfo?.phone}</span>
                    </div>
                    {listing.contactInfo?.email && (
                      <div className="flex items-center text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        <span>{listing.contactInfo.email}</span>
                      </div>
                    )}
                    {listing.contactInfo?.whatsapp && (
                      <div className="flex items-center text-gray-600">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        <span>{listing.contactInfo.whatsapp}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Service Area */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Areas</h3>
              <div className="flex items-start space-x-2">
                <MapPin className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-gray-700">{listing.serviceArea?.join(', ')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-6">Book This Service</h3>
                
                {/* Date Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={getMinDate()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Time Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Time
                  </label>
                  <select
                    value={selectedTime}
                    onChange={(e) => setSelectedTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a time</option>
                    {timeSlots.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Field Size */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Field Size (acres)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={fieldSize}
                    onChange={(e) => setFieldSize(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter field size in acres"
                  />
                  {fieldSize && parseFloat(fieldSize) > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Service rate: {formatPrice(listing.pricing)} × {fieldSize} acres
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Any special requirements or notes..."
                  />
                </div>

                {/* Price Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Rate per acre:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {formatPrice(listing.pricing)}
                      </span>
                    </div>
                    {fieldSize && parseFloat(fieldSize) > 0 && (
                      <>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Field size:</span>
                          <span className="text-sm font-medium text-gray-900">
                            {fieldSize} acres
                          </span>
                        </div>
                        <hr className="border-gray-300" />
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-semibold text-gray-900">Total Cost:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {listing.pricing.currency} {calculateTotalCost().toFixed(2)}
                          </span>
                        </div>
                      </>
                    )}
                    {(!fieldSize || parseFloat(fieldSize) <= 0) && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Total Cost:</span>
                        <span className="text-lg font-semibold text-gray-900">
                          Enter field size to calculate
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Book Now Button */}
                <button
                  onClick={handleBookNow}
                  disabled={!selectedDate || !selectedTime || !fieldSize || parseFloat(fieldSize) <= 0}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-md transition-colors"
                >
                  {!selectedDate || !selectedTime ? 'Select Date & Time' :
                   !fieldSize || parseFloat(fieldSize) <= 0 ? 'Enter Field Size' :
                   'Pay Now'}
                </button>

                <p className="text-xs text-gray-500 mt-3 text-center">
                  You will be redirected to the payment page to complete your booking
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailPage;