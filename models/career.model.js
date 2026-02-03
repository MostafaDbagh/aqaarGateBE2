const mongoose = require('mongoose');

const careerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Career title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  title_ar: {
    type: String,
    trim: true,
    maxlength: [200, 'Arabic title cannot exceed 200 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters']
  },
  department_ar: {
    type: String,
    trim: true,
    maxlength: [100, 'Arabic department cannot exceed 100 characters']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
    maxlength: [150, 'Location cannot exceed 150 characters']
  },
  location_ar: {
    type: String,
    trim: true,
    maxlength: [150, 'Arabic location cannot exceed 150 characters']
  },
  salary: {
    type: String,
    trim: true,
    maxlength: [100, 'Salary cannot exceed 100 characters']
  },
  salary_ar: {
    type: String,
    trim: true,
    maxlength: [100, 'Arabic salary cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true
  },
  description_ar: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'published'
  },
  order: {
    type: Number,
    default: 0
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

careerSchema.index({ status: 1 });
careerSchema.index({ createdAt: -1 });

careerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Career', careerSchema);
