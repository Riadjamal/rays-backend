const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const { sendNotification } = require('./notificationController');

// Create bus
exports.createBus = async (req, res, next) => {
  try {
    const { busNumber, name, capacity, seatLayout, route, driver, price } = req.body;
    
    const bus = await Bus.create({
      busNumber,
      name,
      capacity,
      seatLayout,
      route,
      driver,
      price
    });

    if (driver) {
      await Driver.findByIdAndUpdate(driver, { $addToSet: { assignedBuses: bus._id } });
      await sendNotification(driver, 'Driver', 'system_alert', `You have been assigned to a new bus: ${bus.busNumber} (${bus.name})`);
    }
    
    res.status(201).json({
      success: true,
      message: 'Bus created successfully',
      data: bus
    });
  } catch (error) {
    next(error);
  }
};

// Get all buses
exports.getAllBuses = async (req, res, next) => {
  try {
    const { route, isActive, date } = req.query;
    
    const query = {};
    if (route) query.route = route;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const buses = await Bus.find(query)
      .populate('driver', 'name phone email')
      .sort({ createdAt: -1 });
    
    // If date is provided, calculate availability for each bus
    let busesWithAvailability = buses;
    if (date) {
        const Seat = require('../models/Seat');
        const startOfDay = new Date(date);
        startOfDay.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setUTCHours(23, 59, 59, 999);

        busesWithAvailability = await Promise.all(buses.map(async (bus) => {
            const bookedCount = await Seat.countDocuments({
                bus: bus._id,
                tripDate: { $gte: startOfDay, $lte: endOfDay },
                isBooked: true
            });
            const busObj = bus.toObject();
            busObj.availableSeats = Math.max(0, bus.capacity - bookedCount);
            busObj.bookedCount = bookedCount;
            return busObj;
        }));
    }
    
    res.json({
      success: true,
      data: busesWithAvailability
    });
  } catch (error) {
    next(error);
  }
};

// Get bus by ID
exports.getBusById = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('driver', 'name phone email');
    
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }
    
    res.json({
      success: true,
      data: bus
    });
  } catch (error) {
    next(error);
  }
};

// Update bus
exports.updateBus = async (req, res, next) => {
  try {
    const { busNumber, name, capacity, seatLayout, route, driver, isActive, price } = req.body;
    
    const bus = await Bus.findById(req.params.id);
    if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });

    const oldDriver = bus.driver;

    if (busNumber) bus.busNumber = busNumber;
    if (name) bus.name = name;
    if (capacity) bus.capacity = capacity;
    if (seatLayout) bus.seatLayout = seatLayout;
    if (route) bus.route = route;
    if (driver) bus.driver = driver;
    if (isActive !== undefined) bus.isActive = isActive;
    if (price !== undefined) bus.price = price;
    
    await bus.save();

    // Sync Driver relations
    if (driver && oldDriver?.toString() !== driver.toString()) {
      if (oldDriver) {
        await Driver.findByIdAndUpdate(oldDriver, { $pull: { assignedBuses: bus._id } });
        // Optional: notify old driver they were unassigned? 
      }
      await Driver.findByIdAndUpdate(driver, { $addToSet: { assignedBuses: bus._id } });
      await sendNotification(driver, 'Driver', 'system_alert', `You have been assigned to bus: ${bus.busNumber} (${bus.name})`);
    }
    
    res.json({
      success: true,
      message: 'Bus updated successfully',
      data: bus
    });
  } catch (error) {
    next(error);
  }
};

// Delete bus
exports.deleteBus = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id);
    
    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }
    
    await bus.deleteOne();
    
    res.json({
      success: true,
      message: 'Bus deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Assign driver to bus
exports.assignDriver = async (req, res, next) => {
  try {
    const { driverId } = req.body;
    
    const bus = await Bus.findById(req.params.id);
    const oldDriver = bus.driver;
    bus.driver = driverId;
    await bus.save();

    if (oldDriver) {
      await Driver.findByIdAndUpdate(oldDriver, { $pull: { assignedBuses: bus._id } });
    }
    if (driverId) {
      await Driver.findByIdAndUpdate(driverId, { $addToSet: { assignedBuses: bus._id } });
      await sendNotification(driverId, 'Driver', 'system_alert', `You have been assigned to bus: ${bus.busNumber} (${bus.name})`);
    }
    
    res.json({
      success: true,
      message: 'Driver assigned successfully',
      data: bus
    });
  } catch (error) {
    next(error);
  }
};
