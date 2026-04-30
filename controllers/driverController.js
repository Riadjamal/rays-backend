const Driver = require('../models/Driver');
const Booking = require('../models/Booking');
const Bus = require('../models/Bus');

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
      status: { $in: ['confirmed', 'processing'] }
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
    const bus = await Bus.findById(driver.assignedBuses[0]);
    
    res.json({
      success: true,
      data: {
        route: bus.route,
        busNumber: bus.busNumber,
        busName: bus.name
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
    
    // Update booking status to show passenger boarded
    booking.status = 'completed';
    await booking.save();
    
    res.json({
      success: true,
      message: 'Passenger checked in successfully',
      data: booking
    });
  } catch (error) {
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
