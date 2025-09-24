// Test script to simulate service listing creation
const FormData = require('form-data');
const fetch = require('node-fetch');

async function testServiceListingCreation() {
  const formData = new FormData();
  
  // Simulate the data structure from frontend
  formData.append('title', 'Test Service Listing');
  formData.append('description', 'This is a test service listing with more than 20 characters to meet validation requirements');
  formData.append('serviceType', 'equipment_rental');
  
  // JSON stringified objects as they would be sent from frontend
  formData.append('pricing', JSON.stringify({
    type: 'fixed',
    amount: '100',
    currency: 'LKR',
    description: 'Test pricing'
  }));
  
  formData.append('serviceArea', JSON.stringify(['Colombo', 'Gampaha']));
  
  formData.append('contactInfo', JSON.stringify({
    phone: '0771234567',
    email: 'test@example.com',
    whatsapp: '0771234567',
    preferredContactMethod: 'phone'
  }));

  try {
    const response = await fetch('http://localhost:5001/api/service-listings', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer test-token'
      },
      body: formData
    });

    const result = await response.text();
    console.log('Response status:', response.status);
    console.log('Response:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testServiceListingCreation();