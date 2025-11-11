const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({
  orgName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('Organization', organizationSchema);