/**
 * Quick script to verify all listings have USD currency
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

async function verifyListings() {
  try {
    const { finalURI, databaseName } = getDatabaseConnection();
    
    await mongoose.connect(finalURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    
    console.log('\n📊 Verifying Listings...\n');
    
    const total = await Listing.countDocuments();
    const usdCount = await Listing.countDocuments({ currency: 'USD' });
    const otherCurrencies = await Listing.aggregate([
      { $group: { _id: '$currency', count: { $sum: 1 } } },
      { $match: { _id: { $ne: 'USD' } } }
    ]);
    
    const byType = await Listing.aggregate([
      { $group: { _id: '$propertyType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const byStatus = await Listing.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    const sample = await Listing.find()
      .limit(10)
      .select('propertyType propertyPrice currency city status')
      .sort({ createdAt: -1 });
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('📊 Database Summary');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`💾 Database: ${databaseName}`);
    console.log(`📝 Total Listings: ${total}`);
    console.log(`💰 USD Listings: ${usdCount} (${((usdCount/total)*100).toFixed(1)}%)`);
    
    if (otherCurrencies.length > 0) {
      console.log(`⚠️  Other Currencies Found:`);
      otherCurrencies.forEach(c => console.log(`   - ${c._id}: ${c.count}`));
    } else {
      console.log(`✅ All listings are in USD!`);
    }
    
    console.log('\n📋 By Property Type:');
    byType.forEach(t => console.log(`   - ${t._id}: ${t.count}`));
    
    console.log('\n📋 By Status:');
    byStatus.forEach(s => console.log(`   - ${s._id}: ${s.count}`));
    
    console.log('\n📋 Sample Listings (Latest 10):');
    sample.forEach((l, i) => {
      console.log(`   ${i+1}. ${l.propertyType.padEnd(15)} | ${l.city.padEnd(12)} | USD $${l.propertyPrice.toLocaleString().padStart(10)} | ${l.status}`);
    });
    
    console.log('\n═══════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

verifyListings();

