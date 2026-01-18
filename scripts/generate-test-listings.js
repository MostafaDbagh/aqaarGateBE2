/**
 * Generate 50 test listings for comprehensive testing
 * Run with: node scripts/generate-test-listings.js
 * 
 * This script will:
 * 1. Login as an agent
 * 2. Create 50 diverse listings
 * 3. Test notification triggers
 * 4. Generate analytics data
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

// Configuration
const BASE_URL = process.env.API_URL || 'http://localhost:5500/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/aqaarGate';

// Test data arrays
const propertyTypes = ['Apartment', 'Villa', 'Holiday Home', 'Office', 'Townhouse', 'Commercial', 'Land'];
const cities = ['Latakia', 'Damascus', 'Aleppo', 'Homs', 'Tartus', 'Hama'];
const neighborhoods = ['Downtown', 'Suburbs', 'Beach Area', 'City Center', 'Residential'];
const statuses = ['sale', 'rent'];
const currencies = ['USD', 'SYP', 'TRY', 'EUR'];
const amenities = [
  'Parking',
  'Lift',
  'A/C',
  'Gym',
  'Security cameras',
  'Reception (nator)',
  'Balcony',
  'Swimming pool'
];

// Property descriptions
const descriptions = [
  'Beautiful property with stunning views',
  'Modern design with premium finishes',
  'Spacious and well-maintained property',
  'Prime location with excellent access',
  'Luxury property with high-end features',
  'Perfect for families and professionals',
  'Great investment opportunity',
  'Recently renovated with quality materials'
];

/**
 * Login and get auth token
 */
async function loginAsAgent() {
  try {
    // Try to find an existing agent
    await mongoose.connect(MONGODB_URI);
    const User = require('../models/user.model');
    
    // Find an agent user
    const agent = await User.findOne({ role: 'agent', isBlocked: false });
    
    if (!agent) {
      console.log('❌ No agent found. Please create an agent account first.');
      process.exit(1);
    }
    
    // Login to get token
    const loginResponse = await axios.post(`${BASE_URL}/auth/signin`, {
      email: agent.email,
      password: process.env.TEST_AGENT_PASSWORD || 'password123' // Default test password
    });
    
    if (loginResponse.data.success && loginResponse.data.token) {
      return {
        token: loginResponse.data.token,
        agentId: agent._id.toString(),
        userId: agent._id.toString()
      };
    }
    
    throw new Error('Login failed');
  } catch (error) {
    if (error.response) {
      console.error('❌ Login error:', error.response.data);
    } else {
      console.error('❌ Login error:', error.message);
    }
    throw error;
  }
}

/**
 * Generate a single listing
 */
function generateListingData(index, agentId) {
  const propertyType = propertyTypes[index % propertyTypes.length];
  const status = statuses[index % statuses.length];
  const city = cities[index % cities.length];
  const neighborhood = neighborhoods[index % neighborhoods.length];
  
  // Generate random price based on type and status
  let basePrice;
  if (propertyType === 'Land') {
    basePrice = 50000 + (index * 1000);
  } else if (propertyType === 'Villa') {
    basePrice = 200000 + (index * 5000);
  } else {
    basePrice = 80000 + (index * 2000);
  }
  
  const price = status === 'rent' ? basePrice / 10 : basePrice;
  
  // Generate random number of amenities
  const selectedAmenities = amenities
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.floor(Math.random() * 4) + 2);
  
  return {
    propertyId: `TEST_PROP_${Date.now()}_${index}`,
    propertyType: propertyType,
    propertyKeyword: `${propertyType} in ${city}`,
    propertyDesc: descriptions[index % descriptions.length],
    description_ar: `عقار جميل في ${city}`,
    propertyPrice: price,
    currency: currencies[index % currencies.length],
    status: status,
    rentType: status === 'rent' ? 'monthly' : undefined,
    bedrooms: Math.floor(Math.random() * 4) + 1,
    bathrooms: Math.floor(Math.random() * 3) + 1,
    size: 100 + (index * 10),
    sizeUnit: 'sqm',
    landArea: 150 + (index * 15),
    furnished: Math.random() > 0.5,
    garages: Math.random() > 0.5,
    garageSize: Math.random() > 0.5 ? 20 : undefined,
    yearBuilt: 1990 + (index % 30),
    floor: propertyType !== 'Land' ? Math.floor(Math.random() * 5) + 1 : undefined,
    amenities: selectedAmenities,
    address: `${index} Main Street, ${neighborhood}, ${city}`,
    address_ar: `شارع ${index} الرئيسي، ${neighborhood}، ${city}`,
    country: 'Syria',
    city: city,
    state: city,
    neighborhood: neighborhood,
    neighborhood_ar: `${neighborhood}`,
    agent: agentId,
    agentId: agentId,
    approvalStatus: 'pending', // Will be pending for admin approval
    isSold: false,
    isDeleted: false
  };
}

/**
 * Create a listing via API
 */
async function createListing(listingData, token) {
  try {
    const formData = new FormData();
    
    // Convert listingData to FormData format
    Object.keys(listingData).forEach(key => {
      const value = listingData[key];
      if (value === null || value === undefined) return;
      
      if (Array.isArray(value)) {
        value.forEach(item => formData.append(key, item));
      } else {
        formData.append(key, String(value));
      }
    });
    
    // Note: In Node.js, we need to use form-data package or axios with proper FormData handling
    // For now, we'll use JSON with multipart/form-data simulation
    const response = await axios.post(`${BASE_URL}/listing/create`, listingData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json' // Will be converted to form-data by axios if needed
      }
    });
    
    return response.data;
  } catch (error) {
    if (error.response) {
      console.error(`❌ Error creating listing ${listingData.propertyId}:`, error.response.data?.message || error.message);
      return { success: false, error: error.response.data?.message || error.message };
    }
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Test Listings Generation\n');
  console.log(`📍 API URL: ${BASE_URL}`);
  console.log(`📊 Target: 50 listings\n`);
  
  try {
    // Login
    console.log('🔐 Logging in as agent...');
    const { token, agentId } = await loginAsAgent();
    console.log('✅ Login successful!\n');
    
    // Generate and create listings
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    console.log('📝 Generating listings...\n');
    
    for (let i = 0; i < 50; i++) {
      const listingData = generateListingData(i, agentId);
      
      console.log(`[${i + 1}/50] Creating: ${listingData.propertyType} in ${listingData.city}...`);
      
      const result = await createListing(listingData, token);
      
      if (result.success) {
        results.success++;
        console.log(`   ✅ Created: ${result.propertyId || listingData.propertyId}`);
      } else {
        results.failed++;
        results.errors.push({
          index: i + 1,
          propertyId: listingData.propertyId,
          error: result.error || 'Unknown error'
        });
        console.log(`   ❌ Failed: ${result.error || 'Unknown error'}`);
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 GENERATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully created: ${results.success}/50`);
    console.log(`❌ Failed: ${results.failed}/50`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors:');
      results.errors.forEach(err => {
        console.log(`   - [${err.index}] ${err.propertyId}: ${err.error}`);
      });
    }
    
    console.log('\n✨ Test listings generation complete!');
    console.log('📋 Next steps:');
    console.log('   1. Test notifications in dashboard');
    console.log('   2. Check analytics endpoints');
    console.log('   3. Test export/import functionality');
    
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { generateListingData, createListing };

