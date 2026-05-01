const User = require('../models/User');
const Agent = require('../models/Agent');
const Booking = require('../models/Booking');
const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const Payment = require('../models/Payment');

// Dashboard stats
exports.getDashboard = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalAgents = await Agent.countDocuments();
    const pendingAgents = await Agent.countDocuments({ isApproved: false });
    const totalBookings = await Booking.countDocuments();
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    const totalBuses = await Bus.countDocuments({ isActive: true });

    // Analytics data for charts
    const analyticsData = [
      { name: 'Jan', revenue: 4000, bookings: 24 },
      { name: 'Feb', revenue: 3000, bookings: 18 },
      { name: 'Mar', revenue: 5000, bookings: 30 },
      { name: 'Apr', revenue: 4500, bookings: 27 },
      { name: 'May', revenue: 6000, bookings: 36 },
      { name: 'Jun', revenue: 5500, bookings: 33 },
      { name: 'Jul', revenue: 7000, bookings: 42 }
    ];

    res.json({
      success: true,
      data: {
        users: totalUsers,
        agents: totalAgents,
        pendingAgents,
        bookings: totalBookings,
        pendingBookings,
        totalBuses,
        revenue: 45200, // Aggregate this properly in real scenario
        analyticsData
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all users
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// Block/Unblock user
exports.blockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// Get all agents
exports.getAgents = async (req, res, next) => {
  try {
    const agents = await Agent.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: agents
    });
  } catch (error) {
    next(error);
  }
};

// Approve agent
exports.approveAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    agent.isApproved = true;
    await agent.save();

    res.json({
      success: true,
      message: 'Agent approved successfully',
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

// Create new agent
exports.createAgent = async (req, res, next) => {
  try {
    const { companyName, contactPerson, email, phone, password, companyDetails } = req.body;

    const existingAgent = await Agent.findOne({ email });
    if (existingAgent) {
      return res.status(400).json({
        success: false,
        message: 'Agent with this email already exists'
      });
    }

    const agent = await Agent.create({
      companyName,
      contactPerson,
      email,
      phone,
      password,
      companyDetails,
      isApproved: true // Manually created agents are approved by default
    });

    res.status(201).json({
      success: true,
      message: 'Agent created successfully',
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

// Get all drivers
exports.getDrivers = async (req, res, next) => {
  try {
    const drivers = await Driver.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: drivers
    });
  } catch (error) {
    next(error);
  }
};

// Create new driver
exports.createDriver = async (req, res, next) => {
  try {
    const { name, email, phone, password, licenseNumber, licenseExpiry } = req.body;

    const existingDriver = await Driver.findOne({ $or: [{ email }, { phone }] });
    if (existingDriver) {
      return res.status(400).json({
        success: false,
        message: 'Driver with this email or phone already exists'
      });
    }

    const driver = await Driver.create({
      name,
      email,
      phone,
      password,
      licenseNumber,
      licenseExpiry
    });

    res.status(201).json({
      success: true,
      message: 'Driver created successfully',
      data: {
        _id: driver._id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone
      }
    });
  } catch (error) {
    next(error);
  }
};

// Reject agent
exports.rejectAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    agent.isBlocked = true;
    await agent.save();

    res.json({
      success: true,
      message: 'Agent rejected successfully',
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

// Get all bookings
exports.getBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = status ? { status } : {};

    const bookings = await Booking.find(query)
      .populate('user', 'name email phone')
      .populate('agent', 'companyName email phone')
      .populate('visa')
      .populate('bus')
      .populate('seat')
      .populate('payment')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Booking.countDocuments(query);

    res.json({
      success: true,
      data: {
        bookings,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update booking status
exports.updateBookingStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const booking = await Booking.findById(req.params.id);
    booking.status = status;
    await booking.save();

    res.json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Get all payments
exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find()
      .populate('booking')
      .populate('user')
      .populate('agent')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    next(error);
  }
};

// Add balance to agent wallet
exports.addWalletBalance = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const agent = await Agent.findById(req.params.id);

    agent.wallet.balance += amount;
    agent.wallet.transactions.push({
      type: 'credit',
      amount,
      description: 'Balance added by admin'
    });

    await agent.save();

    res.json({
      success: true,
      message: 'Balance added successfully',
      data: {
        balance: agent.wallet.balance
      }
    });
  } catch (error) {
    next(error);
  }
};

// Deduct from agent wallet
exports.deductWalletBalance = async (req, res, next) => {
  try {
    const { amount } = req.body;
    const agent = await Agent.findById(req.params.id);

    if (agent.wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }

    agent.wallet.balance -= amount;
    agent.wallet.transactions.push({
      type: 'debit',
      amount,
      description: 'Balance deducted by admin'
    });

    await agent.save();

    res.json({
      success: true,
      message: 'Balance deducted successfully',
      data: {
        balance: agent.wallet.balance
      }
    });
  } catch (error) {
    next(error);
  }
};
