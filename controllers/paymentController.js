const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const Agent = require('../models/Agent');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createBookingFromPayload, getBookingQuote } = require('./bookingController');

const getClientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

const assertStripeConfigured = () => {
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.includes('placeholder')) {
    const error = new Error('Stripe is not configured yet. Please set a valid STRIPE_SECRET_KEY.');
    error.statusCode = 500;
    throw error;
  }
};

const buildTransactionId = (prefix) => `${prefix}-${Date.now().toString(36).toUpperCase()}`;

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
      const agent = await Agent.findById(req.userId);

      if (agent.wallet.balance < amount) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient wallet balance'
        });
      }

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
        transactionId: buildTransactionId('WALLET')
      });
    } else if (type === 'card') {
      assertStripeConfigured();

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(Number(amount) * 100),
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
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.createBookingCheckoutSession = async (req, res, next) => {
  try {
    if (req.userRole !== 'user') {
      return res.status(403).json({ success: false, message: 'Only users can pay for bookings by card' });
    }

    assertStripeConfigured();

    const quote = await getBookingQuote(req.body, req.userId, req.userRole);
    const payment = await Payment.create({
      user: req.userId,
      amount: quote.totalPrice,
      type: 'card',
      paymentMethod: 'card',
      status: 'pending',
      paymentGateway: 'stripe',
      purpose: 'booking_checkout',
      transactionId: buildTransactionId('CHK'),
      contextData: req.body
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${getClientUrl()}/user/book?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getClientUrl()}/user/book?payment=cancelled`,
      customer_email: req.body.emailId || req.user.email,
      metadata: {
        paymentId: payment._id.toString(),
        userId: req.userId.toString(),
        purpose: 'booking_checkout'
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'aed',
            unit_amount: Math.round(quote.totalPrice * 100),
            product_data: {
              name: 'Rays International Booking',
              description: `${req.body.productType || 'Bus booking'} for ${quote.requestedPassengerCount} passenger(s)`
            }
          }
        }
      ]
    });

    payment.checkoutSessionId = session.id;
    await payment.save();

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        sessionId: session.id,
        checkoutUrl: session.url
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.verifyBookingCheckoutSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (req.userRole !== 'user') {
      return res.status(403).json({ success: false, message: 'Only users can verify booking card payments' });
    }

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Stripe session ID is required' });
    }

    assertStripeConfigured();

    const payment = await Payment.findOne({
      checkoutSessionId: sessionId,
      user: req.userId,
      purpose: 'booking_checkout'
    }).populate('booking');

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Checkout session not found' });
    }

    if (payment.status === 'completed' && payment.booking) {
      return res.json({
        success: true,
        message: 'Booking payment already verified',
        data: payment.booking
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Stripe payment is not completed yet' });
    }

    payment.transactionId = session.payment_intent?.id || session.payment_intent || payment.transactionId;

    try {
      const booking = await createBookingFromPayload({
        payload: payment.contextData || {},
        userId: req.userId,
        userRole: req.userRole,
        existingPayment: payment
      });

      payment.contextData = null;
      await payment.save();

      return res.json({
        success: true,
        message: 'Booking confirmed successfully',
        data: booking
      });
    } catch (bookingError) {
      payment.status = 'failed';
      payment.contextData = {
        ...(payment.contextData || {}),
        finalizeError: bookingError.message
      };
      await payment.save();

      return res.status(bookingError.statusCode || 500).json({
        success: false,
        message: bookingError.message || 'Payment succeeded, but booking finalization failed. Please contact support.',
        errors: bookingError.details || undefined
      });
    }
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.createAgentWalletCheckoutSession = async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);

    if (req.userRole !== 'agent') {
      return res.status(403).json({ success: false, message: 'Only agents can recharge agent wallet by card' });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Please enter a valid recharge amount' });
    }

    assertStripeConfigured();

    const payment = await Payment.create({
      agent: req.userId,
      amount,
      type: 'recharge',
      paymentMethod: 'card',
      status: 'pending',
      paymentGateway: 'stripe',
      purpose: 'agent_wallet_recharge',
      transactionId: buildTransactionId('RCHG'),
      contextData: { amount }
    });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${getClientUrl()}/agent/wallet?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getClientUrl()}/agent/wallet?payment=cancelled`,
      customer_email: req.user.email,
      metadata: {
        paymentId: payment._id.toString(),
        agentId: req.userId.toString(),
        purpose: 'agent_wallet_recharge'
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'aed',
            unit_amount: Math.round(amount * 100),
            product_data: {
              name: 'Agent Wallet Recharge',
              description: `Recharge agent wallet with AED ${amount.toFixed(2)}`
            }
          }
        }
      ]
    });

    payment.checkoutSessionId = session.id;
    await payment.save();

    res.json({
      success: true,
      data: {
        paymentId: payment._id,
        sessionId: session.id,
        checkoutUrl: session.url
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

exports.verifyAgentWalletCheckoutSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (req.userRole !== 'agent') {
      return res.status(403).json({ success: false, message: 'Only agents can verify wallet recharges' });
    }

    if (!sessionId) {
      return res.status(400).json({ success: false, message: 'Stripe session ID is required' });
    }

    assertStripeConfigured();

    const payment = await Payment.findOne({
      checkoutSessionId: sessionId,
      agent: req.userId,
      purpose: 'agent_wallet_recharge'
    });

    if (!payment) {
      return res.status(404).json({ success: false, message: 'Checkout session not found' });
    }

    const agent = await Agent.findById(req.userId);
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent not found' });
    }

    if (payment.status === 'completed') {
      return res.json({
        success: true,
        message: 'Wallet recharge already verified',
        data: {
          balance: agent.wallet.balance,
          payment
        }
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent']
    });

    if (session.payment_status !== 'paid') {
      return res.status(400).json({ success: false, message: 'Stripe payment is not completed yet' });
    }

    agent.wallet.balance += payment.amount;
    agent.wallet.transactions.push({
      type: 'credit',
      amount: payment.amount,
      description: `Stripe wallet recharge (${payment.checkoutSessionId})`
    });
    await agent.save();

    payment.status = 'completed';
    payment.transactionId = session.payment_intent?.id || session.payment_intent || payment.transactionId;
    payment.processedAt = new Date();
    payment.contextData = null;
    await payment.save();

    res.json({
      success: true,
      message: 'Wallet recharged successfully',
      data: {
        balance: agent.wallet.balance,
        payment
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};

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
    payment.processedAt = new Date();
    await payment.save();

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

exports.refundPayment = async (req, res, next) => {
  try {
    const payment = await Payment.findById(req.params.id).populate('booking');

    if (payment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot refund incomplete payment'
      });
    }

    if (payment.type === 'card') {
      assertStripeConfigured();

      await stripe.refunds.create({
        payment_intent: payment.transactionId
      });

      payment.status = 'refunded';
      payment.refundAmount = payment.amount;
      payment.refundDate = new Date();
      await payment.save();
    } else if (payment.type === 'wallet') {
      const agent = await Agent.findById(payment.agent);
      agent.wallet.balance += payment.amount;
      agent.wallet.transactions.push({
        type: 'credit',
        amount: payment.amount,
        description: `Refund for booking ${payment.booking?.bookingNumber || payment.booking}`
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
    if (error.statusCode) {
      return res.status(error.statusCode).json({ success: false, message: error.message });
    }
    next(error);
  }
};
