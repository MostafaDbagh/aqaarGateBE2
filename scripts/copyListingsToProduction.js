/**
 * Script to copy approved listings from Development database to Production database
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Listing = require('../models/listing.model');

const getDatabaseConnection = (isProduction) => {
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

async function copyListingsToProduction() {
  let devConnection = null;
  let prodConnection = null;
  
  try {
    // Get connections
    const devConn = getDatabaseConnection(false);
    const prodConn = getDatabaseConnection(true);
    
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📋 نسخ العقارات من Development إلى Production');
    console.log('═══════════════════════════════════════════════════════\n');
    
    console.log(`📥 قاعدة البيانات المصدر: ${devConn.databaseName}`);
    console.log(`📤 قاعدة البيانات الهدف: ${prodConn.databaseName}\n`);
    
    // Connect to Development database
    console.log('🔌 الاتصال بقاعدة البيانات Development...');
    devConnection = await mongoose.createConnection(devConn.finalURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).asPromise();
    console.log('✅ متصل بقاعدة البيانات Development\n');
    
    // Connect to Production database
    console.log('🔌 الاتصال بقاعدة البيانات Production...');
    prodConnection = await mongoose.createConnection(prodConn.finalURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    }).asPromise();
    console.log('✅ متصل بقاعدة البيانات Production\n');
    
    // Get Development Listing model
    const DevListing = devConnection.model('Listing', Listing.schema);
    
    // Get Production Listing model
    const ProdListing = prodConnection.model('Listing', Listing.schema);
    
    // Fetch approved listings from Development
    console.log('📥 جلب العقارات المعتمدة من Development...');
    const devListings = await DevListing.find({ approvalStatus: 'approved' }).lean();
    console.log(`✅ تم العثور على ${devListings.length} عقار معتمد\n`);
    
    if (devListings.length === 0) {
      console.log('⚠️  لا توجد عقارات معتمدة في Development للنسخ');
      return;
    }
    
    // Check existing listings in Production
    const existingIds = await ProdListing.find({}, { _id: 1 }).lean();
    const existingIdsSet = new Set(existingIds.map(l => l._id.toString()));
    
    // Filter out existing listings
    const newListings = devListings.filter(l => !existingIdsSet.has(l._id.toString()));
    
    console.log(`📊 إحصائيات:`);
    console.log(`   - إجمالي العقارات في Development: ${devListings.length}`);
    console.log(`   - العقارات الموجودة في Production: ${existingIds.length}`);
    console.log(`   - العقارات الجديدة للنسخ: ${newListings.length}\n`);
    
    if (newListings.length === 0) {
      console.log('✅ جميع العقارات موجودة بالفعل في Production');
      return;
    }
    
    // Copy listings to Production
    console.log('📤 نسخ العقارات إلى Production...');
    const result = await ProdListing.insertMany(newListings, { ordered: false });
    console.log(`✅ تم نسخ ${result.length} عقار بنجاح\n`);
    
    // Verify
    const prodCount = await ProdListing.countDocuments();
    console.log('📊 الحالة النهائية:');
    console.log(`   - إجمالي العقارات في Production: ${prodCount}`);
    console.log('\n✅ تم بنجاح!\n');
    
  } catch (error) {
    console.error('❌ خطأ:', error.message);
    if (error.message.includes('E11000')) {
      console.error('   ⚠️  بعض العقارات موجودة بالفعل (تم تخطيها)');
    }
    process.exit(1);
  } finally {
    if (devConnection) {
      await devConnection.close();
      console.log('🔌 تم إغلاق اتصال Development');
    }
    if (prodConnection) {
      await prodConnection.close();
      console.log('🔌 تم إغلاق اتصال Production');
    }
    process.exit(0);
  }
}

// Run the script
copyListingsToProduction();

