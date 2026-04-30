const Booking = require('../models/Booking');
const User = require('../models/User');
const Agent = require('../models/Agent');
const Payment = require('../models/Payment');
const Seat = require('../models/Seat');
const Bus = require('../models/Bus');
const nodemailer = require('nodemailer');

// Create booking
exports.createBooking = async (req, res, next) => {
  try {
    const { bus, travelDate, passengerName, passportNumber, nationality, seat, location, productType, isReturn } = req.body;

    // 1. Find the bus
    const busDoc = await Bus.findById(bus);
    if (!busDoc) return res.status(404).json({ success: false, message: 'Bus not found' });

    // 2. Handle Seat Selection & Availability Check
    const startOfDay = new Date(travelDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(travelDate);
    endOfDay.setHours(23, 59, 59, 999);

    const occupiedSeats = await Seat.find({
      bus,
      tripDate: { $gte: startOfDay, $lte: endOfDay }
    });

    const occupiedSeatNumbers = occupiedSeats.map(s => s.seatNumber);
    let finalSeatNumber = seat;

    if (seat === 'AUTO') {
      const availableSeat = busDoc.seatLayout.configuration.find(
        s => !s.isAisle && !occupiedSeatNumbers.includes(s.seatNumber)
      );
      if (!availableSeat) return res.status(400).json({ success: false, message: 'No seats available on this bus' });
      finalSeatNumber = availableSeat.seatNumber;
    } else {
      if (occupiedSeatNumbers.includes(seat)) {
        return res.status(400).json({ success: false, message: 'Seat already booked or blocked' });
      }
      // Ensure seat exists in bus config
      const validSeat = busDoc.seatLayout.configuration.find(s => s.seatNumber === seat);
      if (!validSeat) return res.status(404).json({ success: false, message: 'Invalid seat number' });
    }

    // 3. Create the booking
    const booking = await Booking.create({
      user: req.userId,
      bus,
      travelDate,
      passengerName,
      passportDetails: { number: passportNumber, nationality },
      location: location || busDoc.route,
      productType: productType || (isReturn ? 'with_uae_visa' : 'without_uae_visa'),
      status: 'pending',
      totalAmount: busDoc.price || 150,
      isReturnTrip: isReturn || false
    });

    // 4. Create seat record
    const seatConfig = busDoc.seatLayout.configuration.find(s => s.seatNumber === finalSeatNumber);
    const seatDoc = await Seat.create({
      bus,
      seatNumber: finalSeatNumber,
      row: seatConfig.row,
      column: seatConfig.column,
      tripDate: startOfDay,
      isBooked: true,
      bookedBy: req.userId,
      booking: booking._id
    });

    // 5. Link seat back to booking
    booking.seat = seatDoc._id;
    await booking.save();

    // 6. Add to user's bookings
    await User.findByIdAndUpdate(req.userId, {
      $push: { bookings: booking._id }
    });

    // 6. Send notification
    await sendNotification(req.userId, 'User', 'booking_confirmation',
      `Your booking ${booking.bookingNumber} has been created successfully`);

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Get all bookings (for admin)
exports.getAllBookings = async (req, res, next) => {
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

// Get booking by ID
exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user')
      .populate('agent')
      .populate('visa')
      .populate('bus')
      .populate('seat')
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

// Cancel booking
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

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

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};

// Get my bookings (for user)
exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.userId })
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

// Get bookings without seats for a specific trip
exports.getUnassignedBookings = async (req, res, next) => {
  try {
    const { busId, date } = req.query;
    
    if (!busId || !date) {
        return res.status(400).json({ success: false, message: 'Bus ID and date are required' });
    }

    const startOfDay = new Date(date);
    if (isNaN(startOfDay.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid date format' });
    }
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await Booking.find({
      bus: busId,
      travelDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $in: ['pending', 'confirmed', 'processing'] },
      $or: [{ seat: null }, { seat: { $exists: false } }]
    }).populate('user', 'name email')
      .populate('agent', 'companyName email');

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};

// Track booking (public)
exports.trackBooking = async (req, res, next) => {
  try {
    const { pnr } = req.params;
    
    const booking = await Booking.findOne({ bookingNumber: pnr })
      .populate('user', 'name email')
      .populate('bus')
      .populate('seat')
      .populate('visa');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'No booking found with this PNR number'
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

// Helper function to send notification
async function sendNotification(userId, userModel, type, message) {
  // In production, integrate with email/WhatsApp services
  console.log(`Notification sent to ${userId}: ${message}`);
}
