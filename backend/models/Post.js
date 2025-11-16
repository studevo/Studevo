// backend/models/Post.js
const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    required: true
  },
  orgName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  type: {
    type: String,
    required: true,
    enum: ['Internship', 'Volunteering', 'Mentorship', 'Event']
  },
  description: {
    type: String,
    required: true,
    minlength: 20,
    maxlength: 2000
  },
  location: {
    type: String,
    default: 'Remote'
  },
  durationStart: {
    type: Date,
    default: null
  },
  durationEnd: {
    type: Date,
    default: null
  },
  deadline: {
    type: Date,
    default: null
  },
  applicationLink: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'active'],
    default: 'draft'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Post', postSchema);