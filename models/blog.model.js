const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  title_ar: {
    type: String,
    trim: true,
    maxlength: [200, 'Arabic title cannot exceed 200 characters']
  },
  content: {
    type: String,
    trim: true
  },
  content_ar: {
    type: String,
    trim: true
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: [500, 'Excerpt cannot exceed 500 characters']
  },
  excerpt_ar: {
    type: String,
    trim: true,
    maxlength: [500, 'Arabic excerpt cannot exceed 500 characters']
  },
  imageSrc: {
    type: String,
    trim: true,
    default: ''
  },
  tag: {
    type: String,
    trim: true,
    enum: ['Real Estate', 'News', 'Investment', 'Market Updates', 'Buying Tips', 'Interior Inspiration', 'Investment Insights', 'Home Construction', 'Legal Guidance', 'Community Spotlight']
  },
  tag_ar: {
    type: String,
    trim: true,
    maxlength: [100, 'Arabic tag cannot exceed 100 characters']
  },
  category: {
    type: String,
    trim: true,
    enum: ['Property', 'Market', 'Investment', 'Tips', 'News', 'Legal']
  },
  category_ar: {
    type: String,
    trim: true,
    maxlength: [100, 'Arabic category cannot exceed 100 characters']
  },
  author: {
    name: {
      type: String,
      trim: true,
      default: 'Admin'
    },
    name_ar: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: ''
    },
    avatar: {
      type: String,
      default: ''
    }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  featured: {
    type: Boolean,
    default: false
  },
  viewCount: {
    type: Number,
    default: 0
  },
  tags: [{
    type: String,
    trim: true
  }],
  seo: {
    metaTitle: String,
    metaTitle_ar: String,
    metaDescription: String,
    metaDescription_ar: String,
    keywords: [String]
  },
  publishedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for better query performance (EN + AR for search)
blogSchema.index({
  title: 'text',
  title_ar: 'text',
  content: 'text',
  content_ar: 'text',
  excerpt: 'text',
  excerpt_ar: 'text'
});
blogSchema.index({ tag: 1, category: 1 });
blogSchema.index({ status: 1, featured: 1 });
blogSchema.index({ publishedAt: -1 });

// Update the updatedAt field before saving
blogSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = Date.now();
  }
  next();
});

// Auto-generate excerpt if not provided
blogSchema.pre('save', function(next) {
  if (!this.excerpt && this.content) {
    this.excerpt = this.content.substring(0, 200) + '...';
  }
  next();
});

module.exports = mongoose.model('Blog', blogSchema);
