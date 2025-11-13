// models/Agent.js
const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    description: { type: String, required: true },
    companyName: { type: String, required: true },
    position: { type: String, required: true },
    officeNumber: { type: String, required: true },
    officeAddress: { type: String, required: true },
    job: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    location: { type: String, required: true },
    facebook: { type: String },
    twitter: { type: String },
    linkedin: { type: String },
    avatar: { type: String }, // ✅ add this
    poster: { type: String },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);



module.exports = mongoose.model('Agent', agentSchema);
