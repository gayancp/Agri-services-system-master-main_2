import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Cookies from 'js-cookie';
import { 
  CreditCard, 
  Lock, 
  Calendar,
  Clock,
  User,
  MapPin,
  DollarSign,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Shield
} from 'lucide-react';

const ServicePaymentPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentStep, setPaymentStep] = useState('payment'); // 'payment', 'processing', 'success'
  
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'Sri Lanka'
    }
  });

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Get booking data from session storage
    const storedBookingData = sessionStorage.getItem('bookingData');
    if (storedBookingData) {
      setBookingData(JSON.parse(storedBookingData));
    } else {
      navigate('/services');
    }
  }, [isAuthenticated, navigate]);

  // Form validation
  const validateForm = () => {
    const errors = {};

    // Card number validation (simple demo validation)
    if (!paymentForm.cardNumber.replace(/\s/g, '')) {
      errors.cardNumber = 'Card number is required';
    } else if (paymentForm.cardNumber.replace(/\s/g, '').length !== 16) {
      errors.cardNumber = 'Card number must be 16 digits';
    }

    // Expiry date validation
    if (!paymentForm.expiryDate) {
      errors.expiryDate = 'Expiry date is required';
    } else {
      const [month, year] = paymentForm.expiryDate.split('/');
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;

      if (!month || !year || month < 1 || month > 12) {
        errors.expiryDate = 'Invalid expiry date format';
      } else if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        errors.expiryDate = 'Card has expired';
      }
    }

    // CVV validation
    if (!paymentForm.cvv) {
      errors.cvv = 'CVV is required';
    } else if (paymentForm.cvv.length !== 3) {
      errors.cvv = 'CVV must be 3 digits';
    }

    // Cardholder name validation
    if (!paymentForm.cardholderName.trim()) {
      errors.cardholderName = 'Cardholder name is required';
    }

    // Billing address validation
    if (!paymentForm.billingAddress.street.trim()) {
      errors.street = 'Street address is required';
    }
    if (!paymentForm.billingAddress.city.trim()) {
      errors.city = 'City is required';
    }
    if (!paymentForm.billingAddress.state.trim()) {
      errors.state = 'State/Province is required';
    }
    if (!paymentForm.billingAddress.zipCode.trim()) {
      errors.zipCode = 'ZIP/Postal code is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Format card number with spaces
  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return v;
    }
  };

  // Format expiry date
  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  // Handle form input changes
  const handleInputChange = (field, value) => {
    if (field === 'cardNumber') {
      value = formatCardNumber(value);
    } else if (field === 'expiryDate') {
      value = formatExpiryDate(value);
    } else if (field === 'cvv') {
      value = value.replace(/[^0-9]/g, '').substring(0, 3);
    }

    setPaymentForm(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle billing address changes
  const handleBillingAddressChange = (field, value) => {
    setPaymentForm(prev => ({
      ...prev,
      billingAddress: {
        ...prev.billingAddress,
        [field]: value
      }
    }));

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Calculate total amount
  const calculateTotal = () => {
    if (!bookingData || bookingData.pricing.type === 'negotiable') {
      return 'Negotiable';
    }
    
    if (bookingData.totalCost) {
      return `${bookingData.pricing.currency} ${bookingData.totalCost.toFixed(2)}`;
    }
    
    return `${bookingData.pricing.currency} ${bookingData.pricing.amount}`;
  };

  // Handle payment submission
  const handlePayment = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setPaymentStep('processing');
    setError('');

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Create payment data
      const paymentData = {
        serviceId: bookingData.serviceId,
        serviceName: bookingData.serviceName,
        providerId: bookingData.provider._id,
        buyerId: user._id,
        bookingDate: bookingData.date,
        bookingTime: bookingData.time,
        fieldSize: bookingData.fieldSize,
        amount: bookingData.totalCost || bookingData.pricing.amount,
        currency: bookingData.pricing.currency,
        paymentMethod: 'credit_card',
        cardLast4: paymentForm.cardNumber.slice(-4),
        notes: bookingData.notes,
        billingAddress: paymentForm.billingAddress
      };

      // Submit payment to backend
      const response = await fetch('http://localhost:5001/api/payments/service-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Cookies.get('token')}`
        },
        body: JSON.stringify(paymentData)
      });

      if (response.ok) {
        const result = await response.json();
        
        // Store transaction details for confirmation page
        sessionStorage.setItem('paymentResult', JSON.stringify(result.data));
        sessionStorage.removeItem('bookingData');
        
        setPaymentStep('success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment processing failed. Please try again.');
      setPaymentStep('payment');
    } finally {
      setLoading(false);
    }
  };

  // Get card type from number
  const getCardType = (number) => {
    const cleanNumber = number.replace(/\s/g, '');
    if (cleanNumber.startsWith('4')) return 'Visa';
    if (cleanNumber.startsWith('5')) return 'Mastercard';
    if (cleanNumber.startsWith('3')) return 'American Express';
    return 'Card';
  };

  if (!bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Success page
  if (paymentStep === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your service booking has been confirmed. You will receive a confirmation email shortly.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/orders')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium"
            >
              View My Bookings
            </button>
            <button
              onClick={() => navigate('/services')}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium"
            >
              Browse More Services
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Processing page
  if (paymentStep === 'processing') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Processing Payment</h2>
          <p className="text-gray-600 mb-4">
            Please wait while we process your payment. Do not close this page.
          </p>
          <div className="flex items-center justify-center text-sm text-gray-500">
            <Shield className="w-4 h-4 mr-2" />
            <span>Secure payment processing</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Payment Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Payment Information</h2>
            
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handlePayment(); }}>
              {/* Card Information */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Card Information
                </h3>
                
                <div className="grid grid-cols-1 gap-4">
                  {/* Card Number */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Card Number
                    </label>
                    <input
                      type="text"
                      value={paymentForm.cardNumber}
                      onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.cardNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.cardNumber && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.cardNumber}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Expiry Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        value={paymentForm.expiryDate}
                        onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                        placeholder="MM/YY"
                        maxLength={5}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors.expiryDate ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {validationErrors.expiryDate && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.expiryDate}</p>
                      )}
                    </div>

                    {/* CVV */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CVV
                      </label>
                      <input
                        type="text"
                        value={paymentForm.cvv}
                        onChange={(e) => handleInputChange('cvv', e.target.value)}
                        placeholder="123"
                        maxLength={3}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors.cvv ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {validationErrors.cvv && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.cvv}</p>
                      )}
                    </div>
                  </div>

                  {/* Cardholder Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={paymentForm.cardholderName}
                      onChange={(e) => handleInputChange('cardholderName', e.target.value)}
                      placeholder="John Doe"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.cardholderName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.cardholderName && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.cardholderName}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Billing Address</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address
                    </label>
                    <input
                      type="text"
                      value={paymentForm.billingAddress.street}
                      onChange={(e) => handleBillingAddressChange('street', e.target.value)}
                      placeholder="123 Main Street"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                        validationErrors.street ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {validationErrors.street && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.street}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City
                      </label>
                      <input
                        type="text"
                        value={paymentForm.billingAddress.city}
                        onChange={(e) => handleBillingAddressChange('city', e.target.value)}
                        placeholder="Colombo"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors.city ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {validationErrors.city && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.city}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State/Province
                      </label>
                      <input
                        type="text"
                        value={paymentForm.billingAddress.state}
                        onChange={(e) => handleBillingAddressChange('state', e.target.value)}
                        placeholder="Western Province"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors.state ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {validationErrors.state && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.state}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP/Postal Code
                      </label>
                      <input
                        type="text"
                        value={paymentForm.billingAddress.zipCode}
                        onChange={(e) => handleBillingAddressChange('zipCode', e.target.value)}
                        placeholder="00100"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors.zipCode ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {validationErrors.zipCode && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.zipCode}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country
                      </label>
                      <select
                        value={paymentForm.billingAddress.country}
                        onChange={(e) => handleBillingAddressChange('country', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="Sri Lanka">Sri Lanka</option>
                        <option value="India">India</option>
                        <option value="United States">United States</option>
                        <option value="United Kingdom">United Kingdom</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-md transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Lock className="w-5 h-5 mr-2" />
                )}
                {loading ? 'Processing...' : `Pay ${calculateTotal()}`}
              </button>

              <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
                <Shield className="w-4 h-4 mr-2" />
                <span>Your payment information is secure and encrypted</span>
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Booking Summary</h2>
            
            <div className="space-y-4 mb-6">
              <div>
                <h3 className="font-medium text-gray-900">{bookingData.serviceName}</h3>
                <p className="text-sm text-gray-600 mt-1">Agricultural Service</p>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <User className="w-4 h-4 mr-2" />
                <span>{bookingData.provider.firstName} {bookingData.provider.lastName}</span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>{new Date(bookingData.date).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center text-sm text-gray-600">
                <Clock className="w-4 h-4 mr-2" />
                <span>{bookingData.time}</span>
              </div>

              {bookingData.fieldSize && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  <span>Field Size: {bookingData.fieldSize} acres</span>
                </div>
              )}

              {bookingData.notes && (
                <div className="text-sm">
                  <span className="font-medium text-gray-900">Notes:</span>
                  <p className="text-gray-600 mt-1">{bookingData.notes}</p>
                </div>
              )}
            </div>

            <div className="border-t pt-4">
              {bookingData.fieldSize && bookingData.totalCost && (
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Rate per acre:</span>
                    <span className="text-gray-900">{bookingData.pricing.currency} {bookingData.pricing.amount}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Field size:</span>
                    <span className="text-gray-900">{bookingData.fieldSize} acres</span>
                  </div>
                  <hr className="border-gray-200" />
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total:</span>
                <span className="text-2xl font-bold text-gray-900">{calculateTotal()}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Final amount may vary based on actual service duration
              </p>
            </div>

            <div className="mt-6 bg-blue-50 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Payment confirmation will be sent to your email</li>
                <li>• Service provider will contact you to confirm details</li>
                <li>• You can track your booking in the Orders section</li>
                <li>• Cancel or reschedule up to 24 hours before service</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ServicePaymentPage;