const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    interest: { type: String, required: true },
    message: { type: String, required: true },
    metadata: {
      ip: { type: String },
      userAgent: { type: String }
    }
  },
  { timestamps: true }
);

// Index for rate limiting queries
contactSchema.index({ email: 1, createdAt: -1 });
contactSchema.index({ phone: 1, createdAt: -1 });
contactSchema.index({ 'metadata.ip': 1, createdAt: -1 });

const Contact = mongoose.model('Contact', contactSchema);

module.exports = Contact;
