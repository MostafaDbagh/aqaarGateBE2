/**
 * Create Approved Agent with Approved Listing
 * 
 * This script creates:
 * 1. One approved agent (not blocked)
 * 2. One approved listing with size in dunam
 * 
 * Usage: node scripts/createAgentWithListing.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Listing = require('../models/listing.model');
const bcrypt = require('bcryptjs');

// Use the same database connection logic as the main app
const getDatabaseConnection = () => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const isProduction = NODE_ENV === 'production';
  
  let mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
  
  if (!mongoURI) {
    throw new Error('MONGO_URI is not defined in environment variables!');
  }
  
  // Prevent running on production
  if (isProduction) {
    throw new Error('❌ This script cannot run in production environment! Set NODE_ENV=development');
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

const createAgentWithListing = async () => {
  try {
    const { finalURI, databaseName, NODE_ENV } = getDatabaseConnection();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('👤 Create Approved Agent with Listing');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`💾 Database: ${databaseName}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (NODE_ENV === 'production') {
      console.error('❌ ERROR: This script cannot run in production!');
      process.exit(1);
    }
    
    // Connect to MongoDB
    await mongoose.connect(finalURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB\n');
    
    // Check if agent already exists
    const existingAgent = await User.findOne({ 
      email: 'agent@test.com',
      role: 'agent'
    });
    
    if (existingAgent) {
      console.log('⚠️  Agent with email agent@test.com already exists.');
      console.log('   Deleting existing agent and their listings...\n');
      await Listing.deleteMany({ agentId: existingAgent._id });
      await User.deleteOne({ _id: existingAgent._id });
      console.log('✅ Existing agent and listings deleted.\n');
    }
    
    // Create approved agent
    console.log('👤 Creating approved agent...');
    const hashedPassword = await bcrypt.hash('agent123', 10);
    
    const agent = new User({
      username: 'Test Agent',
      email: 'agent@test.com',
      password: hashedPassword,
      phone: '+963991234567',
      role: 'agent',
      isBlocked: false, // Approved agent (not blocked)
      isVerified: true,
      location: 'Damascus',
      description: 'Test agent for development',
      pointsBalance: 1000,
      packageType: 'premium'
    });
    
    await agent.save();
    console.log(`✅ Agent created successfully!`);
    console.log(`   ID: ${agent._id}`);
    console.log(`   Email: ${agent.email}`);
    console.log(`   Username: ${agent.username}`);
    console.log(`   Password: agent123`);
    console.log(`   Status: Approved (not blocked)\n`);
    
    // Create approved listing with size in dunam
    console.log('🏠 Creating approved listing with size in dunam...');
    
    const listing = new Listing({
      propertyId: `PROP-${Date.now()}`,
      propertyType: 'Land',
      propertyKeyword: 'Prime Location, Investment, Development',
      propertyDesc: 'Beautiful land plot in prime location, perfect for investment or development. Located in a desirable area with easy access to main roads and amenities.',
      description: 'Beautiful land plot in prime location, perfect for investment or development. Located in a desirable area with easy access to main roads and amenities.',
      propertyPrice: 50000,
      currency: 'USD',
      status: 'sale',
      bedrooms: 0, // Land has no bedrooms
      bathrooms: 0, // Land has no bathrooms
      size: 5, // 5 dunam
      squareFootage: 5,
      sizeUnit: 'dunam', // Size in dunam
      furnished: false,
      garages: false,
      address: '123 Main Street, Damascus',
      address_ar: '123 الشارع الرئيسي، دمشق',
      country: 'Syria',
      city: 'Damascus',
      state: 'Damascus',
      neighborhood: 'Al-Mazzeh',
      neighborhood_ar: 'المزة',
      mapLocation: 'https://maps.google.com/?q=33.5138,36.2765',
      agent: agent.email,
      agentId: agent._id,
      agentEmail: agent.email,
      agentNumber: agent.phone,
      approvalStatus: 'approved', // Approved listing
      isSold: false,
      offer: false,
      visitCount: 0,
      notes: 'Test listing created by approved agent',
      notes_ar: 'إعلان تجريبي تم إنشاؤه بواسطة وكيل معتمد',
      imageNames: [],
      images: []
    });
    
    await listing.save();
    console.log(`✅ Listing created successfully!`);
    console.log(`   Property ID: ${listing.propertyId}`);
    console.log(`   Type: ${listing.propertyType}`);
    console.log(`   Size: ${listing.size} ${listing.sizeUnit.toUpperCase()}`);
    console.log(`   Price: ${listing.currency} ${listing.propertyPrice.toLocaleString()}`);
    console.log(`   City: ${listing.city}`);
    console.log(`   Approval Status: ${listing.approvalStatus}`);
    console.log(`   Agent: ${agent.email}\n`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:');
    console.log(`   ✅ Agent Created: ${agent.email}`);
    console.log(`   ✅ Listing Created: ${listing.propertyId}`);
    console.log(`   ✅ Size Unit: ${listing.sizeUnit.toUpperCase()}`);
    console.log(`   ✅ Approval Status: ${listing.approvalStatus}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Agent and listing created successfully!');
    console.log('🔐 Agent Login Credentials:');
    console.log(`   Email: ${agent.email}`);
    console.log(`   Password: agent123\n`);
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    if (error.code === 11000) {
      console.error('   Duplicate key error - agent or listing may already exist');
    }
    process.exit(1);
  }
};

// Run the script
createAgentWithListing();

