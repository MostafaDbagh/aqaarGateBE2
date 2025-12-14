/**
 * Check how many villas for sale in Latakia with price <= 200000 USD
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Listing = require('../models/listing.model');

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

async function checkVillaSearch() {
  try {
    const { finalURI, databaseName } = getDatabaseConnection();
    
    await mongoose.connect(finalURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('\n🔍 Checking: فلل للبيع في مدينة اللاذقية بحدود ٢٠٠ الف دولار\n');
    
    // Filters matching the parsed query
    const filters = {
      propertyType: { $regex: /villa/i }, // Villa/farms
      status: 'sale',
      city: 'Latakia',
      propertyPrice: { $lte: 200000 }, // priceMax = 200000
      currency: 'USD',
      isDeleted: false,
      approvalStatus: 'approved'
    };
    
    const count = await Listing.countDocuments(filters);
    const listings = await Listing.find(filters)
      .select('propertyType propertyPrice currency city status propertyId')
      .sort({ propertyPrice: 1 });
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 Search Results');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`💾 Database: ${databaseName}`);
    console.log(`📝 Total Results: ${count}`);
    console.log('\n📋 Listings:');
    
    if (listings.length === 0) {
      console.log('   No listings found matching the criteria.');
    } else {
      listings.forEach((l, i) => {
        console.log(`   ${i+1}. ${l.propertyType.padEnd(15)} | USD $${l.propertyPrice.toLocaleString().padStart(10)} | ${l.status} | ${l.propertyId.substring(0, 30)}...`);
      });
    }
    
    console.log('\n═══════════════════════════════════════════════════════\n');
    
    // Also check all villas in Latakia for sale (without price filter)
    const allVillas = await Listing.countDocuments({
      propertyType: { $regex: /villa/i },
      status: 'sale',
      city: 'Latakia',
      currency: 'USD',
      isDeleted: false,
      approvalStatus: 'approved'
    });
    
    console.log(`📊 Total Villas for Sale in Latakia (any price): ${allVillas}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

checkVillaSearch();

