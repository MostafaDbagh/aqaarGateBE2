/**
 * Seed one mock blog into the development (non-production) database.
 * Uses NODE_ENV=development so it targets the _Dev database only.
 *
 * Usage: NODE_ENV=development node scripts/seedMockBlog.js
 */

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

if (process.env.NODE_ENV === 'production') {
  console.error('❌ This script is for non-production only. Refusing to run in production.');
  process.exit(1);
}

require('dotenv').config();
const mongoose = require('mongoose');
const Blog = require('../models/blog.model');

const getDatabaseConnection = () => {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  let mongoURI = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoURI) {
    throw new Error('MONGO_URI is not defined in environment variables!');
  }

  const getDatabaseName = () => {
    if (process.env.MONGO_DB_NAME) return process.env.MONGO_DB_NAME;
    let existingDbName = 'SyProperties';
    const queryIndex = mongoURI.indexOf('?');
    const uriWithoutQuery = queryIndex !== -1 ? mongoURI.substring(0, queryIndex) : mongoURI;
    const lastSlashIndex = uriWithoutQuery.lastIndexOf('/');
    if (lastSlashIndex !== -1 && lastSlashIndex < uriWithoutQuery.length - 1) {
      existingDbName = uriWithoutQuery.substring(lastSlashIndex + 1);
    }
    const baseName = existingDbName.replace(/_Dev$/, '') || 'SyProperties';
    return `${baseName}_Dev`;
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
  return { finalURI, databaseName, NODE_ENV };
};

const mockBlog = {
  title: 'Welcome to Our Real Estate Blog',
  title_ar: 'مرحباً بكم في مدونة العقارات',
  content: 'This is a sample blog post for development. You can edit or delete it from the admin Blogs section. Real estate insights, market updates, and tips for buyers and sellers.',
  content_ar: 'هذه مقالة تجريبية للتطوير. يمكنك تعديلها أو حذفها من لوحة الإدارة - المدونات. نصائح وعروض عقارية.',
  excerpt: 'A sample development blog post with English and Arabic content.',
  excerpt_ar: 'مقالة تجريبية للتطوير باللغتين العربية والإنجليزية.',
  imageSrc: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
  tag: 'Real Estate',
  tag_ar: 'عقارات',
  category: 'Tips',
  category_ar: 'نصائح',
  author: {
    name: 'Admin',
    name_ar: 'مدير',
    email: 'admin@aqaargate.com'
  },
  status: 'published',
  featured: true,
  seo: {
    metaTitle: 'Welcome to Our Real Estate Blog',
    metaTitle_ar: 'مرحباً بكم في مدونة العقارات',
    metaDescription: 'Sample blog post for development environment.',
    metaDescription_ar: 'مقالة تجريبية لبيئة التطوير.'
  }
};

const seedMockBlog = async () => {
  try {
    const { finalURI, databaseName, NODE_ENV } = getDatabaseConnection();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('📝 Seeding mock blog (non-production only)');
    console.log('═══════════════════════════════════════════════════════');
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`💾 Database: ${databaseName}`);
    console.log('═══════════════════════════════════════════════════════\n');

    await mongoose.connect(finalURI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    console.log('✅ Connected to MongoDB');

    const existing = await Blog.findOne({ title: mockBlog.title });
    if (existing) {
      console.log('⚠️  Mock blog already exists (same title). Skipping insert.');
      console.log('   _id:', existing._id.toString());
      await mongoose.connection.close();
      console.log('\n✅ Database connection closed');
      return;
    }

    const blog = new Blog(mockBlog);
    await blog.save();

    console.log('\n✅ Mock blog created successfully!');
    console.log('═══════════════════════════════════════════════════════');
    console.log('   _id:', blog._id.toString());
    console.log('   title (EN):', blog.title);
    console.log('   title (AR):', blog.title_ar);
    console.log('   status:', blog.status);
    console.log('   featured:', blog.featured);
    console.log('═══════════════════════════════════════════════════════\n');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error seeding mock blog:', error.message);
    if (error.stack) console.error(error.stack);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  }
};

seedMockBlog();
