const Driver = require('../models/Driver');
const Booking = require('../models/Booking');
const Bus = require('../models/Bus');
const { hasTripDeparted, syncCompletedBookings } = require('../utils/tripTiming');

const getDayBounds = (dateValue = new Date()) => {
  const start = new Date(dateValue);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

const isSameDay = (left, right) => {
  if (!left || !right) return false;
  const a = new Date(left);
  const b = new Date(right);
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const validateDriverBooking = async (driver, booking) => {
  const activeBusId = driver.currentTripBus ? driver.currentTripBus.toString() : null;

  if (!driver.isOnTrip || !activeBusId) {
    return {
      valid: false,
      code: 'no_active_trip',
      message: 'Start your assigned trip first before scanning passengers.'
    };
  }

  if (!booking) {
    return {
      valid: false,
      code: 'not_found',
      message: 'Booking not found.'
    };
  }

  if (!booking.bus) {
    return {
      valid: false,
      code: 'missing_bus',
      message: 'This ticket does not have a bus assigned yet.'
    };
  }

  if (booking.status === 'completed') {
    return {
      valid: false,
      code: 'already_boarded',
      message: 'This passenger is already marked as boarded.'
    };
  }

  if (booking.status === 'cancelled') {
    return {
      valid: false,
      code: 'cancelled',
      message: 'This booking is cancelled and cannot be boarded.'
    };
  }

  const bookingBusId = booking.bus._id ? booking.bus._id.toString() : booking.bus.toString();
  if (bookingBusId !== activeBusId) {
    return {
      valid: false,
      code: 'wrong_bus',
      message: `This ticket belongs to Bus ${booking.bus.busNumber || 'another bus'}, not your current bus.`
    };
  }

  if (driver.currentTripDate && !isSameDay(booking.travelDate, driver.currentTripDate)) {
    return {
      valid: false,
      code: 'wrong_date',
      message: 'This ticket belongs to a different travel date.'
    };
  }

  if (booking.location && booking.bus.route && booking.location !== booking.bus.route) {
    return {
      valid: false,
      code: 'wrong_route',
      message: `This ticket route (${booking.location}) does not match your active route (${booking.bus.route}).`
    };
  }

  return {
    valid: true,
    code: 'valid',
    message: 'Ticket verified for your current bus.'
  };
};


exports.getDashboard = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.userId).populate('assignedBuses');
    
    
    const totalBuses = driver.assignedBuses.length;
    
    
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const todayBookings = await Booking.find({
      bus: { $in: driver.assignedBuses },
      travelDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'processing'] }
    }).populate('user', 'name').populate('bus', 'busNumber');
    await syncCompletedBookings(todayBookings);
    const visibleTodayTrips = todayBookings.filter((booking) => booking.status !== 'completed' && !hasTripDeparted(booking));

    
    const Seat = require('../models/Seat');
    const busesWithAvailability = await Promise.all(driver.assignedBuses.map(async (bus) => {
        const bookedCount = await Seat.countDocuments({
            bus: bus._id,
            tripDate: { $gte: today, $lt: tomorrow },
            isBooked: true
        });
        const busObj = bus.toObject();
        busObj.availableSeats = Math.max(0, bus.capacity - bookedCount);
        return busObj;
    }));

    res.json({
      success: true,
      data: {
        totalBuses,
        todayTripsCount: visibleTodayTrips.length,
        assignedBuses: busesWithAvailability,
        todayTrips: visibleTodayTrips
      }
    });
  } catch (error) {
    next(error);
  }
};


exports.getProfile = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.userId)
      .populate('assignedBuses');

    res.json({
      success: true,
      data: driver
    });
  } catch (error) {
    next(error);
  }
};


exports.getTrips = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.userId);
    const query = {
      status: { $in: ['confirmed', 'processing', 'completed'] }
    };

    if (driver.isOnTrip && driver.currentTripBus && driver.currentTripDate) {
      const { start, end } = getDayBounds(driver.currentTripDate);
      query.bus = driver.currentTripBus;
      query.travelDate = { $gte: start, $lt: end };
    } else {
      query.bus = { $in: driver.assignedBuses };
    }

    const trips = await Booking.find(query)
      .populate('user', 'name phone')
      .populate('bus', 'busNumber route name')
      .populate('seat')
      .populate('additionalSeats')
      .sort({ travelDate: 1 });
    await syncCompletedBookings(trips);

    res.json({
      success: true,
      data: trips
    });
  } catch (error) {
    next(error);
  }
};


exports.getTripById = async (req, res, next) => {
  try {
    const trip = await Booking.findById(req.params.id)
      .populate('user', 'name phone email')
      .populate('seat')
      .populate('additionalSeats')
      .populate('bus');

    if (!trip) {
      return res.status(404).json({
        success: false,
        message: 'Trip not found'
      });
    }

    res.json({
      success: true,
      data: trip
    });
  } catch (error) {
    next(error);
  }
};


exports.getPassengerList = async (req, res, next) => {
  try {
    const { busId, travelDate } = req.params;

    const passengers = await Booking.find({
      bus: busId,
      travelDate: new Date(travelDate),
      status: { $in: ['confirmed', 'processing'] }
    })
      .populate('user', 'name phone email')
      .populate('seat')
      .populate('additionalSeats');
    await syncCompletedBookings(passengers);

    res.json({
      success: true,
      data: passengers
    });
  } catch (error) {
    next(error);
  }
};


