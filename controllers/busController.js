const Bus = require('../models/Bus');
const Driver = require('../models/Driver');

// Create bus
exports.createBus = async (req, res, next) => {
  try {
    const { busNumber, name, capacity, seatLayout, route, driver } = req.body;
    
    const bus = await Bus.create({
      busNumber,
      name,
      capacity,
      seatLayout,
      route,
      driver
    });

    if (driver) {
      await Driver.findByIdAndUpdate(driver, { $addToSet: { assignedBuses: bus._id } });
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
    const { route, isActive } = req.query;
    
    const query = {};
    if (route) query.route = route;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    const buses = await Bus.find(query)
      .populate('driver', 'name phone email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: buses
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
    const { busNumber, name, capacity, seatLayout, route, driver, isActive } = req.body;
    
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
    
    await bus.save();

    // Sync Driver relations
    if (driver && oldDriver?.toString() !== driver.toString()) {
      if (oldDriver) {
        await Driver.findByIdAndUpdate(oldDriver, { $pull: { assignedBuses: bus._id } });
      }
      await Driver.findByIdAndUpdate(driver, { $addToSet: { assignedBuses: bus._id } });
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
