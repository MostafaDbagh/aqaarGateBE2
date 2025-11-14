// Load environment variables FIRST before requiring any other modules
require('dotenv').config();

// Load SendGrid API key if sendgrid.env exists
try {
  require('dotenv').config({ path: './sendgrid.env' });
} catch (error) {
  // sendgrid.env is optional, ignore if it doesn't exist
}

const express = require('express');
const db = require('./db/connect');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();

// Define allowed origins for production environments
const defaultAllowedOrigins = [
  'https://aqaar-gate-fe.vercel.app',
  'https://aqaargate.com',
  'https://www.aqaargate.com',
];

const envAllowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_2,
  process.env.FRONTEND_URLS,
  process.env.DASHBOARD_URL,
].filter(Boolean);

const normalizedEnvOrigins = envAllowedOrigins
  .flatMap((value) => value.split(','))
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const allowedOriginsSet = new Set([
  ...defaultAllowedOrigins,
  ...normalizedEnvOrigins,
]);

// Configure CORS to allow requests from frontend
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.endsWith('/')
      ? origin.slice(0, -1)
      : origin;
    
    // Allow localhost on any port (for development)
    if (
      normalizedOrigin.startsWith('http://localhost:') ||
      normalizedOrigin.startsWith('https://localhost:')
    ) {
      return callback(null, true);
    }
    
    // Allow 127.0.0.1 on any port (for development)
    if (
      normalizedOrigin.startsWith('http://127.0.0.1:') ||
      normalizedOrigin.startsWith('https://127.0.0.1:')
    ) {
      return callback(null, true);
    }
    
    // Allow Heroku app URLs (for production)
    if (normalizedOrigin.includes('.herokuapp.com')) {
      return callback(null, true);
    }
    
    // Allow production frontend URL if set
    if (allowedOriginsSet.has(normalizedOrigin)) {
      return callback(null, true);
    }

    if (normalizedOrigin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    
    // In development, allow all origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Referer',
    'Cache-Control',
    'Pragma',
    'Sec-Fetch-Mode',
    'Sec-Fetch-Site',
    'Sec-Fetch-Dest',
    'sec-ch-ua',
    'sec-ch-ua-mobile',
    'sec-ch-ua-platform',
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
};

app.use(cors(corsOptions));
// Don't parse JSON for routes that handle file uploads
// express.json() will interfere with multer's ability to parse multipart/form-data
// We'll apply it only to routes that don't handle file uploads
app.use(cookieParser());

// Apply express.json() only to routes that don't handle multipart/form-data
app.use('/api/auth', express.json());
app.use('/api/user', express.json());
app.use('/api/review', express.json());
app.use('/api/contacts', express.json());
app.use('/api/favorites', express.json());
app.use('/api/points', express.json());
app.use('/api/message', express.json());
app.use('/api/newsletter', express.json());
app.use('/api/blog', express.json());
app.use('/api/dashboard', express.json());
// Apply express.json() to listing routes (but NOT to /create which uses multipart/form-data)
// We'll handle this in the route handler itself
app.use('/api/listing', (req, res, next) => {
  // Skip JSON parsing for /create route (uses multipart/form-data)
  // req.path will be like '/create' or '/update/:id' when mounted at /api/listing
  if (req.path.startsWith('/create') && req.method === 'POST') {
    return next();
  }
  // For all other listing routes, parse JSON
  // Note: GET requests don't need JSON parsing, but it's safe to apply
  express.json()(req, res, next);
});

// Routes
const authRouter = require('./routes/auth.route');
const userRouter = require('./routes/user.route');
const listingRouter = require('./routes/listing.route');
const reviewRouter = require('./routes/review.route');
const contactRoutes = require('./routes/contact.route');
const favoriteRoutes = require('./routes/favorite.route');
const agentRoutes = require('./routes/agent.routes');
const pointRoutes = require('./routes/point.route');
const messageRoutes = require('./routes/message.route');
const newsletterRoutes = require('./routes/newsletter.route');
const blogRoutes = require('./routes/blog.route');
const dashboardRoutes = require('./routes/dashboard.route');

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/listing', listingRouter);
app.use('/api/review', reviewRouter);
app.use('/api/contacts', contactRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/points', pointRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/newsletter', newsletterRoutes);
app.use('/api/blog', blogRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'All routes loaded successfully' });
});


// Error handling middleware - must be after all routes
app.use((err, req, res, next) => {
  const logger = require('./utils/logger');
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  logger.error('Error:', {
    statusCode,
    message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  const response = {
    success: false,
    message: message
  };
  
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }
  
  res.status(statusCode).json(response);
});


const PORT = process.env.PORT || 5500;

const logger = require('./utils/logger');

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
