const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Agent = require('../models/Agent');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create payment
exports.createPayment = async (req, res, next) => {
  try {
    const { bookingId, amount, type } = req.body;
    
    const booking = await Booking.findById(bookingId);
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    let payment;
    
    if (type === 'wallet') {
      // Agent wallet payment
      const agent = await Agent.findById(req.userId);
      
      if (agent.wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance'
        });
      }
      
      // Deduct from wallet
      agent.wallet.balance -= amount;
      agent.wallet.transactions.push({
        type: 'debit',
        amount,
        description: `Payment for booking ${booking.bookingNumber}`
      });
      
      await agent.save();
      
      payment = await Payment.create({
        booking: bookingId,
        agent: req.userId,
        amount,
        type: 'wallet',
        status: 'completed',
        transactionId: `WALLET-${Date.now()}`
      });
      
    } else if (type === 'card') {
      // Stripe card payment
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100, // Convert to cents
        currency: 'aed',
        metadata: {
          bookingId: bookingId,
          userId: req.userId
        }
      });
      
      payment = await Payment.create({
        booking: bookingId,
        user: req.userId,
        amount,
        type: 'card',
        status: 'pending',
        transactionId: paymentIntent.id,
        paymentGateway: 'stripe'
      });
      
      // Update booking status
      booking.status = 'confirmed';
      booking.payment = payment._id;
      await booking.save();
    }
    
    res.status(201).json({
      success: true,
      message: 'Payment created successfully',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// Get payment by ID
exports.getPaymentById = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('booking')
      .populate('user')
      .populate('agent');
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// Get user/agent payments
exports.getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({
      $or: [
        { user: req.userId },
        { agent: req.userId }
      ]
    })
      .populate('booking')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

// Confirm payment (for card payments after Stripe webhook)
exports.confirmPayment = async (req, res, next) => {
  try {
    const { paymentIntentId } = req.body;
    
    const payment = await Payment.findOne({ transactionId: paymentIntentId });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    payment.status = 'completed';
    await payment.save();
    
    // Update booking status
    await Booking.findByIdAndUpdate(payment.booking, {
      status: 'confirmed',
      payment: payment._id
    });
    
    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};

// Refund payment
exports.refundPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id);
    
    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot refund incomplete payment'
      });
    }
    
    if (payment.type === 'card') {
      // Process Stripe refund
      const refund = await stripe.refunds.create({
        payment_intent: payment.transactionId
      });
      
      payment.status = 'refunded';
      payment.refundAmount = payment.amount;
      payment.refundDate = new Date();
      await payment.save();
    } else if (payment.type === 'wallet') {
      // Refund to agent wallet
      const agent = await Agent.findById(payment.agent);
      agent.wallet.balance += payment.amount;
      agent.wallet.transactions.push({
        type: 'credit',
        amount: payment.amount,
        description: `Refund for booking ${payment.booking.bookingNumber}`
      });
      await agent.save();
      
      payment.status = 'refunded';
      payment.refundAmount = payment.amount;
      payment.refundDate = new Date();
      await payment.save();
    }
    
    res.json({
      success: true,
      message: 'Payment refunded successfully',
      data: payment
    });
  } catch (error) {
    next(error);
  }
};
