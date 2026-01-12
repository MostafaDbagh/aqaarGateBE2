/**
 * Create Test Listing Without Email Details
 * 
 * This script creates a test listing in the database without email, phone, or WhatsApp details
 * to test that the email button doesn't show up in listing cards.
 * 
 * Usage: node scripts/create-test-listing-no-email.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Listing = require('../models/listing.model');

// Use the same database connection logic as the main app
const getDatabaseConnection = () => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const isProduction = NODE_ENV === 'production';
  
  let mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
  
  if (!mongoURI) {
    throw new Error('MONGO_URI is not defined in environment variables!');
  }
  
  // Get database name
  const getDatabaseName = () => {
    if (process.env.MONGO_DB_NAME) {
      return process.env.MONGO_DB_NAME;
    }
    
    let existingDbName = 'SyProperties';
    const queryIndex = mongoURI.indexOf('?');
    const uriWithoutQuery = queryIndex !== -1 ? mongoURI.substring(0, queryIndex) : mongoURI;
    const lastSlashIndex = uriWithoutQuery.lastIndexOf('/');
    
    if (lastSlashIndex !== -1 && lastSlashIndex < uriWithoutQuery.length - 1) {
      existingDbName = uriWithoutQuery.substring(lastSlashIndex + 1);
    }
    
    if (isProduction) {
      return existingDbName.replace(/_Dev$/, '') || 'SyProperties';
    } else {
      const baseName = existingDbName.replace(/_Dev$/, '') || 'SyProperties';
      return `${baseName}_Dev`;
    }
  };
  
  // Replace database name in connection string
  const replaceDatabaseName = (uri, newDbName) => {
    const queryIndex = uri.indexOf('?');
    const uriWithoutQuery = queryIndex !== -1 ? uri.substring(0, queryIndex) : uri;
    const queryString = queryIndex !== -1 ? uri.substring(queryIndex) : '';
    const lastSlashIndex = uriWithoutQuery.lastIndexOf('/');
    
    if (lastSlashIndex !== -1) {
      const baseUri = uriWithoutQuery.substring(0, lastSlashIndex + 1);
      return `${baseUri}${newDbName}${queryString}`;
    }
    
    return `${uri}/${newDbName}${queryString}`;
  };
  
  const databaseName = getDatabaseName();
  const finalURI = replaceDatabaseName(mongoURI, databaseName);
  
  return { finalURI, databaseName, NODE_ENV };
};

const createTestListing = async () => {
  try {
    const { finalURI, databaseName, NODE_ENV } = getDatabaseConnection();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🧪 Creating Test Listing (No Email)');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`💾 Database: ${databaseName}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    await mongoose.connect(finalURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    
    console.log('✅ Connected to MongoDB successfully!');
    
    // Create a test listing WITHOUT email, phone, or WhatsApp
    const testListing = new Listing({
      propertyId: `TEST-${Date.now()}`,
      propertyType: 'Apartment',
      propertyKeyword: 'Modern, Spacious, City Center',
      propertyDesc: 'This is a test listing created to verify that email buttons are hidden when no email is provided.',
      description: 'This is a test listing created to verify that email buttons are hidden when no email is provided.',
      propertyPrice: 150000,
      currency: 'USD',
      status: 'sale',
      bedrooms: 3,
      bathrooms: 2,
      size: 150,
      squareFootage: 150,
      sizeUnit: 'sqm',
      furnished: true,
      garages: true,
      garageSize: 1,
      yearBuilt: 2020,
      floor: 5,
      amenities: ['Air Conditioning', 'Balcony', 'Elevator'],
      address: '123 Test Street, Test City',
      address_ar: '123 شارع الاختبار، مدينة الاختبار',
      country: 'Syria',
      city: 'Damascus',
      state: 'Damascus',
      neighborhood: 'Test Neighborhood',
      neighborhood_ar: 'حي الاختبار',
      mapLocation: 'https://maps.google.com/?q=33.5138,36.2765',
      agent: 'Test Agent', // Legacy field - required
      agentId: null, // No agent ID
      // NO EMAIL, PHONE, OR WHATSAPP - This is the key part for testing
      agentEmail: null,
      agentNumber: null,
      agentWhatsapp: null,
      approvalStatus: 'approved',
      isSold: false,
      offer: false,
      visitCount: 0,
      notes: 'Test listing without contact details',
      notes_ar: 'إعلان تجريبي بدون تفاصيل الاتصال',
      imageNames: [],
      images: []
    });
    
    const savedListing = await testListing.save();
    
    console.log('\n✅ Test listing created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📋 Listing ID: ${savedListing._id}`);
    console.log(`🏠 Property Title: ${savedListing.propertyKeyword}`);
    console.log(`📍 Location: ${savedListing.city}, ${savedListing.country}`);
    console.log(`💰 Price: ${savedListing.currency} ${savedListing.propertyPrice.toLocaleString()}`);
    console.log(`📧 Email: ${savedListing.agentEmail || 'NOT PROVIDED (as expected)'}`);
    console.log(`📱 Phone: ${savedListing.agentNumber || 'NOT PROVIDED (as expected)'}`);
    console.log(`💬 WhatsApp: ${savedListing.agentWhatsapp || 'NOT PROVIDED (as expected)'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🧪 Test this listing ID in the frontend to verify:');
    console.log(`   1. Email button should NOT appear in listing cards`);
    console.log(`   2. Call and Details buttons should still appear`);
    console.log(`\n🔗 Property Detail URL: /property-detail/${savedListing._id}`);
    console.log('\n');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test listing:', error);
    process.exit(1);
  }
};

// Run the script
createTestListing();

