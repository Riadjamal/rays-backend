const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  },
  travelDate: {
    type: Date,
    required: [true, 'Travel date is required']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    enum: ['SHJ', 'DXB']
  },
  productType: {
    type: String,
    required: [true, 'Product type is required'],
    enum: ['with_uae_visa', 'without_uae_visa']
  },
  passengerName: {
    type: String,
    required: true
  },
  passportDetails: {
    number: String,
    nationality: String,
    expiryDate: Date
  },
  isReturnTrip: {
    type: Boolean,
    default: false
  },
  documents: {
    passport: String,
    photo: String,
    uaeVisa: String,
    emiratesID: String
  },
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'confirmed', 'processing', 'completed', 'cancelled']
  },
  visa: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Visa'
  },
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Bus'
  },
  seat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat'
  },
  returnDate: Date,
  returnSeat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seat'
  },
  payment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment'
  },
  cancellationDate: Date,
  cancellationFee: {
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

// Generate booking number before saving
bookingSchema.pre('save', function(next) {
  if (!this.bookingNumber) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    this.bookingNumber = `BK-${timestamp.toUpperCase()}-${random.toUpperCase()}`;
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);
