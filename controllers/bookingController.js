const Booking = require('../models/Booking');
const User = require('../models/User');
const Agent = require('../models/Agent');
const Payment = require('../models/Payment');
const Seat = require('../models/Seat');
const Bus = require('../models/Bus');
const { validateBookingPayload } = require('../utils/bookingValidation');
const { syncCompletedBookings } = require('../utils/tripTiming');

const resolveBookingLocation = (location, route = '') => {
  if (location) return location;
  const normalizedRoute = route.toLowerCase();
  return normalizedRoute.includes('dubai') || normalizedRoute.includes('dxb') ? 'DXB' : 'SHJ';
};

const isVisaRequiredForProduct = (productType = '') => {
  const normalized = productType.toLowerCase();
  return normalized.includes('oman') ||
    normalized.includes('visa') ||
    normalized.includes('b2b') ||
    normalized.includes('extension');
};

async function getBookingQuote(payload, userId, userRole = 'user') {
  const { bus, seat, seats, passengerCount, productType, isReturn } = payload;
  const busDoc = await Bus.findById(bus);

  if (!busDoc) {
    const error = new Error('Bus not found');
    error.statusCode = 404;
    throw error;
  }

  const requestedSeats = Array.isArray(seats)
    ? seats.filter(Boolean)
    : seat && seat !== 'AUTO'
      ? [seat]
      : [];
  const requestedPassengerCount = Math.max(
    1,
    Number(passengerCount) || requestedSeats.length || (seat === 'AUTO' ? 1 : 1)
  );

  const Service = require('../models/Service');
  const Setting = require('../models/Setting');

  const serviceDoc = await Service.findOne({ key: productType || 'oman_uae_30' });
  let servicePrice = serviceDoc ? serviceDoc.price : (productType?.includes('60') ? 250 : 200);

  if (userRole === 'agent' && serviceDoc) {
    const agent = await Agent.findById(userId);
    const customPricing = agent?.productPricing?.find((pricing) =>
      pricing.service?.toString() === serviceDoc._id.toString()
    );

    if (customPricing) {
      if (!customPricing.isActive) {
        const error = new Error('This service is currently disabled for your account');
        error.statusCode = 403;
        throw error;
      }
      if (customPricing.agentPrice !== undefined) {
        servicePrice = customPricing.agentPrice;
      }
    }
  }

  const serviceFeeSetting = await Setting.findOne({ key: 'user_service_fee' });
  const serviceFee = serviceFeeSetting ? parseFloat(serviceFeeSetting.value) : 7.5;
  const returnFee = isReturn
    ? ((await Service.findOne({ key: 'return_transfer' }))?.price || 50)
    : 0;
  const perPassengerTotal = (busDoc.price || 150) + servicePrice + serviceFee + returnFee;

  return {
    busDoc,
    requestedPassengerCount,
    servicePrice,
    serviceFee,
    returnFee,
    totalPrice: perPassengerTotal * requestedPassengerCount,
    bookingLocation: resolveBookingLocation(payload.location, busDoc.route),
    isVisaRequired: isVisaRequiredForProduct(productType)
  };
}

