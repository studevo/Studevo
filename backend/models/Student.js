// backend/models/Student.js
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  // Auth fields
  email: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  
  // Personal info (required for CV)
  firstName: { 
    type: String, 
    trim: true 
  },
  lastName: { 
    type: String, 
    trim: true 
  },
  phone: { 
    type: String, 
    trim: true 
  },
  
  // CV fields (optional but tracked for completion)
  address: { 
    type: String, 
    trim: true 
  },
  education: { 
    type: String, 
    trim: true 
  },
  skills: { 
    type: String, 
    trim: true 
  },
  experience: { 
    type: String, 
    trim: true 
  },
  projects: { 
    type: String, 
    trim: true 
  },
  certifications: { 
    type: String, 
    trim: true 
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

module.exports = mongoose.model('Student', studentSchema);