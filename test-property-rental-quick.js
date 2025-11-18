const axios = require('axios');

const BASE_URL = process.env.API_URL || 'http://localhost:5500/api';

async function quickTest() {
  console.log('🚀 Quick API Test\n');
  
  const testData = {
    ownerName: "Test Owner",
    ownerEmail: "test@example.com",
    ownerPhone: "+963999123456",
    propertyType: "apartment",
    propertySize: 1200,
    bedrooms: 3,
    bathrooms: 2,
    location: "Damascus, Al-Mazzeh",
    features: "Furnished, parking, garden",
    additionalDetails: "Quick test"
  };

  try {
    console.log(`Testing: POST ${BASE_URL}/property-rental`);
    const response = await axios.post(`${BASE_URL}/property-rental`, testData, {
      timeout: 5000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    process.exit(0);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server not running on port 5500');
      console.log('💡 Start server: cd api && npm start');
    } else if (error.response) {
      console.log('❌ API Error:', error.response.status);
      console.log('Response:', error.response.data);
    } else {
      console.log('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

quickTest();

