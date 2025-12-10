const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Determine environment (default to development for safety)
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isDevelopment = !isProduction;

// Get MongoDB URI from environment variables
// Support both MONGO_URI and MONGODB_URI for compatibility
let mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoURI) {
  logger.error('MONGO_URI is not defined in environment variables!');
  logger.error('Please create a .env file in the api/ directory with MONGO_URI set.');
  process.exit(1);
}

// Automatically set database name based on environment
// This ensures development and production use different databases
const getDatabaseName = () => {
  // If MONGO_DB_NAME is explicitly set, use it
  if (process.env.MONGO_DB_NAME) {
    return process.env.MONGO_DB_NAME;
  }
  
  // Extract existing database name from connection string
  // Pattern: mongodb+srv://user:pass@host/dbname?options
  let existingDbName = 'SyProperties'; // default
  const queryIndex = mongoURI.indexOf('?');
  const uriWithoutQuery = queryIndex !== -1 ? mongoURI.substring(0, queryIndex) : mongoURI;
  const lastSlashIndex = uriWithoutQuery.lastIndexOf('/');
  
  if (lastSlashIndex !== -1 && lastSlashIndex < uriWithoutQuery.length - 1) {
    existingDbName = uriWithoutQuery.substring(lastSlashIndex + 1);
  }
  
  if (isProduction) {
    // Production: use database name as-is (remove _Dev if present)
    return existingDbName.replace(/_Dev$/, '') || 'SyProperties';
  } else {
    // Development: append _Dev to database name
    const baseName = existingDbName.replace(/_Dev$/, '') || 'SyProperties';
    return `${baseName}_Dev`;
  }
};

// Replace database name in connection string
const replaceDatabaseName = (uri, newDbName) => {
  // Pattern: mongodb+srv://user:pass@host/dbname?options
  // or: mongodb://user:pass@host:port/dbname?options
  
  // Find the last '/' before the query string (if any)
  const queryIndex = uri.indexOf('?');
  const uriWithoutQuery = queryIndex !== -1 ? uri.substring(0, queryIndex) : uri;
  const queryString = queryIndex !== -1 ? uri.substring(queryIndex) : '';
  
  // Find the last '/' which should be before the database name
  const lastSlashIndex = uriWithoutQuery.lastIndexOf('/');
  
  if (lastSlashIndex !== -1) {
    // Replace everything after the last '/' with the new database name
    const baseUri = uriWithoutQuery.substring(0, lastSlashIndex + 1);
    return `${baseUri}${newDbName}${queryString}`;
  }
  
  // If no slash found, append database name
  return `${uri}/${newDbName}${queryString}`;
};

const databaseName = getDatabaseName();
mongoURI = replaceDatabaseName(mongoURI, databaseName);

// Safety check: Warn if trying to use production database in development
if (isDevelopment && databaseName === 'SyProperties' && !databaseName.includes('_Dev')) {
  logger.warn('⚠️  WARNING: You are using PRODUCTION database in DEVELOPMENT mode!');
  logger.warn('⚠️  This is dangerous! Consider using a separate development database.');
  logger.warn(`⚠️  Current database: ${databaseName}`);
  logger.warn('⚠️  Set NODE_ENV=development and ensure database name ends with _Dev');
}

// Log connection info (ALWAYS visible, not just in development)
console.log('\n═══════════════════════════════════════════════════════');
console.log('🔌 MongoDB Connection Information');
console.log('═══════════════════════════════════════════════════════');
console.log(`📊 Environment: ${NODE_ENV}`);
console.log(`💾 Database Name: ${databaseName}`);
if (isDevelopment) {
  console.log('🛡️  Development mode - using separate database for safety');
  console.log('✅ Your production database is PROTECTED');
} else {
  console.log('⚠️  PRODUCTION mode - using production database');
}
console.log('═══════════════════════════════════════════════════════\n');

// Connection options (removed deprecated useNewUrlParser and useUnifiedTopology)
const connectOptions = {
  serverSelectionTimeoutMS: 30000, // Increased to 30 seconds for DNS resolution
  socketTimeoutMS: 60000, // Close sockets after 60 seconds of inactivity
  connectTimeoutMS: 30000, // Timeout for initial connection
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 1, // Minimum pool size
  retryWrites: true,
  w: 'majority',
  retryReads: true
};

// Set mongoose buffer timeout to match connection timeout
mongoose.set('bufferTimeoutMS', 30000); // 30 seconds buffer timeout
mongoose.set('bufferCommands', true); // Enable command buffering

// Create connection promise
const connectionPromise = mongoose.connect(mongoURI, connectOptions)
  .then(() => {
    console.log(`✅ MongoDB connected successfully to database: ${databaseName}`);
    if (isDevelopment) {
      console.log('✅ Your production database is PROTECTED - all changes go to development DB');
    }
    return mongoose.connection;
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err.message);
    
    // Provide helpful debugging information
    if (err.code === 'ECONNREFUSED' || err.message.includes('ECONNREFUSED')) {
      logger.error('\n🔍 Troubleshooting steps:');
      logger.error('1. Check your internet connection');
      logger.error('2. Verify MongoDB Atlas cluster is not paused');
      logger.error('3. Check if your IP is whitelisted in MongoDB Atlas Network Access');
      logger.error('4. Verify your MongoDB connection string is correct');
      logger.error('5. Check DNS resolution for your MongoDB cluster hostname');
      logger.error('6. Try using a VPN if DNS resolution is blocked');
    }
    
    if (err.code === 'ETIMEOUT' || err.message.includes('ETIMEOUT') || err.message.includes('querySrv')) {
      logger.error('\n🔍 DNS/Network Timeout Error:');
      logger.error('1. Check your internet connection');
      logger.error('2. Try restarting your network connection');
      logger.error('3. Check if MongoDB Atlas cluster is accessible');
      logger.error('4. Verify DNS resolution is working');
      logger.error('5. Try using a VPN or different network');
    }
    
    if (err.message.includes('authentication')) {
      logger.error('\n🔐 Authentication Error:');
      logger.error('Check your MongoDB username and password');
    }
    
    throw err;
  });

const conn = mongoose.connection;

// Connection event handlers
conn.on('connected', () => {
  logger.success('Database connection established');
});

conn.on('error', (err) => {
  logger.error('Database connection error:', err.message);
});

conn.on('disconnected', () => {
  logger.warn('Database disconnected');
});

// Handle app termination
process.on('SIGINT', async () => {
  await conn.close();
  logger.info('Database connection closed due to app termination');
  process.exit(0);
});

// Export both connection and promise
module.exports = conn;
module.exports.ready = connectionPromise;