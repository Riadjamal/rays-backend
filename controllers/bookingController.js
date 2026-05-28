const Booking = require('../models/Booking');const User = require('../models/User');const Agent = require('../models/Agent');const Payment = require('../models/Payment');const Seat = require('../models/Seat');const Bus = require('../models/Bus');const nodemailer = require('nodemailer');exports.createBooking = async (req, res, next) => {
  try {
    const {
      bus, travelDate, passengerName,
      firstName, lastName, dateOfBirth,
      mobileNumber, emailId, whatsAppNumber,
      passportNumber, nationality, passportExpiry,
      seat, seats, passengerCount,
      location, productType, isReturn,
      paymentMethod, bankSlip,
      passportFile, photoFile, uaeVisaFile, razorpay_payment_id,
      returnDate
    } = req.body;

    const busDoc = await Bus.findById(bus);
    if (!busDoc) return res.status(404).json({ success: false, message: 'Bus not found' });

    const startOfDay = new Date(travelDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(travelDate);
    endOfDay.setHours(23, 59, 59, 999);

    const occupiedSeats = await Seat.find({
      bus,
      tripDate: { $gte: startOfDay, $lte: endOfDay }
    });

    const occupiedSeatNumbers = occupiedSeats.map((s) => s.seatNumber);
    const requestedSeats = Array.isArray(seats)
      ? seats.filter(Boolean)
      : seat && seat !== 'AUTO'
        ? [seat]
        : [];
    const requestedPassengerCount = Math.max(
      1,
      Number(passengerCount) || requestedSeats.length || (seat === 'AUTO' ? 1 : 1)
    );

    let finalSeatNumbers = [];

    if (seat === 'AUTO' || requestedSeats.length === 0) {
      finalSeatNumbers = busDoc.seatLayout.configuration
        .filter((seatConfig) => !seatConfig.isAisle && !occupiedSeatNumbers.includes(seatConfig.seatNumber))
        .slice(0, requestedPassengerCount)
        .map((seatConfig) => seatConfig.seatNumber);

      if (finalSeatNumbers.length < requestedPassengerCount) {
        return res.status(400).json({ success: false, message: 'Not enough seats available on this bus' });
      }
    } else {
      const uniqueSeats = [...new Set(requestedSeats)];

      if (uniqueSeats.length !== requestedPassengerCount) {
        return res.status(400).json({ success: false, message: 'Please select the required number of seats' });
      }

      for (const seatNumber of uniqueSeats) {
        if (occupiedSeatNumbers.includes(seatNumber)) {
          return res.status(400).json({ success: false, message: `Seat ${seatNumber} is already booked or blocked` });
        }

        const validSeat = busDoc.seatLayout.configuration.find((seatConfig) => seatConfig.seatNumber === seatNumber);
        if (!validSeat) {
          return res.status(404).json({ success: false, message: `Invalid seat number: ${seatNumber}` });
        }
      }

      finalSeatNumbers = uniqueSeats;
    }

    const isVisaRequired = productType?.toLowerCase().includes('oman') ||
      productType?.toLowerCase().includes('visa') ||
      productType?.toLowerCase().includes('b2b') ||
      productType?.toLowerCase().includes('extension');

    let bookingLocation = location;
    if (!bookingLocation) {
      const route = (busDoc.route || '').toLowerCase();
      bookingLocation = route.includes('dubai') || route.includes('dxb') ? 'DXB' : 'SHJ';
    }

    const ts = Date.now().toString(36);
    const rnd = Math.random().toString(36).substr(2, 5);
    const generatedBookingNumber = `BK-${ts.toUpperCase()}-${rnd.toUpperCase()}`;

    const Service = require('../models/Service');
    const serviceDoc = await Service.findOne({ key: productType || 'oman_uae_30' });
    let servicePrice = serviceDoc ? serviceDoc.price : (productType?.includes('60') ? 250 : 200);

    if (req.userRole === 'agent' && serviceDoc) {
      const agent = await Agent.findById(req.userId);
      const customPricing = agent.productPricing?.find((pricing) =>
        pricing.service?.toString() === serviceDoc._id.toString()
      );

      if (customPricing) {
        if (!customPricing.isActive) {
          return res.status(403).json({ success: false, message: 'This service is currently disabled for your account' });
        }
        if (customPricing.agentPrice !== undefined) {
          servicePrice = customPricing.agentPrice;
        }
      }
    }

    const Setting = require('../models/Setting');
    const serviceFeeSetting = await Setting.findOne({ key: 'user_service_fee' });
    const serviceFee = serviceFeeSetting ? parseFloat(serviceFeeSetting.value) : 7.5;
    const returnFee = isReturn
      ? ((await Service.findOne({ key: 'return_transfer' }))?.price || 50)
      : 0;
    const perPassengerTotal = (busDoc.price || 150) + servicePrice + serviceFee + returnFee;
    const totalPrice = perPassengerTotal * requestedPassengerCount;

    const booking = await Booking.create({
      bookingNumber: generatedBookingNumber,
      user: req.userId,
      bus,
      travelDate,
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
        number: passportNumber,
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
        bookedBy: req.userId,
        booking: booking._id
      });
      createdSeats.push(seatDoc);
    }

    let visaDoc = null;
    if (isVisaRequired) {
      const Visa = require('../models/Visa');
      let vType = 'oman_visa';
      if (productType?.toLowerCase().includes('saudi')) vType = 'saudi_visa';
      else if (productType?.toLowerCase().includes('uae')) vType = 'uae_visa';

      visaDoc = await Visa.create({
        booking: booking._id,
        type: vType,
        status: 'pending',
        visaType: vType === 'oman_visa' ? 'OMAN' : (vType === 'saudi_visa' ? 'SAUDI' : 'UAE'),
        appliedDate: new Date()
      });
      booking.visa = visaDoc._id;
    }

    booking.seat = createdSeats[0]?._id || null;
    booking.additionalSeats = createdSeats.slice(1).map((seatDoc) => seatDoc._id);
    if (isVisaRequired && visaDoc) booking.visa = visaDoc._id;
    await booking.save();

    await User.findByIdAndUpdate(req.userId, {
      $push: { bookings: booking._id }
    });

    // Create Payment Record
    const payment = await Payment.create({
      booking: booking._id,
      user: req.userRole === 'user' ? req.userId : undefined,
      agent: req.userRole === 'agent' ? req.userId : undefined,
      amount: totalPrice,
      type: 'card',
      paymentMethod: paymentMethod || 'card',
      bankSlip: bankSlip || null,
      status: paymentMethod === 'bank_transfer' ? 'pending' : 'completed',
      transactionId: razorpay_payment_id || `TRX-${Date.now()}`
    });

    booking.payment = payment._id;
    await booking.save();


    const { sendNotification } = require('../controllers/notificationController');
    await sendNotification(req.userId, 'User', 'booking_confirmation',
      `Your booking ${booking.bookingNumber} has been created successfully`);

    const Admin = require('../models/Admin');
    const admins = await Admin.find({});
    for (const admin of admins) {
      await sendNotification(admin._id, 'Admin', 'admin_alert',
        `New booking received: ${booking.bookingNumber} from ${passengerName || `${firstName} ${lastName}`}`);
    }

    await booking.populate('seat')
      .populate('additionalSeats');
    await booking.populate('additionalSeats');
    await booking.populate({
      path: 'bus',
      populate: { path: 'driver', select: 'name phone' }
    });

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      data: booking
    });
  } catch (error) {
    next(error);
  }
};


