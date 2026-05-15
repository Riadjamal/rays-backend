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
    const { companyName, contactPerson, phone, companyDetails, logo, directNumber } = req.body;

    const agent = await Agent.findById(req.userId);

    if (companyName !== undefined) agent.companyName = companyName;
    if (contactPerson !== undefined) agent.contactPerson = contactPerson;
    if (phone !== undefined) agent.phone = phone;
    if (logo !== undefined) agent.logo = logo;
    if (directNumber !== undefined) agent.directNumber = directNumber;
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

// Recharge wallet request
exports.rechargeWallet = async (req, res, next) => {
  try {
    const { amount, paymentMethod, transferSlip, bankSlip } = req.body;

    // Create a pending payment record for the accountant to approve
    // Map frontend labels to backend enum values
    let mappedMethod = 'bank_transfer';
    if (paymentMethod === 'Credit Card' || paymentMethod === 'card') mappedMethod = 'card';
    if (paymentMethod === 'Bank Transfer') mappedMethod = 'bank_transfer';

    const payment = await Payment.create({
      agent: req.userId,
      amount,
      type: 'recharge',
      paymentMethod: mappedMethod,
      bankSlip: transferSlip || bankSlip || '',
      status: 'pending',
      transactionId: `REC-${Date.now().toString(36).toUpperCase()}`
    });

    res.json({
      success: true,
      message: 'Recharge request submitted successfully. Balance will be added once the Accountant confirms the transaction.',
      data: {
        paymentId: payment._id,
        status: payment.status
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
      passengerName,
      customerEmail,
      customerPhone,
      whatsappNumber,
      travelDate,
      location,
      productType,
      documents,
      contactDetails,
      passportNumber,
      passportExpiry,
      passportDetails,
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

    // 1. Get dynamic pricing
    const Service = require('../models/Service');
    const Bus = require('../models/Bus');
    const service = await Service.findOne({ key: productType });
    const bus = await Bus.findById(busId);
    
    if (!service) {
        return res.status(400).json({ success: false, message: 'Invalid service type selected' });
    }
    if (!bus) {
        return res.status(400).json({ success: false, message: 'Bus not found' });
    }
    
    // Check if agent has custom pricing for this service
    let price = bus.price + service.price;
    const customPriceEntry = agent.productPricing?.find(p => p.service.toString() === service._id.toString());
    
    if (customPriceEntry) {
        if (!customPriceEntry.isActive) {
            return res.status(403).json({ success: false, message: 'This service is currently disabled for your agency' });
        }
        if (customPriceEntry.agentPrice > 0) {
            price = bus.price + customPriceEntry.agentPrice;
        }
    }
    
    // Add return trip cost if applicable
    if (isReturnTrip && returnDate) {
        const returnService = await Service.findOne({ key: 'return_transfer' });
        price += (returnService ? returnService.price : 50);
    }
    
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

    const booking = await Booking.create({
      bookingNumber: `BK-${Date.now().toString(36).toUpperCase()}`,
      user: user._id,
      agent: agent._id,
      travelDate,
      location,
      productType: productType || 'return_transfer',
      firstName: firstName || passengerName?.split(' ')[0],
      lastName: lastName || passengerName?.split(' ').slice(1).join(' '),
      passengerName: passengerName || `${firstName} ${lastName}`,
      dateOfBirth,
      contactDetails: {
          mobileNumber: customerPhone || contactDetails?.mobileNumber,
          emailId: customerEmail || contactDetails?.emailId,
          whatsAppNumber: whatsappNumber || contactDetails?.whatsAppNumber
      },
      passportDetails: { 
          number: passportNumber || passportDetails?.number, 
          expiryDate: passportExpiry || passportDetails?.expiryDate, 
          nationality: nationality || passportDetails?.nationality, 
          dob: dateOfBirth 
      },
      documents: documents || {},
      bus: busId,
      status: 'processing',
      totalAmount: price,
      isReturnTrip: !!isReturnTrip,
      returnDate: isReturnTrip ? returnDate : null
    });

    // 3. Create Visa Application only if required
    if (service.type === 'visa') {
        // Detect Visa Category for the 3-box dashboard
        let visaCategory = 'oman_visa';
        const lowerName = service.name.toLowerCase();
        const lowerKey = service.key.toLowerCase();
        
        if (lowerName.includes('saudi') || lowerKey.includes('saudi')) {
            visaCategory = 'saudi_visa';
        } else if (lowerName.includes('uae') && !lowerName.includes('oman')) {
            // If it only says UAE (like UAE Tourist Visa)
            visaCategory = 'uae_visa';
        } else {
            // Default to Oman for B2B and Oman-related visas
            visaCategory = 'oman_visa';
        }

        const visa = await Visa.create({
            booking: booking._id,
            status: 'pending',
            type: visaCategory,
            visaType: lowerKey.includes('shj') ? 'SHJ' : lowerKey.includes('dxb') ? 'DXB' : 'OMAN',
            appliedDate: new Date()
        });
        booking.visa = visa._id;
        await booking.save();
        console.log(`✅ Visa record created: ${visa._id} for category: ${visaCategory}`);
    }

    // 4. Handle Departure Seat Reservation
    const Seat = require('../models/Seat');
    if (seatNumber) {
        const depDate = new Date(travelDate);
        depDate.setUTCHours(0, 0, 0, 0); // Use UTC for consistency
        
        const seat = await Seat.findOneAndUpdate(
            { bus: busId, seatNumber, tripDate: depDate },
            { 
                row, 
                column, 
                isBooked: true, 
                bookedBy: agent._id, 
                booking: booking._id 
            },
            { upsert: true, new: true }
        );
        booking.seat = seat._id;
        await booking.save();
    }

    // 4a. Handle Return Seat Reservation if applicable
    if (isReturnTrip && returnSeatNumber) {
        const retDate = new Date(returnDate);
        retDate.setUTCHours(0, 0, 0, 0); // Use UTC for consistency

        const rSeat = await Seat.findOneAndUpdate(
            { bus: busId, seatNumber: returnSeatNumber, tripDate: retDate },
            { 
                row: returnRow, 
                column: returnColumn, 
                isBooked: true, 
                bookedBy: agent._id, 
                booking: booking._id 
            },
            { upsert: true, new: true }
        );
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
    // Add booking reference to agent
    agent.bookings.push(booking._id);
    await agent.save();

    // 7. Notify User
    const { sendBookingConfirmation } = require('../utils/mailer');
    await sendBookingConfirmation(customerEmail, {
        bookingNumber: booking.bookingNumber,
        passengerName: booking.passengerName,
        travelDate,
    });
    
    // Populate agent info for immediate use (e.g. voucher)
    await booking.populate('agent', 'companyName logo directNumber phone email');
    await booking.populate({
        path: 'bus',
        populate: { path: 'driver' }
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
      .populate('agent', 'companyName logo directNumber phone email')
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
      .populate('agent', 'companyName logo directNumber phone email')
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
    const { 
      travelDate, location, busId,
      firstName, lastName, passportNumber, nationality
    } = req.body;
    
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

    // Update logistics
    if (travelDate) {
        const normalizedDate = new Date(travelDate);
        normalizedDate.setUTCHours(0, 0, 0, 0);
        booking.travelDate = normalizedDate;
    }
    if (location) booking.location = location;
    if (busId) booking.bus = busId;

    // Update passenger info
    if (firstName) booking.firstName = firstName;
    if (lastName) booking.lastName = lastName;
    if (firstName || lastName) {
        booking.passengerName = `${firstName || booking.firstName} ${lastName || booking.lastName}`;
    }
    if (passportNumber) {
        booking.passportDetails = { ...booking.passportDetails, number: passportNumber };
    }
    if (nationality) {
        booking.passportDetails = { ...booking.passportDetails, nationality: nationality };
    }

    // Release old seat if bus/date changed
    if (booking.seat && (busId || travelDate)) {
      const Seat = require('../models/Seat');
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

// GET all active services for agent
exports.getServices = async (req, res, next) => {
  try {
    const Service = require('../models/Service');
    const services = await Service.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: services
    });
  } catch (error) {
    next(error);
  }
};
