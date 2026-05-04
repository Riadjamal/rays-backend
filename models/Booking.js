const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingNumber: {
    type: String,
    unique: true,
    default: () => {
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substr(2, 5);
      return `BK-${timestamp.toUpperCase()}-${random.toUpperCase()}`;
    }
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
  travelTime: {
    type: String,
    default: '08:00 AM'
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    enum: ['SHJ', 'DXB']
  },
  productType: {
    type: String,
    required: [true, 'Product type is required'],
    enum: [
        'shj_visa_extension', 'dxb_visa_extension', 
        'standard_transfer', 'return_transfer',
        'oman_uae_30', 'oman_uae_60',
        'oman_uae_b2b_30', 'oman_uae_b2b_60'
    ]
  },
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  passengerName: String, // Keep for legacy compatibility
  dateOfBirth: Date,
  contactDetails: {
    mobileNumber: String,
    emailId: String,
    whatsAppNumber: String
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
    currentVisa: String,
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
  rescheduleRequest: {
    requestedDate: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    rejectionReason: String,
    requestedAt: Date
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'wallet', 'bank_transfer', 'cash'],
    default: 'card'
  },
  bankSlip: String,
  totalAmount: {
    type: Number,
    required: true,
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
