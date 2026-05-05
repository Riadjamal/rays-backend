const Agent = require('../models/Agent');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Bus = require('../models/Bus');
const Seat = require('../models/Seat');
const Payment = require('../models/Payment');

// Get agent dashboard stats
exports.getDashboard = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.userId);
    const bookingsThisMonth = await Booking.countDocuments({
      agent: req.userId,
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });

    // Mock chart data for now
    const chartData = [
      { name: 'Mon', bookings: 4 },
      { name: 'Tue', bookings: 7 },
      { name: 'Wed', bookings: 5 },
      { name: 'Thu', bookings: 8 },
      { name: 'Fri', bookings: 12 },
      { name: 'Sat', bookings: 9 },
      { name: 'Sun', bookings: 6 }
    ];

    res.json({
      success: true,
      balance: agent.wallet.balance,
      bookingsThisMonth,
      chartData
    });
  } catch (error) {
    next(error);
  }
};

// Get agent profile
exports.getProfile = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.userId);

    res.json({
      success: true,
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

// Update agent profile
exports.updateProfile = async (req, res, next) => {
  try {
    const { companyName, contactPerson, phone, companyDetails } = req.body;

    const agent = await Agent.findById(req.userId);

    if (companyName) agent.companyName = companyName;
    if (contactPerson) agent.contactPerson = contactPerson;
    if (phone) agent.phone = phone;
    if (companyDetails) agent.companyDetails = { ...agent.companyDetails, ...companyDetails };

    await agent.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

// Get wallet balance
exports.getWallet = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.userId);

    res.json({
      success: true,
      data: {
        balance: agent.wallet.balance,
        transactions: agent.wallet.transactions
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

    const agent = await Agent.findById(req.userId);

    agent.wallet.balance += amount;
    agent.wallet.transactions.push({
      type: 'credit',
      amount,
      description: `Wallet recharge via ${paymentMethod}`
    });

    await agent.save();

    res.json({
      success: true,
      message: 'Wallet recharged successfully',
      data: {
        balance: agent.wallet.balance
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get wallet transactions
exports.getWalletTransactions = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.userId);

    res.json({
      success: true,
      data: agent.wallet.transactions
    });
  } catch (error) {
    next(error);
  }
};

// Create booking
exports.createBooking = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      customerEmail,
      customerPhone,
      travelDate,
      location,
      productType,
      documents,
      passportNumber,
      passportExpiry,
      nationality,
      dateOfBirth,
      busId,
      seatNumber,
      row,
      column,
      isReturnTrip,
      returnDate,
      returnSeatNumber,
      returnRow,
      returnColumn
    } = req.body;

    const agent = await Agent.findById(req.userId);

    if (!agent.isApproved) {
      return res.status(403).json({ success: false, message: 'Agent account not approved' });
    }

    // 1. Wallet Balance Check
    // 1. Get dynamic pricing from Service model
    const Service = require('../models/Service');
    const service = await Service.findOne({ key: productType });
    if (!service) {
        return res.status(400).json({ success: false, message: 'Invalid service type selected' });
    }
    
    let basePrice = service.price;
    // Add return trip cost if applicable
    if (isReturnTrip && returnDate) {
        const returnService = await Service.findOne({ key: 'return_transfer' });
        basePrice += (returnService ? returnService.price : 50);
    }
    
    const price = basePrice;
    
    if (agent.wallet.balance < price) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
    }

    // 2. Find or Create User
    let user = await User.findOne({ email: customerEmail });
    if (!user) {
      user = await User.create({
        name: `${firstName} ${lastName}`,
        email: customerEmail,
        phone: customerPhone,
        password: Math.random().toString(36).slice(-8),
        passportDetails: { number: passportNumber, expiryDate: passportExpiry, nationality, dob: dateOfBirth }
      });
    }

    // 3. Create Booking
    const isVisaRequired = productType.includes('extension') || productType.includes('b2b');
    const booking = await Booking.create({
      bookingNumber: `BK-${Date.now().toString(36).toUpperCase()}`,
      user: user._id,
      agent: agent._id,
      travelDate,
      location,
      productType,
      firstName,
      lastName,
      dateOfBirth,
      passengerName: `${firstName} ${lastName}`,
      passportDetails: { number: passportNumber, expiryDate: passportExpiry, nationality },
      documents,
      bus: busId,
      status: isVisaRequired ? 'processing' : 'confirmed',
      totalAmount: price,
      isReturnTrip: !!isReturnTrip,
      returnDate: isReturnTrip ? returnDate : null
    });

    // 3a. Create Visa Application only if required
    if (isVisaRequired) {
        const Visa = require('../models/Visa');
        const visa = await Visa.create({
            booking: booking._id,
            status: 'pending',
            visaType: productType.includes('shj') ? 'SHJ' : productType.includes('dxb') ? 'DXB' : 'OMAN',
            appliedDate: new Date()
        });
        booking.visa = visa._id;
        await booking.save();
    }

    // 4. Handle Departure Seat Reservation
    const Seat = require('../models/Seat');
    if (seatNumber) {
        const seat = await Seat.create({
            bus: busId,
            seatNumber,
            row,
            column,
            tripDate: new Date(travelDate),
            isBooked: true,
            bookedBy: agent._id,
            booking: booking._id
        });
        booking.seat = seat._id;
        await booking.save();
    }

    // 4a. Handle Return Seat Reservation if applicable
    if (isReturnTrip && returnSeatNumber) {
        const rSeat = await Seat.create({
            bus: busId, // Usually same bus for return, or we could handle returnBusId later
            seatNumber: returnSeatNumber,
            row: returnRow,
            column: returnColumn,
            tripDate: new Date(returnDate),
            isBooked: true,
            bookedBy: agent._id,
            booking: booking._id
        });
        booking.returnSeat = rSeat._id;
        await booking.save();
    }

    // 5. Create Payment Record
    const payment = await Payment.create({
        booking: booking._id,
        user: agent._id,
        amount: price,
        type: 'wallet',
        status: 'completed',
        transactionId: `TXN-${Date.now().toString(36).toUpperCase()}`
    });
    booking.payment = payment._id;
    await booking.save();

    // 6. Deduct from Wallet
    agent.wallet.balance -= price;
    agent.wallet.transactions.push({
      type: 'debit',
      amount: price,
      description: `Payment for booking ${booking.bookingNumber}`,
      booking: booking._id
    });
    await agent.save();

    // 7. Notify User
    const { sendBookingConfirmation } = require('../utils/mailer');
    await sendBookingConfirmation(customerEmail, {
        bookingNumber: booking.bookingNumber,
        passengerName: customerName,
        travelDate,
        location
    });

    res.status(201).json({
      success: true,
      message: 'Booking confirmed and seat reserved!',
      data: booking
    });
  } catch (error) {
    console.error("Agent Booking Error Details:", error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ 
            success: false, 
            message: 'Validation Error', 
            errors: error.errors 
        });
    }
    next(error);
  }
};

