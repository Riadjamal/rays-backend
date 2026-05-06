const Seat = require('../models/Seat');
const Bus = require('../models/Bus');
const Booking = require('../models/Booking');

// Get available seats for a bus on a specific date
exports.getAvailableSeats = async (req, res, next) => {
  try {
    const { busId, date } = req.query;

    const bus = await Bus.findById(busId);

    if (!bus) {
      return res.status(404).json({
        success: false,
        message: 'Bus not found'
      });
    }

    const bookedSeats = await Seat.find({
      bus: busId,
      tripDate: new Date(date),
      isBooked: true
    });

    const bookedSeatNumbers = bookedSeats.map(seat => seat.seatNumber);

    const availableSeats = bus.seatLayout.configuration.filter(
      seat => !bookedSeatNumbers.includes(seat.seatNumber)
    );

    res.json({
      success: true,
      data: {
        available: availableSeats,
        booked: bookedSeats
      }
    });
  } catch (error) {
    next(error);
  }
};

// Book a seat
exports.bookSeat = async (req, res, next) => {
  try {
    const { busId, seatNumber, tripDate, bookingId } = req.body;

    // Check if seat is already booked
    const existingSeat = await Seat.findOne({
      bus: busId,
      seatNumber,
      tripDate: new Date(tripDate),
      isBooked: true
    });

    if (existingSeat) {
      return res.status(400).json({
        success: false,
        message: 'Seat is already booked'
      });
    }

    const seat = await Seat.create({
      bus: busId,
      seatNumber,
      tripDate: new Date(tripDate),
      isBooked: true,
      bookedBy: req.userId,
      booking: bookingId
    });

    // Update booking with seat
    await Booking.findByIdAndUpdate(bookingId, {
      seat: seat._id
    });

    res.status(201).json({
      success: true,
      message: 'Seat booked successfully',
      data: seat
    });
  } catch (error) {
    next(error);
  }
};

// Get seat by ID
exports.getSeatById = async (req, res, next) => {
  try {
    const seat = await Seat.findById(req.params.id)
      .populate('bus')
      .populate('bookedBy')
      .populate('booking');

    if (!seat) {
      return res.status(404).json({
        success: false,
        message: 'Seat not found'
      });
    }

    res.json({
      success: true,
      data: seat
    });
  } catch (error) {
    next(error);
  }
};

// Admin override seat assignment
exports.overrideSeat = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const seat = await Seat.findById(req.params.id);
    seat.booking = bookingId;
    await seat.save();

    // Update booking with new seat
    await Booking.findByIdAndUpdate(bookingId, {
      seat: seat._id
    });

    res.json({
      success: true,
      message: 'Seat assignment overridden successfully',
      data: seat
    });
  } catch (error) {
    next(error);
  }
};

// Release seat (for cancellations)
exports.releaseSeat = async (req, res, next) => {
  try {
    const seat = await Seat.findById(req.params.id);

    seat.isBooked = false;
    seat.bookedBy = null;
    seat.booking = null;
    await seat.save();

    res.json({
      success: true,
      message: 'Seat released successfully',
      data: seat
    });
  } catch (error) {
    next(error);
  }
};
// Get full seat layout for a bus on a specific date (for admin)
exports.getSeatLayout = async (req, res, next) => {
  try {
    const { busId, date } = req.query;

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ success: false, message: 'Bus not found' });
    }

    // Normalize date to start and end of day for match (UTC)
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    // Find all seat records for this bus and date (booked or blocked)
    const seatRecords = await Seat.find({
      bus: busId,
      tripDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    }).populate('bookedBy', 'name phone');

    // Create a map for quick lookup
    const occupancyMap = {};
    seatRecords.forEach(record => {
      occupancyMap[record.seatNumber] = {
        _id: record._id,
        status: record.isBooked ? 'booked' : 'blocked',
        bookedBy: record.bookedBy
      };
    });

    // Combine bus configuration with occupancy
    const layout = bus.seatLayout.configuration.map(seatConf => {
      const seatData = seatConf.toObject ? seatConf.toObject() : seatConf;
      const occupancy = occupancyMap[seatData.seatNumber];
      return {
        ...seatData,
        id: occupancy ? occupancy._id : null,
        status: occupancy ? occupancy.status : 'available',
        bookedBy: occupancy ? occupancy.bookedBy : null
      };
    });

    console.log(`Generated layout for bus ${bus.busNumber} on ${date}: ${layout.length} seats.`);

    res.json({
      success: true,
      data: {
        bus: {
          id: bus._id,
          name: bus.name,
          busNumber: bus.busNumber,
          capacity: bus.capacity,
          rows: bus.seatLayout.rows,
          columns: bus.seatLayout.columns
        },
        seats: layout
      }
    });
  } catch (error) {
    console.error("Error in getSeatLayout:", error);
    next(error);
  }
};

