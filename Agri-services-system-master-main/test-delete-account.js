// Test script for delete account functionality
const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

// Test account credentials
const testUser = {
  firstName: 'Test',
  lastName: 'User',
  email: 'testuser@example.com',
  password: 'password123',
  role: 'farmer'
};

async function testDeleteAccount() {
  try {
    console.log('🧪 Testing delete account functionality...\n');

    // Step 1: Register a test user
    console.log('1. Registering test user...');
    const registerResponse = await axios.post(`${API_BASE}/users/register`, testUser);
    console.log('✅ User registered successfully');
    const { token } = registerResponse.data.data;
    console.log('🔑 Token:', token.substring(0, 20) + '...\n');

    // Step 2: Test delete account
    console.log('2. Attempting to delete account...');
    const deleteResponse = await axios.delete(`${API_BASE}/users/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Delete response:', deleteResponse.data);
    
    // Step 3: Try to access profile after deletion (should fail)
    console.log('\n3. Trying to access profile after deletion...');
    try {
      await axios.get(`${API_BASE}/users/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('❌ Profile access should have failed but didn\'t');
    } catch (error) {
      console.log('✅ Profile access correctly failed:', error.response?.data?.message);
    }

    console.log('\n🎉 Delete account test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testDeleteAccount();