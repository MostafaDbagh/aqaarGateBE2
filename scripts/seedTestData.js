/**
 * Seed test data for UI and AI search testing
 * - 25 villas for rent (monthly and daily)
 * - 100 diverse listings in different Syrian cities
 * All under agent: mostafa@burjx.com
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Listing = require('../models/listing.model');
const User = require('../models/user.model');
const { faker } = require('@faker-js/faker');

const getDatabaseConnection = () => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const isProduction = NODE_ENV === 'production';
  let mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;
  
  if (!mongoURI) {
    throw new Error('MONGO_URI is not defined!');
  }
  
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
  return { finalURI, databaseName };
};

// Syrian cities
const SYRIAN_CITIES = [
  'Damascus',
  'Aleppo',
  'Homs',
  'Latakia',
  'Tartus',
  'Daraa',
  'Hama',
  'Idlib',
  'Deir ez-Zur',
  'As-Suwayda',
  'Quneitra',
  'Raqqa',
  'Hasakah'
];

// Property types
const PROPERTY_TYPES = [
  'Apartment',
  'Villa/farms',
  'Office',
  'Commercial',
  'Land',
  'Holiday Home'
];

// Amenities pool
const AMENITIES_POOL = [
  'Parking',
  'A/C',
  'Lift',
  'Balcony',
  'Swimming pool',
  'Security cameras',
  'Solar energy system',
  'Fiber internet',
  'Basic internet',
  'Gym',
  'Reception (nator)',
  'Fire alarms'
];

// Neighborhoods by city (for realistic data)
const NEIGHBORHOODS = {
  'Damascus': ['Mazzeh', 'Kafr Sousa', 'Mezzeh', 'Abu Rummaneh', 'Malki', 'Barzeh', 'Dummar'],
  'Aleppo': ['Aziziyah', 'Suleimaniyah', 'Jdeideh', 'Old City', 'Al-Midan', 'Al-Sabil'],
  'Homs': ['Al-Waer', 'Al-Hamidiyah', 'Al-Khalidiyah', 'Al-Qusour', 'Al-Bayada'],
  'Latakia': ['Al-Aziziyah', 'Al-Sinaa', 'Al-Quds', 'Al-Raml', 'Al-Sahel'],
  'Tartus': ['Al-Mina', 'Al-Qadmous', 'Al-Safsafeh', 'Al-Hamidiyah'],
  'Daraa': ['Al-Manshiyah', 'Al-Balad', 'Al-Sad', 'Al-Mahatta'],
  'Hama': ['Al-Hamidiyah', 'Al-Shaar', 'Al-Midan', 'Al-Khalidiyah'],
  'Idlib': ['Al-Midan', 'Al-Sinaa', 'Al-Qusour', 'Al-Balad'],
  'Deir ez-Zur': ['Al-Qusour', 'Al-Joura', 'Al-Rashidiyah', 'Al-Hamidiyah'],
  'As-Suwayda': ['Al-Midan', 'Al-Balad', 'Al-Qusour'],
  'Quneitra': ['Al-Midan', 'Al-Balad'],
  'Raqqa': ['Al-Midan', 'Al-Balad', 'Al-Qusour'],
  'Hasakah': ['Al-Midan', 'Al-Balad', 'Al-Qusour']
};

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function seedTestData() {
  let connection;
  try {
    const { finalURI, databaseName } = getDatabaseConnection();
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🌱 إضافة بيانات تجريبية للاختبار');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`💾 قاعدة البيانات: ${databaseName}\n`);
    
    connection = await mongoose.connect(finalURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ متصل بقاعدة البيانات\n');
    
    // Find or create agent
    console.log('👤 البحث عن الوكيل mostafa@burjx.com...');
    let agent = await User.findOne({ email: 'mostafa@burjx.com' });
    
    if (!agent) {
      console.log('➕ إنشاء وكيل جديد...');
      agent = await User.create({
        username: 'mostafa',
        email: 'mostafa@burjx.com',
        password: 'Test123!@#', // You should change this
        role: 'agent',
        description: 'Test agent for development',
        company: 'BurjX Real Estate',
        phone: '+963991234567',
        whatsapp: '+963991234567'
      });
      console.log('✅ تم إنشاء الوكيل\n');
    } else {
      console.log('✅ تم العثور على الوكيل\n');
    }
    
    const listings = [];
    
    // 1. Add 25 villas for rent (monthly and daily)
    console.log('🏡 إضافة 25 فيلا للإيجار (شهري ويومي)...');
    for (let i = 0; i < 25; i++) {
      const city = getRandomElement(SYRIAN_CITIES);
      const rentType = i < 15 ? 'monthly' : 'daily'; // 15 monthly, 10 daily
      const price = rentType === 'daily' 
        ? faker.number.int({ min: 50, max: 500 }) // Daily rent: $50-$500
        : faker.number.int({ min: 500, max: 5000 }); // Monthly rent: $500-$5000
      
      listings.push({
        propertyId: `VILLA-${rentType.toUpperCase()}-${Date.now()}-${i}`,
        propertyType: 'Villa/farms',
        propertyKeyword: `Villa for ${rentType} rent in ${city}`,
        propertyDesc: faker.lorem.paragraph(),
        propertyPrice: price,
        currency: 'USD',
        status: 'rent',
        rentType: rentType,
        bedrooms: faker.number.int({ min: 2, max: 6 }),
        bathrooms: faker.number.int({ min: 2, max: 5 }),
        size: faker.number.int({ min: 200, max: 800 }),
        furnished: faker.datatype.boolean(),
        garages: faker.datatype.boolean(),
        garageSize: faker.datatype.boolean() ? faker.number.int({ min: 1, max: 3 }) : undefined,
        yearBuilt: faker.number.int({ min: 1990, max: 2023 }),
        floor: undefined, // Villas don't have floors
        amenities: getRandomElements(AMENITIES_POOL, faker.number.int({ min: 2, max: 6 })),
        address: faker.location.streetAddress(),
        country: 'Syria',
        city: city,
        neighborhood: getRandomElement(NEIGHBORHOODS[city] || ['Downtown']),
        agent: agent.username,
        agentId: agent._id,
        agentEmail: agent.email,
        agentNumber: agent.phone || '+963991234567',
        agentWhatsapp: agent.whatsapp || '+963991234567',
        images: [],
        imageNames: [],
        approvalStatus: 'approved',
        isSold: false,
        isDeleted: false,
        visitCount: faker.number.int({ min: 0, max: 500 }),
        createdAt: faker.date.recent({ days: 90 }),
        updatedAt: faker.date.recent({ days: 30 }),
      });
    }
    console.log(`✅ تم إضافة ${listings.length} فيلا\n`);
    
    // 2. Add 100 diverse listings
    console.log('🏘️  إضافة 100 إعلان متنوع...');
    const propertyTypeDistribution = {
      'Apartment': 40,      // 40 apartments
      'Villa/farms': 10,     // 10 more villas (for sale)
      'Office': 15,          // 15 offices
      'Commercial': 15,     // 15 commercial
      'Land': 15,           // 15 land plots
      'Holiday Home': 5     // 5 holiday homes
    };
    
    let listingIndex = 0;
    for (const [propertyType, count] of Object.entries(propertyTypeDistribution)) {
      for (let i = 0; i < count; i++) {
        const city = getRandomElement(SYRIAN_CITIES);
        const status = faker.helpers.arrayElement(['sale', 'rent']);
        const currency = faker.helpers.arrayElement(['USD', 'SYP']);
        
        // Price ranges based on property type and status
        let price;
        if (propertyType === 'Land') {
          price = currency === 'USD' 
            ? faker.number.int({ min: 10000, max: 500000 })
            : faker.number.int({ min: 50000000, max: 500000000 });
        } else if (propertyType === 'Commercial') {
          price = currency === 'USD'
            ? faker.number.int({ min: 50000, max: 1000000 })
            : faker.number.int({ min: 100000000, max: 5000000000 });
        } else if (propertyType === 'Office') {
          price = status === 'rent'
            ? (currency === 'USD' ? faker.number.int({ min: 200, max: 2000 }) : faker.number.int({ min: 2000000, max: 20000000 }))
            : (currency === 'USD' ? faker.number.int({ min: 50000, max: 500000 }) : faker.number.int({ min: 50000000, max: 500000000 }));
        } else if (propertyType === 'Holiday Home') {
          price = currency === 'USD'
            ? faker.number.int({ min: 50, max: 300 }) // Daily rent
            : faker.number.int({ min: 50000, max: 300000 });
        } else {
          // Apartment or Villa
          price = status === 'rent'
            ? (currency === 'USD' ? faker.number.int({ min: 200, max: 2000 }) : faker.number.int({ min: 2000000, max: 20000000 }))
            : (currency === 'USD' ? faker.number.int({ min: 20000, max: 500000 }) : faker.number.int({ min: 20000000, max: 500000000 }));
        }
        
        // Holiday homes are always for rent
        const finalStatus = propertyType === 'Holiday Home' ? 'rent' : status;
        
        const listing = {
          propertyId: `PROP-${propertyType.toUpperCase().replace('/', '-')}-${Date.now()}-${listingIndex++}`,
          propertyType: propertyType,
          propertyKeyword: `${propertyType} ${finalStatus === 'sale' ? 'for sale' : 'for rent'} in ${city}`,
          propertyDesc: faker.lorem.paragraph(),
          propertyPrice: price,
          currency: currency,
          status: finalStatus,
          bedrooms: propertyType === 'Land' || propertyType === 'Commercial' ? 0 : faker.number.int({ min: 1, max: 5 }),
          bathrooms: propertyType === 'Land' || propertyType === 'Commercial' ? 0 : faker.number.int({ min: 1, max: 4 }),
          size: propertyType === 'Land' 
            ? faker.number.int({ min: 500, max: 10000 }) // Land area in square meters
            : faker.number.int({ min: 50, max: 500 }),
          furnished: propertyType === 'Land' ? false : faker.datatype.boolean(),
          garages: propertyType === 'Land' ? false : faker.datatype.boolean(),
          garageSize: (propertyType !== 'Land' && faker.datatype.boolean()) ? faker.number.int({ min: 1, max: 3 }) : undefined,
          yearBuilt: propertyType === 'Land' ? undefined : faker.number.int({ min: 1980, max: 2023 }),
          floor: propertyType === 'Apartment' ? faker.number.int({ min: 1, max: 10 }) : undefined,
          amenities: propertyType === 'Land' ? [] : getRandomElements(AMENITIES_POOL, faker.number.int({ min: 1, max: 5 })),
          address: faker.location.streetAddress(),
          country: 'Syria',
          city: city,
          neighborhood: getRandomElement(NEIGHBORHOODS[city] || ['Downtown']),
          agent: agent.username,
          agentId: agent._id,
          agentEmail: agent.email,
          agentNumber: agent.phone || '+963991234567',
          agentWhatsapp: agent.whatsapp || '+963991234567',
          images: [],
          imageNames: [],
          approvalStatus: 'approved',
          isSold: false,
          isDeleted: false,
          visitCount: faker.number.int({ min: 0, max: 1000 }),
          createdAt: faker.date.recent({ days: 180 }),
          updatedAt: faker.date.recent({ days: 60 }),
        };
        
        // Add rentType if status is rent
        if (finalStatus === 'rent') {
          if (propertyType === 'Holiday Home') {
            listing.rentType = faker.helpers.arrayElement(['daily', 'weekly']);
          } else {
            listing.rentType = faker.helpers.arrayElement(['monthly', 'yearly']);
          }
        }
        
        listings.push(listing);
      }
    }
    
    console.log(`✅ تم إضافة ${listings.length - 25} إعلان إضافي\n`);
    
    // Insert all listings
    console.log('💾 حفظ جميع الإعلانات في قاعدة البيانات...');
    await Listing.insertMany(listings);
    console.log(`✅ تم حفظ ${listings.length} إعلان بنجاح\n`);
    
    // Statistics
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 إحصائيات البيانات المضافة:');
    console.log('═══════════════════════════════════════════════════════');
    
    const stats = await Listing.aggregate([
      {
        $group: {
          _id: '$propertyType',
          count: { $sum: 1 },
          forRent: {
            $sum: { $cond: [{ $eq: ['$status', 'rent'] }, 1, 0] }
          },
          forSale: {
            $sum: { $cond: [{ $eq: ['$status', 'sale'] }, 1, 0] }
          }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    stats.forEach(stat => {
      console.log(`\n${stat._id}:`);
      console.log(`   إجمالي: ${stat.count}`);
      console.log(`   للإيجار: ${stat.forRent}`);
      console.log(`   للبيع: ${stat.forSale}`);
    });
    
    const cityStats = await Listing.aggregate([
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n\n📍 حسب المدينة:');
    cityStats.forEach(stat => {
      console.log(`   ${stat._id}: ${stat.count}`);
    });
    
    const rentTypeStats = await Listing.aggregate([
      {
        $match: { status: 'rent' }
      },
      {
        $group: {
          _id: '$rentType',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n\n💰 حسب نوع الإيجار:');
    rentTypeStats.forEach(stat => {
      console.log(`   ${stat._id || 'غير محدد'}: ${stat.count}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`✅ تم إضافة ${listings.length} إعلان بنجاح!`);
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ خطأ أثناء إضافة البيانات:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.disconnect();
      console.log('🔌 تم إغلاق الاتصال');
    }
    process.exit(0);
  }
}

seedTestData();