// Toggle block a seat (admin override)
exports.toggleBlockSeat = async (req, res, next) => {
  try {
    const { busId, seatNumber, tripDate, status } = req.body; 

    const startOfDay = new Date(tripDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(tripDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    if (status === 'available') {
      const seat = await Seat.findOne({ 
        bus: busId, 
        seatNumber, 
        tripDate: { $gte: startOfDay, $lte: endOfDay } 
      });
      if (seat && !seat.isBooked) {
        await seat.deleteOne();
        return res.json({ success: true, message: 'Seat released' });
      }
    } else {
      let seat = await Seat.findOne({ 
        bus: busId, 
        seatNumber, 
        tripDate: { $gte: startOfDay, $lte: endOfDay } 
      });

      if (seat) {
        if (seat.isBooked) return res.status(400).json({ success: false, message: 'Cannot block a booked seat' });
        seat.isBooked = false; 
        await seat.save();
      } else {
        const bus = await Bus.findById(busId);
        if (!bus) return res.status(404).json({ success: false, message: 'Bus not found' });

        const seatConfig = bus.seatLayout.configuration.find(s => s.seatNumber === seatNumber);
        if (!seatConfig) return res.status(400).json({ success: false, message: 'Invalid seat number' });
        
        await Seat.create({
          bus: busId,
          seatNumber,
          row: seatConfig.row,
          column: seatConfig.column,
          tripDate: startOfDay,
          isBooked: false
        });
      }
      return res.json({ success: true, message: 'Seat blocked successfully' });
    }
  } catch (error) {
    next(error);
  }
};

// Manual assign seat to booking (admin)
exports.manualAssignSeat = async (req, res, next) => {
  try {
    const { busId, seatNumber, tripDate, bookingId } = req.body;

    const startOfDay = new Date(tripDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(tripDate);
    endOfDay.setHours(23, 59, 59, 999);

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    let seat = await Seat.findOne({ 
        bus: busId, 
        seatNumber, 
        tripDate: { $gte: startOfDay, $lte: endOfDay } 
    });
    
    const bus = await Bus.findById(busId);
    const seatConfig = bus.seatLayout.configuration.find(s => s.seatNumber === seatNumber);

    if (seat) {
      if (seat.isBooked) return res.status(400).json({ success: false, message: 'Seat already booked' });
      seat.isBooked = true;
      seat.bookedBy = booking.user || booking.agent;
      seat.booking = bookingId;
      await seat.save();
    } else {
      seat = await Seat.create({
        bus: busId,
        seatNumber,
        row: seatConfig.row,
        column: seatConfig.column,
        tripDate: startOfDay,
        isBooked: true,
        bookedBy: booking.user || booking.agent,
        booking: bookingId
      });
    }

    booking.seat = seat._id;
    await booking.save();

    res.json({ success: true, message: 'Seat assigned', data: seat });
  } catch (error) {
    next(error);
  }
};
