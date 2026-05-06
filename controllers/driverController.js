const Driver = require('../models/Driver');
const Booking = require('../models/Booking');
const Bus = require('../models/Bus');

// Get driver dashboard data
exports.getDashboard = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.userId).populate('assignedBuses');
    
    // Get stats
    const totalBuses = driver.assignedBuses.length;
    
    // Get today's trips (UTC normalized to match bookings)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const todayBookings = await Booking.find({
      bus: { $in: driver.assignedBuses },
      travelDate: { $gte: today, $lt: tomorrow },
      status: { $in: ['confirmed', 'processing'] }
    }).populate('user', 'name').populate('bus', 'busNumber');

    // Get today's availability for each bus
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
        todayTripsCount: todayBookings.length,
        assignedBuses: busesWithAvailability,
        todayTrips: todayBookings
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get driver profile
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

// Get assigned trips
exports.getTrips = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.userId);

    const trips = await Booking.find({
      bus: { $in: driver.assignedBuses },
      status: { $in: ['confirmed', 'processing', 'completed'] }
    })
      .populate('user', 'name phone')
      .populate('seat')
      .sort({ travelDate: 1 });

    res.json({
      success: true,
      data: trips
    });
  } catch (error) {
    next(error);
  }
};

// Get trip details
exports.getTripById = async (req, res, next) => {
  try {
    const trip = await Booking.findById(req.params.id)
      .populate('user', 'name phone email')
      .populate('seat')
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

// Get passenger list for a trip
exports.getPassengerList = async (req, res, next) => {
  try {
    const { busId, travelDate } = req.params;

    const passengers = await Booking.find({
      bus: busId,
      travelDate: new Date(travelDate),
      status: { $in: ['confirmed', 'processing'] }
    })
      .populate('user', 'name phone email')
      .populate('seat');

    res.json({
      success: true,
      data: passengers
    });
  } catch (error) {
    next(error);
  }
};

// Get route details
exports.getRouteDetails = async (req, res, next) => {
  try {
    const driver = await Driver.findById(req.userId);
    if (!driver.assignedBuses || driver.assignedBuses.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }
    const bus = await Bus.findById(driver.assignedBuses[0]);
    
    // Calculate availability for today
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

// Mark passenger as boarded (check-in)
exports.checkInPassenger = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update booking status to show passenger boarded using findByIdAndUpdate to bypass validation errors on legacy records
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

// Start Trip and Notify Admin
exports.startTrip = async (req, res, next) => {
  try {
    const { busId, location } = req.body;
    const driver = await Driver.findById(req.userId);
    
    const { sendNotification } = require('./notificationController');
    const Admin = require('../models/Admin');
    
    // Find all admins
    const admins = await Admin.find({});
    
    // Notify all admins sequentially
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

// Get driver notifications
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