exports.getRouteDetails = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.userId);
    if (!driver.assignedBuses || driver.assignedBuses.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }
    const activeBusId = driver.currentTripBus || driver.assignedBuses[0];
    const bus = await Bus.findById(activeBusId);
    
    
    const Seat = require('../models/Seat');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const bookedCount = await Seat.countDocuments({
      bus: bus._id,
      tripDate: { $gte: today, $lt: tomorrow },
      isBooked: true
    });

    res.json({
      success: true,
      data: {
        route: bus.route,
        busNumber: bus.busNumber,
        busName: bus.name,
        capacity: bus.capacity,
        availableSeats: Math.max(0, bus.capacity - bookedCount),
        _id: bus._id,
        bus: bus 
      }
    });
  } catch (error) {
    next(error);
  }
};


exports.checkInPassenger = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const driver = await Driver.findById(req.userId);

    const booking = await Booking.findById(bookingId).populate('bus');

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    const validation = await validateDriverBooking(driver, booking);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        code: validation.code,
        message: validation.message
      });
    }

    await Booking.findByIdAndUpdate(bookingId, { status: 'completed' });

    res.json({
      success: true,
      message: 'Passenger checked in successfully',
      data: booking
    });
  } catch (error) {
    console.error("Check-in Error:", error);
    res.status(400).json({ success: false, message: "Check-in failed due to server validation/format error", error: error.message });
  }
};


exports.startTrip = async (req, res, next) => {
  try {
    const { busId, location } = req.body;
    const driver = await Driver.findById(req.userId);
    const assignedBusIds = (driver.assignedBuses || []).map((id) => id.toString());

    if (!busId || !assignedBusIds.includes(busId.toString())) {
      return res.status(400).json({
        success: false,
        message: 'This bus is not assigned to the current driver.'
      });
    }

    await Driver.findByIdAndUpdate(req.userId, {
      isOnTrip: true,
      currentTripBus: busId,
      currentTripDate: getDayBounds(new Date()).start
    });
    
    const { sendNotification } = require('./notificationController');
    const Admin = require('../models/Admin');
    
    
    const admins = await Admin.find({});
    
    
    for (const admin of admins) {
      await sendNotification(admin._id, 'Admin', 'system_alert', `Driver ${driver.name} has started the trip for Bus ${busId || 'Unknown'} from ${location || 'Origin'}.`);
    }

    res.json({
      success: true,
      message: 'Trip started successfully. Admin has been notified.'
    });
  } catch (error) {
    console.error("Start Trip Error:", error);
    next(error);
  }
};


exports.getNotifications = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.userId)
      .populate('notifications');

    res.json({
      success: true,
      data: driver.notifications
    });
  } catch (error) {
    next(error);
  }
};

exports.scanTicket = async (req, res, next) => {
  try {
    const normalizedBookingNumber = req.body?.bookingNumber?.trim();

    if (!normalizedBookingNumber) {
      return res.status(400).json({
        success: false,
        message: 'Booking number is required'
      });
    }

    const driver = await Driver.findById(req.userId).populate('currentTripBus', 'busNumber route name');
    const booking = await Booking.findOne({ bookingNumber: normalizedBookingNumber })
      .populate('bus', 'busNumber route name')
      .populate('user', 'name phone email')
      .populate('seat')
      .populate('additionalSeats');

    if (!booking) {
      return res.status(404).json({
        success: false,
        code: 'not_found',
        message: 'No passenger found for this ticket.'
      });
    }

    const validation = await validateDriverBooking(driver, booking);

    return res.status(validation.valid ? 200 : 400).json({
      success: validation.valid,
      code: validation.code,
      message: validation.message,
      data: {
        valid: validation.valid,
        booking
      }
    });
  } catch (error) {
    next(error);
  }
};


exports.updateLocation = async (req, res, next) => {
  try {
    const { lat, lng, accuracy } = req.body;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'lat and lng are required' });
    }

    await Driver.findByIdAndUpdate(req.userId, {
      lastLocation: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        accuracy: accuracy ? parseFloat(accuracy) : null,
        updatedAt: new Date()
      },
      isOnTrip: true
    });

    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    console.error("Location Update Error:", error);
    next(error);
  }
};

exports.stopTracking = async (req, res, next) => {
  try {
    const { busId, location, destination } = req.body || {};
    const driver = await Driver.findById(req.userId);

    await Driver.findByIdAndUpdate(req.userId, {
      isOnTrip: false,
      currentTripBus: null,
      currentTripDate: null
    });

    try {
      const { sendNotification } = require('./notificationController');
      const Admin = require('../models/Admin');
      const admins = await Admin.find({});

      for (const admin of admins) {
        await sendNotification(
          admin._id,
          'Admin',
          'system_alert',
          `Driver ${driver?.name || 'Unknown Driver'} has ended the trip for Bus ${busId || 'Unknown'} from ${location || 'Origin'} to ${destination || 'Destination'}.`
        );
      }
    } catch (notificationError) {
      console.error("Stop Trip Notification Error:", notificationError);
    }

    res.json({ success: true, message: 'Tracking stopped' });
  } catch (error) {
    next(error);
  }
};