async function createBookingFromPayload({ payload, userId, userRole = 'user', existingPayment = null }) {
  const {
    bus,
    travelDate,
    travelTime,
    passengerName,
    firstName,
    lastName,
    dateOfBirth,
    mobileNumber,
    emailId,
    whatsAppNumber,
    nationality,
    passportExpiry,
    seat,
    seats,
    productType,
    isReturn,
    paymentMethod,
    bankSlip,
    passportFile,
    photoFile,
    uaeVisaFile,
    razorpay_payment_id,
    returnDate
  } = payload;

  const validation = validateBookingPayload(payload);
  if (validation.errors.length) {
    const error = new Error(validation.errors[0]);
    error.statusCode = 400;
    error.details = validation.errors;
    throw error;
  }

  const {
    busDoc,
    requestedPassengerCount,
    totalPrice,
    bookingLocation,
    isVisaRequired
  } = await getBookingQuote(payload, userId, userRole);

  const startOfDay = new Date(travelDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(travelDate);
  endOfDay.setHours(23, 59, 59, 999);

  const occupiedSeats = await Seat.find({
    bus,
    tripDate: { $gte: startOfDay, $lte: endOfDay }
  });

  const occupiedSeatNumbers = occupiedSeats.map((seatDoc) => seatDoc.seatNumber);
  const requestedSeats = Array.isArray(seats)
    ? seats.filter(Boolean)
    : seat && seat !== 'AUTO'
      ? [seat]
      : [];

  let finalSeatNumbers = [];

  if (seat === 'AUTO' || requestedSeats.length === 0) {
    finalSeatNumbers = busDoc.seatLayout.configuration
      .filter((seatConfig) => !seatConfig.isAisle && !occupiedSeatNumbers.includes(seatConfig.seatNumber))
      .slice(0, requestedPassengerCount)
      .map((seatConfig) => seatConfig.seatNumber);

    if (finalSeatNumbers.length < requestedPassengerCount) {
      const error = new Error('Not enough seats available on this bus');
      error.statusCode = 400;
      throw error;
    }
  } else {
    const uniqueSeats = [...new Set(requestedSeats)];

    if (uniqueSeats.length !== requestedPassengerCount) {
      const error = new Error('Please select the required number of seats');
      error.statusCode = 400;
      throw error;
    }

    for (const seatNumber of uniqueSeats) {
      if (occupiedSeatNumbers.includes(seatNumber)) {
        const error = new Error(`Seat ${seatNumber} is already booked or blocked`);
        error.statusCode = 400;
        throw error;
      }

      const validSeat = busDoc.seatLayout.configuration.find((seatConfig) => seatConfig.seatNumber === seatNumber);
      if (!validSeat) {
        const error = new Error(`Invalid seat number: ${seatNumber}`);
        error.statusCode = 404;
        throw error;
      }
    }

    finalSeatNumbers = uniqueSeats;
  }

  const ts = Date.now().toString(36);
  const rnd = Math.random().toString(36).substr(2, 5);
  const generatedBookingNumber = `BK-${ts.toUpperCase()}-${rnd.toUpperCase()}`;

  const booking = await Booking.create({
    bookingNumber: generatedBookingNumber,
    user: userId,
    bus,
    travelDate,
    travelTime: travelTime || busDoc.departureTime || busDoc.startTime || '',
    firstName: firstName || passengerName?.split(' ')[0],
    lastName: lastName || passengerName?.split(' ').slice(1).join(' '),
    passengerName: passengerName || `${firstName} ${lastName}`,
    dateOfBirth,
    contactDetails: {
      mobileNumber,
      emailId,
      whatsAppNumber
    },
    passportDetails: {
      number: validation.normalized.passportNumber,
      nationality,
      expiryDate: passportExpiry
    },
    location: bookingLocation,
    productType: productType || (isReturn ? 'oman_uae_30' : 'standard_transfer'),
    status: 'processing',
    totalAmount: totalPrice,
    passengerCount: requestedPassengerCount,
    seatNumbers: finalSeatNumbers,
    isReturnTrip: isReturn || false,
    returnDate: isReturn ? returnDate : null,
    paymentMethod: paymentMethod || 'card',
    bankSlip: bankSlip || null,
    documents: {
      passport: passportFile,
      photo: photoFile,
      currentVisa: uaeVisaFile
    },
    paymentId: razorpay_payment_id
  });

  const createdSeats = [];
  for (const seatNumber of finalSeatNumbers) {
    const seatConfig = busDoc.seatLayout.configuration.find((config) => config.seatNumber === seatNumber);
    const seatDoc = await Seat.create({
      bus,
      seatNumber,
      row: seatConfig.row,
      column: seatConfig.column,
      tripDate: startOfDay,
      isBooked: true,
      bookedBy: userId,
      booking: booking._id
    });
    createdSeats.push(seatDoc);
  }

  let visaDoc = null;
  if (isVisaRequired) {
    const Visa = require('../models/Visa');
    let visaType = 'oman_visa';
    if (productType?.toLowerCase().includes('saudi')) visaType = 'saudi_visa';
    else if (productType?.toLowerCase().includes('uae')) visaType = 'uae_visa';

    visaDoc = await Visa.create({
      booking: booking._id,
      type: visaType,
      status: 'pending',
      visaType: visaType === 'oman_visa' ? 'OMAN' : (visaType === 'saudi_visa' ? 'SAUDI' : 'UAE'),
      appliedDate: new Date()
    });
    booking.visa = visaDoc._id;
  }

  booking.seat = createdSeats[0]?._id || null;
  booking.additionalSeats = createdSeats.slice(1).map((seatDoc) => seatDoc._id);
  if (visaDoc) {
    booking.visa = visaDoc._id;
  }

  let paymentRecord = existingPayment;
  if (!paymentRecord) {
    paymentRecord = await Payment.create({
      booking: booking._id,
      user: userRole === 'user' ? userId : undefined,
      agent: userRole === 'agent' ? userId : undefined,
      amount: totalPrice,
      type: 'card',
      paymentMethod: paymentMethod || 'card',
      bankSlip: bankSlip || null,
      status: paymentMethod === 'bank_transfer' ? 'pending' : 'completed',
      transactionId: razorpay_payment_id || `TRX-${Date.now()}`
    });
  } else {
    paymentRecord.booking = booking._id;
    paymentRecord.user = userRole === 'user' ? userId : paymentRecord.user;
    paymentRecord.agent = userRole === 'agent' ? userId : paymentRecord.agent;
    paymentRecord.amount = totalPrice;
    paymentRecord.type = 'card';
    paymentRecord.paymentMethod = paymentMethod || paymentRecord.paymentMethod || 'card';
    paymentRecord.bankSlip = bankSlip || paymentRecord.bankSlip || null;
    paymentRecord.status = paymentMethod === 'bank_transfer' ? 'pending' : 'completed';
    paymentRecord.processedAt = new Date();
    if (!paymentRecord.transactionId) {
      paymentRecord.transactionId = `TRX-${Date.now()}`;
    }
    await paymentRecord.save();
  }

  booking.payment = paymentRecord._id;
  await booking.save();

  await User.findByIdAndUpdate(userId, {
    $push: { bookings: booking._id }
  });

  const { sendNotification } = require('../controllers/notificationController');
  await sendNotification(
    userId,
    'User',
    'booking_confirmation',
    `Your booking ${booking.bookingNumber} has been created successfully`
  );

  const Admin = require('../models/Admin');
  const admins = await Admin.find({});
  for (const admin of admins) {
    await sendNotification(
      admin._id,
      'Admin',
      'admin_alert',
      `New booking received: ${booking.bookingNumber} from ${passengerName || `${firstName} ${lastName}`}`
    );
  }

  await booking.populate([
    { path: 'seat' },
    { path: 'additionalSeats' },
    { path: 'payment' },
    { path: 'bus', populate: { path: 'driver', select: 'name phone' } }
  ]);

  return booking;
}

exports.getBookingQuote = getBookingQuote;
exports.createBookingFromPayload = createBookingFromPayload;

exports.createBooking = async (req, res, next) => {
  try {
    const booking = await createBookingFromPayload({
      payload: req.body,
      userId: req.userId,
      userRole: req.userRole
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
        errors: error.details || undefined
      });
    }
    next(error);
  }
};


