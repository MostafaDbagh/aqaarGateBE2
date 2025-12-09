/**
 * Script to add a dummy apartment with Google Maps location for UI testing
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Listing = require('../models/listing.model');

const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoURI) {
  console.error('❌ MONGO_URI is not defined in environment variables!');
  console.error('Please create a .env file in the api/ directory with MONGO_URI set.');
  process.exit(1);
}

async function addDummyApartment() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ Connected to MongoDB');

    // Find a real agent to use
    const User = require('../models/user.model');
    const realAgent = await User.findOne({ role: 'agent' });
    if (!realAgent) {
      console.error('❌ No agent found in database. Please create an agent first.');
      process.exit(1);
    }
    console.log(`✅ Using agent: ${realAgent.email} (ID: ${realAgent._id})`);

    // Check if dummy apartment already exists
    const existing = await Listing.findOne({ propertyId: 'DUMMY_APARTMENT_TEST' });
    if (existing) {
      console.log('⚠️  Dummy apartment already exists. Updating it...');
      existing.propertyType = 'Apartment';
      existing.propertyKeyword = 'Modern Apartment';
      existing.propertyDesc = 'Beautiful modern apartment with great amenities and stunning views. Perfect for families looking for a comfortable living space in the heart of the city.';
      existing.description_ar = 'شقة عصرية جميلة مع مرافق رائعة وإطلالات خلابة. مثالية للعائلات التي تبحث عن مساحة معيشة مريحة في قلب المدينة.';
      existing.propertyPrice = 50000;
      existing.currency = 'USD';
      existing.status = 'sale';
      existing.bedrooms = 3;
      existing.bathrooms = 2;
      existing.size = 120;
      existing.furnished = true;
      existing.garages = true;
      existing.garageSize = 1;
      existing.yearBuilt = 2020;
      existing.floor = 5;
      existing.amenities = ['Parking', 'Lift', 'Balcony', 'A/C', 'Solar energy system'];
      existing.address = '123 Main Street, Downtown';
      existing.address_ar = 'شارع الرئيسي 123، وسط المدينة';
      existing.country = 'Syria';
      existing.city = 'Damascus';
      existing.state = 'Damascus';
      existing.neighborhood = 'Downtown';
      existing.neighborhood_ar = 'وسط المدينة';
      existing.mapLocation = '33.5138,36.2765';
      existing.agentId = realAgent._id;
      existing.agent = realAgent.username || realAgent.email;
      existing.approvalStatus = 'approved';
      existing.isDeleted = false;
      existing.notes = 'This is a test apartment for UI testing with Google Maps integration.';
      existing.notes_ar = 'هذه شقة تجريبية لاختبار واجهة المستخدم مع تكامل خرائط جوجل.';
      
      await existing.save();
      console.log('✅ Dummy apartment updated successfully!');
      console.log(`   Property ID: ${existing.propertyId}`);
      console.log(`   Map Location: ${existing.mapLocation}`);
    } else {
      // Create new dummy apartment
      const dummyApartment = new Listing({
        propertyId: 'DUMMY_APARTMENT_TEST',
        propertyType: 'Apartment',
        propertyKeyword: 'Modern Apartment',
        propertyDesc: 'Beautiful modern apartment with great amenities and stunning views. Perfect for families looking for a comfortable living space in the heart of the city.',
        description_ar: 'شقة عصرية جميلة مع مرافق رائعة وإطلالات خلابة. مثالية للعائلات التي تبحث عن مساحة معيشة مريحة في قلب المدينة.',
        propertyPrice: 50000,
        currency: 'USD',
        status: 'sale',
        bedrooms: 3,
        bathrooms: 2,
        size: 120,
        furnished: true,
        garages: true,
        garageSize: 1,
        yearBuilt: 2020,
        floor: 5,
        amenities: ['Parking', 'Lift', 'Balcony', 'A/C', 'Solar energy system'],
        address: '123 Main Street, Downtown',
        address_ar: 'شارع الرئيسي 123، وسط المدينة',
        country: 'Syria',
        city: 'Damascus',
        state: 'Damascus',
        neighborhood: 'Downtown',
        neighborhood_ar: 'وسط المدينة',
        mapLocation: '33.5138,36.2765',
        agentId: realAgent._id,
        agent: realAgent.username || realAgent.email,
        approvalStatus: 'approved',
        isDeleted: false,
        notes: 'This is a test apartment for UI testing with Google Maps integration.',
        notes_ar: 'هذه شقة تجريبية لاختبار واجهة المستخدم مع تكامل خرائط جوجل.',
        images: [],
        imageNames: []
      });

      await dummyApartment.save();
      console.log('✅ Dummy apartment created successfully!');
      console.log(`   Property ID: ${dummyApartment.propertyId}`);
      console.log(`   Map Location: ${dummyApartment.mapLocation}`);
    }

    console.log('\n📋 Dummy Apartment Details:');
    console.log('   - Type: Apartment');
    console.log('   - Bedrooms: 3');
    console.log('   - Bathrooms: 2');
    console.log('   - Size: 120 sqm');
    console.log('   - Price: $50,000 USD');
    console.log('   - Location: Damascus, Syria');
    console.log('   - Map Location: Google Maps embed URL included');
    console.log('   - Status: Approved (visible in listings)');

  } catch (error) {
    console.error('❌ Error adding dummy apartment:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  }
}

// Run the script
addDummyApartment();

