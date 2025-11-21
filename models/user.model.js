const  mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'agent', 'admin'],
      default: 'user',
      required: true,
    },
    avatar:{
      type: String,
      default: "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"
    },
    // Profile information
    description: {
      type: String,
      default: '',
    },
    company: {
      type: String,
      default: '',
    },
    position: {
      type: String,
      default: '',
    },
    officeNumber: {
      type: String,
      default: '',
    },
    officeAddress: {
      type: String,
      default: '',
    },
    job: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    location: {
      type: String,
      default: '',
    },
    city: {
      type: String,
      default: '',
    },
    // Social media links
    facebook: {
      type: String,
      default: '',
    },
    twitter: {
      type: String,
      default: '',
    },
    linkedin: {
      type: String,
      default: '',
    },
    whatsapp: {
      type: String,
      default: '',
    },
    // Agent-specific fields
    posterImage: {
      type: String,
      default: '',
    },
    servicesAndExpertise: {
      type: [String],
      default: [],
    },
    responseTime: {
      type: String,
      default: '',
    },
    availability: {
      type: String,
      default: '',
    },
    yearsExperience: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Point system fields
    pointsBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    packageType: {
      type: String,
      enum: ['basic', 'premium', 'enterprise'],
      default: 'basic',
    },
    packageExpiry: {
      type: Date,
      default: null,
    },
    // Trial period flag - allows free posting during trial
    isTrial: {
      type: Boolean,
      default: true,
    },
    // Unlimited points flag - bypasses point checking
    hasUnlimitedPoints: {
      type: Boolean,
      default: false,
    },
    // Blocked/Deleted flag for agents
    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedAt: {
      type: Date,
      default: null,
    },
    blockedReason: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
