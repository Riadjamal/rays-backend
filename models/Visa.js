const mongoose = require('mongoose');

const visaSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  type: {
    type: String,
    default: 'oman_visa',
    enum: ['oman_visa', 'uae_visa', 'saudi_visa']
  },
  visaType: {
    type: String,
    enum: ['SHJ', 'DXB', 'OMAN', 'SAUDI', 'UAE', 'NONE'],
    default: 'NONE'
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'processing', 'approved', 'rejected']
  },
  appliedDate: Date,
  approvedDate: Date,
  visaDocument: String,
  appliedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp
visaSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Visa', visaSchema);
