const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, '../controllers/agentController.js');

let content = fs.readFileSync(targetPath, 'utf8');

content = content.replace(
    /firstName, lastName, passportNumber, nationality\s*\} = req\.body;/g,
    `firstName, lastName, passportNumber, nationality, seatNumber, row, column, returnSeatNumber, returnRow, returnColumn } = req.body;`
);

const seatLogic = `if (booking.seat && (busId || travelDate)) {
      const Seat = require('../models/Seat');
      await Seat.findByIdAndDelete(booking.seat);
      booking.seat = null;
    }

    if (seatNumber) {
        const Seat = require('../models/Seat');
        const depDate = new Date(booking.travelDate);
        depDate.setUTCHours(0, 0, 0, 0); 
        
        if (booking.seat) await Seat.findByIdAndDelete(booking.seat);
        
        const seat = await Seat.findOneAndUpdate(
            { bus: booking.bus, seatNumber, tripDate: depDate },
            { row, column, isBooked: true, bookedBy: req.userId, booking: booking._id },
            { upsert: true, new: true }
        );
        booking.seat = seat._id;
    }

    if (booking.isReturnTrip && returnSeatNumber) {
        const Seat = require('../models/Seat');
        const retDate = new Date(booking.returnDate);
        retDate.setUTCHours(0, 0, 0, 0); 
        
        if (booking.returnSeat) await Seat.findByIdAndDelete(booking.returnSeat);

        const rSeat = await Seat.findOneAndUpdate(
            { bus: booking.bus, seatNumber: returnSeatNumber, tripDate: retDate },
            { row: returnRow, column: returnColumn, isBooked: true, bookedBy: req.userId, booking: booking._id },
            { upsert: true, new: true }
        );
        booking.returnSeat = rSeat._id;
    }

    await booking.save();`;

content = content.replace(
    /if \(booking\.seat && \(busId \|\| travelDate\)\) \{[\s\S]*?await booking\.save\(\);/g,
    seatLogic
);

fs.writeFileSync(targetPath, content, 'utf8');
console.log("Fixed agentController.js successfully.");
