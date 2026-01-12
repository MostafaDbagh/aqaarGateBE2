/**
 * Clear All Listings and Seed 50 Test Listings
 * 
 * This script:
 * 1. Clears all listings and properties (keeps agents and admins)
 * 2. Creates 50 test listings:
 *    - 40 by agents (distributed among existing agents)
 *    - 10 by admins
 *    - Different cities in Syria
 *    - Different size units (sqm, dunam, sqft, sqyd, feddan)
 *    - Some without email (for testing)
 *    - Different property types: Apartment, Villa, Holiday Home, Land, Commercial, Office
 * 
 * Usage: node scripts/clearAndSeedTestListings.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Listing = require('../models/listing.model');
const User = require('../models/user.model');

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

// Syrian cities
const syrianCities = [
  'Damascus', 'Aleppo', 'Homs', 'Latakia', 'Hama', 'Tartus', 'Deir ez-Zor',
  'Raqqa', 'Idlib', 'Daraa', 'As-Suwayda', 'Qamishli', 'Al-Hasakah', 'Manbij'
];

// Property types
const propertyTypes = ['Apartment', 'Villa', 'Holiday Home', 'Land', 'Commercial', 'Office'];

// Size units
const sizeUnits = ['sqm', 'dunam', 'sqft', 'sqyd', 'feddan'];

// Keywords for different property types
const propertyKeywords = {
  'Apartment': ['Modern', 'Spacious', 'City Center', 'Elevator', 'Balcony'],
  'Villa': ['Luxury', 'Garden', 'Swimming Pool', 'Private', 'Premium'],
  'Holiday Home': ['Beachfront', 'Resort', 'Vacation', 'Seaside', 'Relaxing'],
  'Land': ['Investment', 'Development', 'Agricultural', 'Residential', 'Prime Location'],
  'Commercial': ['Retail', 'Business', 'Shop', 'Store', 'Commercial Space'],
  'Office': ['Business', 'Professional', 'Downtown', 'Modern', 'Office Space']
};

// Generate random listing data with better variation
const generateListing = (index, isAdmin, agent, adminUser, specifiedPropertyType = null) => {
  // Use specified property type if provided, otherwise random
  const propertyType = specifiedPropertyType || propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
  
  // Ensure all cities are used - cycle through cities
  const cityIndex = (index - 1) % syrianCities.length;
  const randomCityOffset = Math.floor(Math.random() * syrianCities.length);
  const city = syrianCities[(cityIndex + randomCityOffset) % syrianCities.length];
  
  // Better variation in status - alternate but with some randomness
  const status = (index % 3 === 0) ? 'rent' : (index % 2 === 0 ? 'sale' : (Math.random() > 0.5 ? 'sale' : 'rent'));
  
  // Better variation in approval status
  const approvalStatusRand = Math.random();
  let approvalStatus;
  if (approvalStatusRand < 0.6) {
    approvalStatus = 'approved'; // 60% approved
  } else if (approvalStatusRand < 0.8) {
    approvalStatus = 'pending'; // 20% pending
  } else if (approvalStatusRand < 0.95) {
    approvalStatus = 'rejected'; // 15% rejected
  } else {
    approvalStatus = 'closed'; // 5% closed
  }
  
  // Size unit - create better variation using index
  let sizeUnit;
  // Check propertyType explicitly (case-insensitive check)
  const isLand = propertyType && propertyType.toLowerCase() === 'land';
  
  if (isLand) {
    // Land can use sqm, dunam, or feddan - ensure proper distribution
    // Use index to cycle: 0=sqm, 1=dunam, 2=feddan, repeat
    const landUnits = ['sqm', 'dunam', 'feddan'];
    const unitIndex = (index - 1) % landUnits.length;
    sizeUnit = landUnits[unitIndex];
    // Add some randomness: 20% chance to use a different unit from the cycle
    if (Math.random() < 0.2) {
      const randomIndex = Math.floor(Math.random() * landUnits.length);
      sizeUnit = landUnits[randomIndex];
    }
    // Ensure sizeUnit is explicitly set (not undefined)
    if (!sizeUnit) {
      sizeUnit = 'dunam'; // Default to dunam for land if somehow undefined
    }
  } else {
    // Other property types: cycle through units for better distribution
    const otherUnits = ['sqm', 'dunam', 'sqft', 'sqyd'];
    const unitIndex = (index - 1) % otherUnits.length;
    sizeUnit = otherUnits[unitIndex];
    // Ensure sizeUnit is explicitly set
    if (!sizeUnit) {
      sizeUnit = 'sqm'; // Default to sqm for other types if somehow undefined
    }
  }
  
  // Size based on unit
  let size = 0;
  if (sizeUnit === 'sqm') {
    if (propertyType === 'Land') {
      size = Math.floor(Math.random() * 5000) + 500; // 500-5500 sqm for land (larger plots)
    } else {
      size = Math.floor(Math.random() * 500) + 50; // 50-550 sqm for buildings
    }
  } else if (sizeUnit === 'dunam') {
    if (propertyType === 'Land') {
      size = Math.floor(Math.random() * 20) + 1; // 1-20 dunam for land
    } else {
      size = Math.floor(Math.random() * 10) + 1; // 1-10 dunam for other types
    }
  } else if (sizeUnit === 'sqft') {
    size = Math.floor(Math.random() * 5000) + 500; // 500-5500 sqft
  } else if (sizeUnit === 'sqyd') {
    size = Math.floor(Math.random() * 500) + 50; // 50-550 sqyd
  } else if (sizeUnit === 'feddan') {
    size = Math.floor(Math.random() * 10) + 1; // 1-10 feddan (for large land)
  }
  
  // Price based on property type and status
  let price = 0;
  if (propertyType === 'Land') {
    price = status === 'sale' ? Math.floor(Math.random() * 50000) + 10000 : Math.floor(Math.random() * 5000) + 1000;
  } else if (propertyType === 'Commercial' || propertyType === 'Office') {
    price = status === 'sale' ? Math.floor(Math.random() * 200000) + 50000 : Math.floor(Math.random() * 10000) + 2000;
  } else {
    price = status === 'sale' ? Math.floor(Math.random() * 300000) + 50000 : Math.floor(Math.random() * 2000) + 500;
  }
  
  // Bedrooms and bathrooms - hide for Land, Commercial, Office
  let bedrooms = 0;
  let bathrooms = 0;
  if (propertyType !== 'Land' && propertyType !== 'Commercial' && propertyType !== 'Office') {
    bedrooms = Math.floor(Math.random() * 5) + 1; // 1-5 bedrooms
    bathrooms = propertyType === 'Holiday Home' ? Math.floor(Math.random() * 4) + 1 : Math.floor(Math.random() * 3) + 1;
  } else if (propertyType === 'Commercial' || propertyType === 'Office') {
    bathrooms = Math.random() > 0.3 ? Math.floor(Math.random() * 3) + 1 : 0; // Optional for Commercial/Office
  }
  
  // Keywords
  const keywords = propertyKeywords[propertyType];
  const selectedKeywords = keywords.slice(0, Math.floor(Math.random() * 3) + 2).join(', ');
  
  // Contact info - create variation: some without email (about 30% - use index for better distribution)
  // Every 3rd listing from index 3, 6, 9, etc. will have no email
  const hasEmail = (index % 10) !== 3 && (index % 10) !== 7 && Math.random() > 0.2;
  const agentEmail = hasEmail ? (isAdmin ? adminUser?.email : agent?.email) : null;
  // Some without phone/WhatsApp too (less common - about 10%)
  const hasPhone = Math.random() > 0.1;
  const agentNumber = hasPhone ? (isAdmin ? adminUser?.phone : agent?.phone) : null;
  const agentWhatsapp = hasPhone ? (isAdmin ? adminUser?.whatsapp : agent?.whatsapp) : null;
  
  return {
    propertyId: `TEST-${Date.now()}-${index}`,
    propertyType,
    propertyKeyword: selectedKeywords,
    propertyDesc: `Test listing ${index} - ${propertyType} in ${city}. This is a test property created for testing purposes.`,
    description: `Test listing ${index} - ${propertyType} in ${city}. This is a test property created for testing purposes.`,
    propertyPrice: price,
    currency: 'USD',
    status,
    rentType: status === 'rent' ? ['monthly', 'yearly', 'weekly'][Math.floor(Math.random() * 3)] : undefined,
    bedrooms,
    bathrooms,
    size,
    squareFootage: size,
    sizeUnit: sizeUnit || (propertyType && propertyType.toLowerCase() === 'land' ? 'dunam' : 'sqm'), // Explicitly set, with fallback
    furnished: propertyType !== 'Land' ? Math.random() > 0.5 : false,
    garages: propertyType !== 'Land' ? Math.random() > 0.5 : false,
    garageSize: propertyType !== 'Land' && Math.random() > 0.5 ? Math.floor(Math.random() * 3) + 1 : 0,
    yearBuilt: propertyType !== 'Land' ? Math.floor(Math.random() * 30) + 1995 : undefined,
    floor: propertyType === 'Apartment' || propertyType === 'Office' ? Math.floor(Math.random() * 10) + 1 : undefined,
    amenities: propertyType !== 'Land' ? ['Air Conditioning', 'Balcony', 'Elevator'].slice(0, Math.floor(Math.random() * 3) + 1) : [],
    address: `${Math.floor(Math.random() * 999) + 1} Test Street, ${city}`,
    address_ar: `${Math.floor(Math.random() * 999) + 1} شارع الاختبار، ${city}`,
    country: 'Syria',
    city,
    state: city,
    neighborhood: `Test Neighborhood ${Math.floor(Math.random() * 10) + 1}`,
    neighborhood_ar: `حي الاختبار ${Math.floor(Math.random() * 10) + 1}`,
    mapLocation: `https://maps.google.com/?q=${33 + Math.random()},${36 + Math.random()}`,
    agent: isAdmin ? 'admin@aqaargate.com' : (agent?.email || agent?.username || 'Test Agent'),
    agentId: isAdmin ? null : agent?._id,
    agentEmail,
    agentNumber,
    agentWhatsapp,
    approvalStatus,
    isSold: false,
    offer: Math.random() > 0.8, // 20% have offers
    visitCount: Math.floor(Math.random() * 100),
    notes: `Test listing ${index} for ${propertyType}`,
    notes_ar: `إعلان تجريبي ${index} لـ ${propertyType}`,
    imageNames: [],
    images: []
  };
};

const clearAndSeed = async () => {
  try {
    const { finalURI, databaseName, NODE_ENV } = getDatabaseConnection();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🧹 Clear & Seed Test Listings');
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
    
    // Get existing agents and admins
    console.log('📋 Fetching existing agents and admins...');
    const agents = await User.find({ role: 'agent', isBlocked: { $ne: true } }).lean();
    const admins = await User.find({ role: 'admin' }).lean();
    
    console.log(`   ✅ Found ${agents.length} agent(s)`);
    console.log(`   ✅ Found ${admins.length} admin(s)`);
    
    if (agents.length === 0 && admins.length === 0) {
      console.error('❌ ERROR: No agents or admins found! Please create at least one agent or admin first.');
      await mongoose.connection.close();
      process.exit(1);
    }
    
    // Clear all listings
    console.log('\n🗑️  Clearing all listings...');
    const deleteResult = await Listing.deleteMany({});
    console.log(`   ✅ Deleted ${deleteResult.deletedCount} listing(s)\n`);
    
    // Create 50 listings
    console.log('🌱 Creating 50 test listings...\n');
    const listings = [];
    const adminUser = admins[0] || null;
    
    // 40 listings by agents - ensure each property type appears multiple times
    // Distribute property types evenly: 6 types, so ~6-7 of each type
    const propertyTypeDistribution = [];
    for (let i = 0; i < 40; i++) {
      propertyTypeDistribution.push(propertyTypes[i % propertyTypes.length]);
    }
    // Shuffle for more randomness
    for (let i = propertyTypeDistribution.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [propertyTypeDistribution[i], propertyTypeDistribution[j]] = [propertyTypeDistribution[j], propertyTypeDistribution[i]];
    }
    
    for (let i = 1; i <= 40; i++) {
      const agentIndex = (i - 1) % agents.length;
      const agent = agents[agentIndex];
      // Use pre-distributed property type for better variation
      const listing = generateListing(i, false, agent, null, propertyTypeDistribution[i - 1]);
      listings.push(listing);
    }
    
    // 10 listings by admin - ensure variety with different property types
    const adminPropertyTypes = [];
    for (let i = 0; i < 10; i++) {
      adminPropertyTypes.push(propertyTypes[i % propertyTypes.length]);
    }
    // Shuffle
    for (let i = adminPropertyTypes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [adminPropertyTypes[i], adminPropertyTypes[j]] = [adminPropertyTypes[j], adminPropertyTypes[i]];
    }
    
    for (let i = 41; i <= 50; i++) {
      if (!adminUser) {
        console.warn(`⚠️  No admin found, skipping admin listing ${i}`);
        continue;
      }
      const listing = generateListing(i, true, null, adminUser, adminPropertyTypes[i - 41]);
      listings.push(listing);
    }
    
    // Insert all listings
    const insertedListings = await Listing.insertMany(listings);
    
    console.log(`✅ Successfully created ${insertedListings.length} listings!\n`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Summary:');
    console.log(`   • Total Listings: ${insertedListings.length}`);
    console.log(`   • By Agents: ${listings.filter(l => l.agentId).length}`);
    console.log(`   • By Admin: ${listings.filter(l => !l.agentId).length}`);
    
    // Count by property type
    const typeCounts = {};
    insertedListings.forEach(listing => {
      typeCounts[listing.propertyType] = (typeCounts[listing.propertyType] || 0) + 1;
    });
    console.log('\n   📦 By Property Type:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`      • ${type}: ${count}`);
    });
    
    // Count by size unit
    const unitCounts = {};
    insertedListings.forEach(listing => {
      unitCounts[listing.sizeUnit] = (unitCounts[listing.sizeUnit] || 0) + 1;
    });
    console.log('\n   📏 By Size Unit:');
    Object.entries(unitCounts).forEach(([unit, count]) => {
      console.log(`      • ${unit}: ${count}`);
    });
    
    // Count without email
    const withoutEmail = insertedListings.filter(l => !l.agentEmail).length;
    console.log(`\n   📧 Without Email: ${withoutEmail} (for testing email button hiding)`);
    
    // Count by city
    const cityCounts = {};
    insertedListings.forEach(listing => {
      cityCounts[listing.city] = (cityCounts[listing.city] || 0) + 1;
    });
    console.log('\n   🏙️  By City:');
    Object.entries(cityCounts).forEach(([city, count]) => {
      console.log(`      • ${city}: ${count}`);
    });
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('✅ Database seeding completed successfully!');
    console.log('🧪 You can now test:');
    console.log('   • Properties by Admin tab');
    console.log('   • Email button visibility (some listings have no email)');
    console.log('   • Different size units');
    console.log('   • Different property types');
    console.log('   • Different cities in Syria\n');
    
    await mongoose.connection.close();
    console.log('✅ Database connection closed.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

// Run the script
clearAndSeed();

