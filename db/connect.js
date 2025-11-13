const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Get MongoDB URI from environment variables
// Support both MONGO_URI and MONGODB_URI for compatibility
const mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoURI) {
  logger.error('MONGO_URI is not defined in environment variables!');
  logger.error('Please create a .env file in the api/ directory with MONGO_URI set.');
  process.exit(1);
}

// Connection options (removed deprecated useNewUrlParser and useUnifiedTopology)
const connectOptions = {
  serverSelectionTimeoutMS: 10000, // Increased to 10 seconds for DNS resolution
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
  connectTimeoutMS: 10000, // Timeout for initial connection
  maxPoolSize: 10, // Maintain up to 10 socket connections
  minPoolSize: 5, // Maintain at least 5 socket connections
  retryWrites: true,
  w: 'majority'
};

// Connect to MongoDB
mongoose.connect(mongoURI, connectOptions)
  .then(() => {
    logger.success('MongoDB connected successfully');
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
    
    if (err.message.includes('authentication')) {
      logger.error('\n🔐 Authentication Error:');
      logger.error('Check your MongoDB username and password');
    }
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

module.exports = conn;