// Get agent bookings
exports.getBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ agent: req.userId })
      .populate('user')
      .populate('visa')
      .populate({
        path: 'bus',
        populate: { path: 'driver' }
      })
      .populate('seat')
      .populate('returnSeat')
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

// Get booking details
exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      agent: req.userId
    })
      .populate('user')
      .populate('visa')
      .populate({
        path: 'bus',
        populate: { path: 'driver' }
      })
      .populate('seat')
      .populate('returnSeat')
      .populate('payment');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.json({
      success: true,
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Cancel booking
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      agent: req.userId
    }).populate('payment');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking already cancelled'
      });
    }

    const now = new Date();
    const travelDate = new Date(booking.travelDate);
    const hoursDiff = (travelDate - now) / (1000 * 60 * 60);

    // Cancellation policy according to client excel
    if (hoursDiff > 24) {
      booking.cancellationFee = 0;
    } else if (hoursDiff > 8) {
      booking.cancellationFee = 15; // Fixed 15 AED fee as per excel
    } else {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel within 8 hours of travel. Oman Visa fee is non-refundable.'
      });
    }

    booking.status = 'cancelled';
    booking.cancellationDate = now;
    await booking.save();

    // Refund to wallet if paid with wallet
    if (booking.payment && booking.payment.type === 'wallet') {
      const agent = await Agent.findById(req.userId);
      const refundAmount = booking.payment.amount - booking.cancellationFee;
      agent.wallet.balance += refundAmount;
      agent.wallet.transactions.push({
        type: 'credit',
        amount: refundAmount,
        description: `Refund for cancelled booking ${booking.bookingNumber}`
      });
      await agent.save();
    }

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Update booking (date/bus change)
exports.updateBooking = async (req, res, next) => {
  try {
    const { travelDate, location, busId } = req.body;
    
    const booking = await Booking.findOne({
      _id: req.params.id,
      agent: req.userId
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update cancelled booking'
      });
    }

    // Update fields
    if (travelDate) booking.travelDate = travelDate;
    if (location) booking.location = location;
    if (busId) booking.bus = busId;

    // Release old seat if bus/date changed
    if (booking.seat && (busId || travelDate)) {
      await Seat.findByIdAndDelete(booking.seat);
      booking.seat = null;
    }

    await booking.save();

    res.json({
      success: true,
      message: 'Booking updated successfully. Please reassign seat if needed.',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Request refund from wallet
exports.requestRefund = async (req, res, next) => {
  try {
    const { amount, reason } = req.body;
    const agent = await Agent.findById(req.userId);

    if (agent.wallet.balance < amount) {
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance for this refund amount' });
    }

    const RefundRequest = require('../models/RefundRequest');
    const refund = await RefundRequest.create({
      agent: req.userId,
      amount,
      reason,
      status: 'pending'
    });

    // Notify Finance (Admins with finance role or all admins)
    const { sendNotification } = require('./notificationController');
    const User = require('../models/User');
    const financeStaff = await User.find({ role: { $in: ['admin', 'finance'] } });
    
    for (const staff of financeStaff) {
        await sendNotification(staff._id, 'User', 'finance_alert', 
            `New Refund Request: AED ${amount} from ${agent.companyName}`);
    }

    res.json({
      success: true,
      message: 'Refund request submitted to Finance team',
      data: refund
    });
  } catch (error) {
    next(error);
  }
};
