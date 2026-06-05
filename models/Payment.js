const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  agent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Agent'
  },
  amount: {
    type: Number,
    required: [true, 'Payment amount is required'],
    min: 0
  },
  type: {
    type: String,
    required: true,
    enum: ['card', 'wallet', 'recharge']
  },
  paymentMethod: {
    type: String,
    default: 'card'
  },
  bankSlip: String,
  status: {
    type: String,
    default: 'pending',
    enum: ['pending', 'completed', 'failed', 'refunded']
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentGateway: {
    type: String,
    default: 'stripe'
  },
  purpose: {
    type: String,
    default: 'generic',
    enum: ['generic', 'booking_checkout', 'agent_wallet_recharge']
  },
  checkoutSessionId: {
    type: String,
    unique: true,
    sparse: true
  },
  contextData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundDate: Date,
  processedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