exports.getAllBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = status ? { status } : {};

    const bookings = await Booking.find(query)
      .populate('user', 'name email phone')
      .populate('agent', 'companyName email phone')
      .populate('visa')
      .populate({
        path: 'bus',
        populate: { path: 'driver', select: 'name phone' }
      })
      .populate('seat')
      .populate('additionalSeats')
      .populate('returnSeat')
      .populate('payment')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    await syncCompletedBookings(bookings);

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


exports.getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('user')
      .populate('agent', 'companyName logo directNumber phone email')
      .populate('visa')
      .populate({
        path: 'bus',
        populate: { path: 'driver', select: 'name phone' }
      })
      .populate('seat')
      .populate('additionalSeats')
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

    
    if (hoursDiff > 24) {
      booking.cancellationFee = 0;
    } else if (hoursDiff > 8) {
      booking.cancellationFee = 15; 
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


exports.getMyBookings = async (req, res, next) => {
  try {
    const bookings = await Booking.find({ user: req.userId })
      .populate('bus')
      .populate('seat')
      .populate('additionalSeats')
      .populate('payment')
      .sort({ createdAt: -1 });
    await syncCompletedBookings(bookings);

    res.json({
      success: true,
      data: bookings
    });
  } catch (error) {
    next(error);
  }
};


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


exports.getBookingByNumber = async (req, res, next) => {
  try {
    const { bookingNumber } = req.params;
    const booking = await Booking.findOne({ bookingNumber })
      .populate('user', 'name email phone')
      .populate('agent', 'companyName email phone')
      .populate({
        path: 'bus',
        populate: { path: 'driver', select: 'name phone' }
      })
      .populate('seat')
      .populate('additionalSeats');
    if (booking) { await syncCompletedBookings([booking]); }

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};


exports.requestReschedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newDate } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    booking.rescheduleRequest = {
      requestedDate: newDate,
      status: 'pending',
      requestedAt: new Date()
    };
    
    await booking.save();

    
    const { sendNotification } = require('./notificationController');
    const Admin = require('../models/Admin');
    const admins = await Admin.find({});
    for (const admin of admins) {
        await sendNotification(admin._id, 'Admin', 'admin_alert', 
            `Reschedule request for ${booking.bookingNumber} to ${new Date(newDate).toLocaleDateString()}`);
    }

    res.json({ success: true, message: 'Reschedule request submitted successfully' });
  } catch (error) {
    next(error);
  }
};


exports.trackBooking = async (req, res, next) => {
  try {
    const { pnr } = req.params;
    
    const booking = await Booking.findOne({ bookingNumber: pnr })
      .populate('user', 'name email')
      .populate({
        path: 'bus',
        populate: { path: 'driver', select: 'name phone' }
      })
      .populate('seat')
      .populate('additionalSeats')
      .populate('visa');
    if (booking) { await syncCompletedBookings([booking]); }

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


async function sendNotification(userId, userModel, type, message) {
  
  console.log(`Notification sent to ${userId}: ${message}`);
}

