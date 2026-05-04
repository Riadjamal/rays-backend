const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const agentSchema = new mongoose.Schema({
  companyName: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true
  },
  contactPerson: {
    type: String,
    required: [true, 'Contact person name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  password: {
    type: String,
    required: false, // Optional during initial registration
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    default: 'agent',
    enum: ['agent']
  },
  companyDetails: {
    license: String,
    address: String,
    tradeLicense: String
  },
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    transactions: [{
      type: {
        type: String,
        enum: ['credit', 'debit']
      },
      amount: Number,
      description: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  bookings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }],
  notifications: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Notification'
  }],
  resetPasswordOTP: String,
  resetPasswordOTPExpires: Date,
  setupPasswordToken: String,
  setupPasswordTokenExpires: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
agentSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
agentSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update updatedAt timestamp
agentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Agent', agentSchema);
