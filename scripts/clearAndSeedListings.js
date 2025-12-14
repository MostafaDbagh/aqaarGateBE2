/**
 * Script to clear all listings and add 100 new listings with USD prices only
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

// Syrian cities with coordinates for Google Maps
const syrianCities = [
  { name: 'Damascus', coords: '33.5138,36.2765', neighborhoods: ['Old City', 'Mazzeh', 'Kafr Sousa', 'Mezzeh', 'Downtown'] },
  { name: 'Aleppo', coords: '36.2021,37.1343', neighborhoods: ['Old City', 'Aziziyeh', 'Suleimaniyeh', 'New Aleppo', 'Al-Shaar'] },
  { name: 'Latakia', coords: '35.5167,35.7833', neighborhoods: ['Corniche', 'Downtown', 'Al-Samra', 'Al-Aziziyah', 'Al-Midan'] },
  { name: 'Homs', coords: '34.7339,36.7139', neighborhoods: ['Old City', 'Al-Waer', 'Al-Hamidiyah', 'Al-Ghouta', 'Al-Khalidiyah'] },
  { name: 'Hama', coords: '35.1313,36.7558', neighborhoods: ['Old City', 'Al-Hamidiyah', 'Al-Shaar', 'Al-Midan', 'Al-Kornish'] },
  { name: 'Tartus', coords: '34.8886,35.8864', neighborhoods: ['Corniche', 'Old City', 'Al-Samra', 'Al-Aziziyah', 'Al-Midan'] },
  { name: 'Deir ez-Zur', coords: '35.3333,40.1500', neighborhoods: ['Old City', 'Al-Joura', 'Al-Qusour', 'Al-Rashidiyah', 'Al-Sinaa'] },
  { name: 'Daraa', coords: '32.6189,36.1019', neighborhoods: ['Old City', 'Al-Mahatta', 'Al-Sad Road', 'Al-Kashef', 'Al-Balad'] },
  { name: 'Idlib', coords: '35.9333,36.6333', neighborhoods: ['City Center', 'Al-Midan', 'Al-Shaar', 'Al-Hamidiyah', 'Al-Kashef'] },
  { name: 'As-Suwayda', coords: '32.7089,36.5694', neighborhoods: ['City Center', 'Al-Midan', 'Al-Shaar', 'Al-Hamidiyah', 'Al-Kashef'] },
  { name: 'Raqqah', coords: '35.9500,39.0167', neighborhoods: ['City Center', 'Al-Midan', 'Al-Shaar', 'Al-Hamidiyah', 'Al-Kashef'] }
];

// Property types distribution (100 listings total)
const propertyTypes = [
  { type: 'Apartment', count: 30 },
  { type: 'Villa/farms', count: 20 },
  { type: 'Office', count: 15 },
  { type: 'Commercial', count: 15 },
  { type: 'Land', count: 12 },
  { type: 'House', count: 5 },
  { type: 'Holiday Home', count: 3 }
];

// Generate random number between min and max
const random = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Generate random price in USD based on property type
const getPrice = (propertyType, status) => {
  const basePrices = {
    'Villa/farms': { sale: [150000, 500000], rent: [800, 3000] },
    'Apartment': { sale: [30000, 150000], rent: [200, 1500] },
    'Office': { sale: [50000, 200000], rent: [400, 2000] },
    'Land': { sale: [20000, 100000], rent: [100, 800] },
    'Commercial': { sale: [40000, 300000], rent: [500, 2500] },
    'House': { sale: [80000, 250000], rent: [500, 2000] },
    'Holiday Home': { sale: [0, 0], rent: [300, 2000] } // Holiday homes are rent only
  };
  
  const ranges = basePrices[propertyType] || { sale: [30000, 150000], rent: [200, 1500] };
  const range = ranges[status] || ranges.sale;
  return random(range[0], range[1]);
};

// Generate property details based on type
const getPropertyDetails = (propertyType, index) => {
  const city = syrianCities[index % syrianCities.length];
  const neighborhood = city.neighborhoods[index % city.neighborhoods.length];
  
  const details = {
    'Villa/farms': {
      bedrooms: random(4, 7),
      bathrooms: random(3, 5),
      size: random(300, 800),
      landArea: random(500, 2000),
      furnished: index % 2 === 0,
      garages: true,
      garageSize: random(2, 4),
      yearBuilt: random(2010, 2023),
      floor: 1,
      amenities: ['Parking', 'Swimming pool', 'Gym', 'Security cameras', 'Solar energy system', 'Balcony']
    },
    'Apartment': {
      bedrooms: random(1, 4),
      bathrooms: random(1, 3),
      size: random(80, 200),
      landArea: null,
      furnished: index % 3 !== 0,
      garages: index % 2 === 0,
      garageSize: random(0, 1),
      yearBuilt: random(2015, 2024),
      floor: random(1, 10),
      amenities: ['Parking', 'Lift', 'A/C', 'Balcony', 'Fiber internet']
    },
    'Office': {
      bedrooms: 0,
      bathrooms: random(1, 3),
      size: random(50, 300),
      landArea: null,
      furnished: index % 2 === 0,
      garages: true,
      garageSize: random(1, 3),
      yearBuilt: random(2010, 2023),
      floor: random(1, 15),
      amenities: ['Parking', 'Lift', 'A/C', 'Security cameras', 'Fiber internet', 'Reception (nator)']
    },
    'Land': {
      bedrooms: 0,
      bathrooms: 0,
      size: random(200, 1000),
      landArea: random(200, 1000),
      furnished: false,
      garages: false,
      garageSize: 0,
      yearBuilt: null,
      floor: null,
      amenities: []
    },
    'Commercial': {
      bedrooms: 0,
      bathrooms: random(1, 2),
      size: random(40, 200),
      landArea: null,
      furnished: index % 3 === 0,
      garages: index % 2 === 0,
      garageSize: random(0, 2),
      yearBuilt: random(2012, 2023),
      floor: random(0, 5),
      amenities: ['Parking', 'A/C', 'Security cameras', 'Fiber internet']
    },
    'House': {
      bedrooms: random(3, 5),
      bathrooms: random(2, 4),
      size: random(150, 400),
      landArea: random(200, 600),
      furnished: index % 2 === 0,
      garages: true,
      garageSize: random(1, 2),
      yearBuilt: random(2010, 2023),
      floor: random(1, 3),
      amenities: ['Parking', 'A/C', 'Balcony', 'Solar energy system']
    },
    'Holiday Home': {
      bedrooms: random(2, 4),
      bathrooms: random(2, 3),
      size: random(100, 250),
      landArea: null,
      furnished: true, // Always furnished
      garages: index % 2 === 0,
      garageSize: random(0, 1),
      yearBuilt: random(2015, 2024),
      floor: random(1, 3),
      amenities: ['Parking', 'A/C', 'Balcony', 'Fiber internet', 'Security cameras']
    }
  };
  
  return { ...details[propertyType], city, neighborhood };
};

// Generate property descriptions
const getDescriptions = (propertyType, city, neighborhood) => {
  const descriptions = {
    'Villa/farms': {
      en: `Beautiful ${propertyType.toLowerCase()} located in ${neighborhood}, ${city}. Spacious property with modern amenities, perfect for families seeking luxury living.`,
      ar: `فيلا/مزرعة جميلة تقع في ${neighborhood}، ${city}. عقار واسع مع مرافق حديثة، مثالي للعائلات التي تبحث عن سكن فاخر.`
    },
    'Apartment': {
      en: `Modern apartment in ${neighborhood}, ${city}. Well-maintained property with excellent location and convenient access to city amenities.`,
      ar: `شقة عصرية في ${neighborhood}، ${city}. عقار محافظ عليه جيداً مع موقع ممتاز ووصول مريح لمرافق المدينة.`
    },
    'Office': {
      en: `Professional office space in ${neighborhood}, ${city}. Ideal for businesses looking for a prime location with modern facilities.`,
      ar: `مساحة مكتبية احترافية في ${neighborhood}، ${city}. مثالي للشركات التي تبحث عن موقع ممتاز مع مرافق حديثة.`
    },
    'Land': {
      en: `Prime land plot in ${neighborhood}, ${city}. Perfect for development or investment. Clear title and excellent location.`,
      ar: `قطعة أرض ممتازة في ${neighborhood}، ${city}. مثالية للتطوير أو الاستثمار. سند واضح وموقع ممتاز.`
    },
    'Commercial': {
      en: `Commercial space in ${neighborhood}, ${city}. High-traffic location perfect for retail or business operations.`,
      ar: `مساحة تجارية في ${neighborhood}، ${city}. موقع عالي الحركة مثالي للبيع بالتجزئة أو العمليات التجارية.`
    },
    'House': {
      en: `Charming house in ${neighborhood}, ${city}. Spacious family home with garden and modern amenities.`,
      ar: `منزل ساحر في ${neighborhood}، ${city}. منزل عائلي واسع مع حديقة ومرافق حديثة.`
    },
    'Holiday Home': {
      en: `Beautiful holiday home in ${neighborhood}, ${city}. Fully furnished vacation rental perfect for short-term stays.`,
      ar: `بيت عطلة جميل في ${neighborhood}، ${city}. إيجار عطلات مفروش بالكامل مثالي للإقامات قصيرة المدى.`
    }
  };
  
  return descriptions[propertyType] || descriptions['Apartment'];
};

async function clearAndSeedListings() {
  try {
    const { finalURI, databaseName, NODE_ENV } = getDatabaseConnection();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🗑️  Clearing All Listings & Adding 100 New Listings');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`💾 Database: ${databaseName}`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    // Connect to MongoDB
    await mongoose.connect(finalURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB');

    // Step 1: Clear all listings
    console.log('\n🗑️  Step 1: Clearing all existing listings...');
    const deleteResult = await Listing.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} existing listings`);

    // Step 2: Find or create a default agent
    console.log('\n👤 Step 2: Finding or creating agent...');
    let agent = await User.findOne({ role: 'agent' });
    
    if (!agent) {
      console.log('⚠️  No agent found. Creating default agent...');
      const bcryptjs = require('bcryptjs');
      agent = new User({
        username: 'default_agent',
        email: 'agent@aqaargate.com',
        password: bcryptjs.hashSync('Default123!@#', 10),
        role: 'agent',
        phone: '+963999000000',
        whatsapp: '+963999000000',
        company: 'AqaarGate Real Estate',
        isBlocked: false,
        isTrial: false,
        hasUnlimitedPoints: true
      });
      await agent.save();
      console.log(`✅ Agent created: ${agent.email}`);
    } else {
      console.log(`✅ Agent found: ${agent.email} (ID: ${agent._id})`);
    }

    // Step 3: Create 100 new listings with USD prices only
    console.log('\n📝 Step 3: Creating 100 new listings with USD prices only...');
    let totalCreated = 0;
    let cityIndex = 0;

    for (const { type, count } of propertyTypes) {
      console.log(`\n📝 Creating ${count} ${type} listings...`);
      
      for (let i = 0; i < count; i++) {
        const details = getPropertyDetails(type, cityIndex);
        const city = details.city;
        const neighborhood = details.neighborhood;
        
        // Mix of sale and rent (but Holiday Home is always rent)
        const status = type === 'Holiday Home' ? 'rent' : (i % 3 === 0 ? 'rent' : 'sale');
        const price = getPrice(type, status);
        
        // ALL PRICES IN USD ONLY
        const currency = 'USD';
        
        const descriptions = getDescriptions(type, city.name, neighborhood);
        
        // Generate map location (slight variation in coordinates)
        const [lat, lng] = city.coords.split(',').map(Number);
        const latVariation = (Math.random() - 0.5) * 0.1; // ±0.05 degrees
        const lngVariation = (Math.random() - 0.5) * 0.1;
        const mapCoords = `${(lat + latVariation).toFixed(4)},${(lng + lngVariation).toFixed(4)}`;
        const mapLocation = `https://www.google.com/maps?q=${mapCoords}&hl=en&z=15&output=embed`;
        
        const propertyId = `PROP_${type.replace('/', '_')}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
        
        const listingData = {
          propertyId,
          propertyType: type,
          propertyKeyword: `${type} in ${neighborhood}`,
          propertyDesc: descriptions.en,
          description_ar: descriptions.ar,
          propertyPrice: price,
          currency, // USD ONLY
          status,
          rentType: status === 'rent' ? (i % 2 === 0 ? 'monthly' : 'yearly') : undefined,
          bedrooms: details.bedrooms,
          bathrooms: details.bathrooms,
          size: details.size,
          landArea: details.landArea,
          furnished: details.furnished,
          garages: details.garages,
          garageSize: details.garageSize || 0,
          yearBuilt: details.yearBuilt,
          floor: details.floor,
          amenities: details.amenities,
          address: `${random(1, 999)} ${neighborhood} Street, ${city.name}`,
          address_ar: `شارع ${neighborhood} ${random(1, 999)}، ${city.name}`,
          country: 'Syria',
          city: city.name,
          state: city.name,
          neighborhood,
          neighborhood_ar: neighborhood,
          mapLocation,
          agent: agent.username || agent.email,
          agentId: agent._id,
          agentEmail: agent.email,
          agentNumber: agent.phone || '',
          agentWhatsapp: agent.whatsapp || '',
          approvalStatus: 'approved',
          isSold: false,
          isDeleted: false,
          notes: `Listing created by seed script - ${type} in ${city.name}`,
          notes_ar: `إعلان تم إنشاؤه بواسطة سكريبت البذور - ${type} في ${city.name}`,
          images: [],
          imageNames: []
        };

        try {
          const listing = new Listing(listingData);
          await listing.save();
          totalCreated++;
          console.log(`   ✅ Created ${type} #${i + 1}: ${propertyId.substring(0, 30)}... - ${city.name} - USD $${price.toLocaleString()} (${status})`);
        } catch (error) {
          if (error.code === 11000) {
            // Duplicate propertyId, try again with new timestamp
            listingData.propertyId = `PROP_${type.replace('/', '_')}_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 9)}`;
            const listing = new Listing(listingData);
            await listing.save();
            totalCreated++;
            console.log(`   ✅ Created ${type} #${i + 1}: ${listingData.propertyId.substring(0, 30)}... - ${city.name}`);
          } else {
            console.error(`   ❌ Error creating ${type} #${i + 1}:`, error.message);
          }
        }
        
        cityIndex++;
      }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Database Reset & Seeding Complete!');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`🗑️  Deleted: ${deleteResult.deletedCount} listings`);
    console.log(`📝 Created: ${totalCreated} new listings`);
    console.log(`💰 Currency: ALL PRICES IN USD ONLY`);
    console.log(`👤 Agent: ${agent.email}`);
    console.log(`💾 Database: ${databaseName}`);
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  }
}

// Run the script
clearAndSeedListings();

