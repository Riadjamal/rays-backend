const User = require('../models/User');
const Booking = require('../models/Booking');

// Get user profile
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Update user profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, passportDetails } = req.body;

    const user = await User.findById(req.userId);

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (passportDetails) user.passportDetails = passportDetails;

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Get user bookings
exports.getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.userId })
      .populate('visa')
      .populate('bus')
      .populate('seat')
      .populate('payment')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// Get user dashboard data
exports.getDashboard = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    // Get recent bookings
    const recentBookings = await Booking.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('bus')
      .populate('seat');

    // Get next upcoming trip (confirmed booking with travelDate >= today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextTrip = await Booking.findOne({
      user: req.userId,
      status: { $in: ['confirmed', 'processing'] },
      travelDate: { $gte: today }
    })
      .sort({ travelDate: 1 })
      .populate('bus')
      .populate('seat');

    res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email
        },
        walletBalance: user.walletBalance,
        recentBookings,
        nextTrip
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get wallet balance and transactions
exports.getWallet = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    res.json({
      success: true,
      data: {
        balance: user.walletBalance || 0,
        transactions: user.walletTransactions || []
      }
    });
  } catch (error) {
    next(error);
  }
};
// Recharge wallet
exports.rechargeWallet = async (req, res, next) => {
  try {
    const { amount, paymentMethod } = req.body;

    const user = await User.findById(req.userId);

    user.walletBalance = (user.walletBalance || 0) + amount;
    user.walletTransactions.push({
      type: 'credit',
      amount,
      description: `Wallet recharge via ${paymentMethod}`,
      date: new Date()
    });

    await user.save();

    res.json({
      success: true,
      message: 'Wallet recharged successfully',
      data: {
        balance: user.walletBalance
      }
    });
  } catch (error) {
    next(error);
  }
};