exports.getAllBookings = async (req, res, next) => {  try {    const { status, page = 1, limit = 20 } = req.query;    const query = status ? { status } : {};    const bookings = await Booking.find(query)      .populate('user', 'name email phone')      .populate('agent', 'companyName email phone')      .populate('visa')      .populate({        path: 'bus',        populate: { path: 'driver', select: 'name phone' }      })      .populate('seat')
      .populate('additionalSeats')      .populate('returnSeat')      .populate('payment')      .sort({ createdAt: -1 })      .limit(limit * 1)      .skip((page - 1) * limit);    const count = await Booking.countDocuments(query);    res.json({      success: true,      data: {        bookings,        totalPages: Math.ceil(count / limit),        currentPage: page,        total: count      }    });  } catch (error) {    next(error);  }};exports.getBookingById = async (req, res, next) => {  try {    const booking = await Booking.findById(req.params.id)      .populate('user')      .populate('agent', 'companyName logo directNumber phone email')      .populate('visa')      .populate({        path: 'bus',        populate: { path: 'driver', select: 'name phone' }      })      .populate('seat')
      .populate('additionalSeats')      .populate('returnSeat')      .populate('payment');    if (!booking) {      return res.status(404).json({        success: false,        message: 'Booking not found'      });    }    res.json({      success: true,      data: booking    });  } catch (error) {    next(error);  }};exports.updateBookingStatus = async (req, res, next) => {  try {    const { status } = req.body;    const booking = await Booking.findById(req.params.id);    booking.status = status;    await booking.save();    res.json({      success: true,      message: 'Booking status updated successfully',      data: booking    });  } catch (error) {    next(error);  }};exports.cancelBooking = async (req, res, next) => {  try {    const booking = await Booking.findById(req.params.id);    if (!booking) {      return res.status(404).json({        success: false,        message: 'Booking not found'      });    }    if (booking.status === 'cancelled') {      return res.status(400).json({        success: false,        message: 'Booking already cancelled'      });    }    const now = new Date();    const travelDate = new Date(booking.travelDate);    const hoursDiff = (travelDate - now) / (1000 * 60 * 60);        if (hoursDiff > 24) {      booking.cancellationFee = 0;    } else if (hoursDiff > 8) {      booking.cancellationFee = 15;     } else {      return res.status(400).json({        success: false,        message: 'Cannot cancel within 8 hours of travel. Oman Visa fee is non-refundable.'      });    }    booking.status = 'cancelled';    booking.cancellationDate = now;    await booking.save();    res.json({      success: true,      message: 'Booking cancelled successfully',      data: booking    });  } catch (error) {    next(error);  }};exports.getMyBookings = async (req, res, next) => {  try {    const bookings = await Booking.find({ user: req.userId })      .populate('bus')      .populate('seat')
      .populate('additionalSeats')      .populate('payment')      .sort({ createdAt: -1 });    res.json({      success: true,      data: bookings    });  } catch (error) {    next(error);  }};exports.getUnassignedBookings = async (req, res, next) => {  try {    const { busId, date } = req.query;        if (!busId || !date) {        return res.status(400).json({ success: false, message: 'Bus ID and date are required' });    }    const startOfDay = new Date(date);    if (isNaN(startOfDay.getTime())) {        return res.status(400).json({ success: false, message: 'Invalid date format' });    }    startOfDay.setHours(0, 0, 0, 0);        const endOfDay = new Date(date);    endOfDay.setHours(23, 59, 59, 999);    const bookings = await Booking.find({      bus: busId,      travelDate: { $gte: startOfDay, $lte: endOfDay },      status: { $in: ['pending', 'confirmed', 'processing'] },      $or: [{ seat: null }, { seat: { $exists: false } }]    }).populate('user', 'name email')      .populate('agent', 'companyName email');    res.json({      success: true,      data: bookings    });  } catch (error) {    next(error);  }};exports.getBookingByNumber = async (req, res, next) => {  try {    const { bookingNumber } = req.params;    const booking = await Booking.findOne({ bookingNumber })      .populate('user', 'name email phone')      .populate('agent', 'companyName email phone')      .populate({        path: 'bus',        populate: { path: 'driver', select: 'name phone' }      })      .populate('seat')
      .populate('additionalSeats');    if (!booking) {      return res.status(404).json({ success: false, message: 'Booking not found' });    }    res.json({ success: true, data: booking });  } catch (error) {    next(error);  }};exports.requestReschedule = async (req, res, next) => {  try {    const { id } = req.params;    const { newDate } = req.body;    const booking = await Booking.findById(id);    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });    booking.rescheduleRequest = {      requestedDate: newDate,      status: 'pending',      requestedAt: new Date()    };        await booking.save();        const { sendNotification } = require('./notificationController');    const Admin = require('../models/Admin');    const admins = await Admin.find({});    for (const admin of admins) {        await sendNotification(admin._id, 'Admin', 'admin_alert',             `Reschedule request for ${booking.bookingNumber} to ${new Date(newDate).toLocaleDateString()}`);    }    res.json({ success: true, message: 'Reschedule request submitted successfully' });  } catch (error) {    next(error);  }};exports.trackBooking = async (req, res, next) => {  try {    const { pnr } = req.params;        const booking = await Booking.findOne({ bookingNumber: pnr })      .populate('user', 'name email')      .populate({        path: 'bus',        populate: { path: 'driver', select: 'name phone' }      })      .populate('seat')
      .populate('additionalSeats')      .populate('visa');    if (!booking) {      return res.status(404).json({        success: false,        message: 'No booking found with this PNR number'      });    }    res.json({      success: true,      data: booking    });  } catch (error) {    next(error);  }};async function sendNotification(userId, userModel, type, message) {    console.log(`Notification sent to ${userId}: ${message}`);}
