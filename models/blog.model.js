const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Blog content is required'],
    trim: true
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: [500, 'Excerpt cannot exceed 500 characters']
  },
  imageSrc: {
    type: String,
    required: [true, 'Blog image is required'],
    trim: true
  },
  tag: {
    type: String,
    required: [true, 'Blog tag is required'],
    trim: true,
    enum: ['Real Estate', 'News', 'Investment', 'Market Updates', 'Buying Tips', 'Interior Inspiration', 'Investment Insights', 'Home Construction', 'Legal Guidance', 'Community Spotlight']
  },
  category: {
    type: String,
    required: [true, 'Blog category is required'],
    trim: true,
    enum: ['Property', 'Market', 'Investment', 'Tips', 'News', 'Legal']
  },
  author: {
    name: {
      type: String,
      required: [true, 'Author name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Author email is required'],
      trim: true,
      lowercase: true
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
  likes: {
    type: Number,
    default: 0
  },
  comments: [{
    user: {
      name: String,
      email: String,
      avatar: String
    },
    content: String,
    date: {
      type: Date,
      default: Date.now
    },
    approved: {
      type: Boolean,
      default: false
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
  relatedProperties: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Listing'
  }],
  seo: {
    metaTitle: String,
    metaDescription: String,
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

// Index for better query performance
blogSchema.index({ title: 'text', content: 'text', excerpt: 'text' });
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
