const Visa = require('../models/Visa');
const Booking = require('../models/Booking');

const visaBookingPopulate = {
  path: 'booking',
  populate: [
    { path: 'user', select: 'name email phone' },
    { path: 'agent', select: 'companyName email phone contactPerson' },
    { path: 'bus', populate: { path: 'driver', select: 'name phone' } },
    { path: 'seat' },
    { path: 'additionalSeats' }
  ]
};



exports.getPendingVisas = async (req, res, next) => {
  try {
    const visas = await Visa.find({ status: 'pending' })
      .populate(visaBookingPopulate)
      .populate('appliedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: visas
    });
  } catch (error) {
    next(error);
  }
};


exports.getAllVisas = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = status ? { status } : {};

    const visas = await Visa.find(query)
      .populate(visaBookingPopulate)
      .populate('appliedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Visa.countDocuments(query);

    res.json({
      success: true,
      data: {
        visas,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    next(error);
  }
};


exports.applyVisa = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const visa = await Visa.create({
      booking: bookingId,
      status: 'pending',
      appliedDate: new Date(),
      appliedBy: req.userId
    });

    
    await Booking.findByIdAndUpdate(bookingId, {
      status: 'processing',
      visa: visa._id
    });

    res.status(201).json({
      success: true,
      message: 'Visa application submitted successfully',
      data: visa
    });
  } catch (error) {
    next(error);
  }
};


exports.approveVisa = async (req, res, next) => {
  try {
    const { visaDocument, notes } = req.body;

    const visa = await Visa.findById(req.params.id);
    visa.status = 'approved';
    visa.approvedDate = new Date();
    visa.visaDocument = visaDocument;
    visa.notes = notes;
    await visa.save();

    
    const booking = await Booking.findByIdAndUpdate(visa.booking, {
      status: 'confirmed'
    }, { new: true }).populate('agent').populate('user');

    
    try {
        const { sendNotification } = require('./notificationController');
        const targetId = booking.agent ? booking.agent._id : (booking.user ? booking.user._id : null);
        const targetModel = booking.agent ? 'Agent' : 'User';
        
        if (targetId) {
            await sendNotification(targetId, targetModel, 'visa_approval', 
                `GREAT NEWS! Visa for booking ${booking.bookingNumber} (${booking.passengerName}) has been APPROVED.`);
        }

        
        if (booking.user?.email || booking.agent?.email) {
            const { sendVisaApproved } = require('../utils/mailer');
            await sendVisaApproved(booking.agent?.email || booking.user.email, {
                bookingNumber: booking.bookingNumber,
                passengerName: booking.passengerName
            });
        }
    } catch (notifErr) {
        console.error("Notification error:", notifErr);
    }

    res.json({
      success: true,
      message: 'Visa approved successfully',
      data: visa
    });
  } catch (error) {
    next(error);
  }
};


exports.rejectVisa = async (req, res, next) => {
  try {
    const { notes } = req.body;

    const visa = await Visa.findById(req.params.id);
    visa.status = 'rejected';
    visa.notes = notes;
    await visa.save();

    
    const booking = await Booking.findByIdAndUpdate(visa.booking, {
      status: 'cancelled'
    }, { new: true }).populate('agent').populate('user');

    
    try {
        const { sendNotification } = require('./notificationController');
        const targetId = booking.agent ? booking.agent._id : (booking.user ? booking.user._id : null);
        const targetModel = booking.agent ? 'Agent' : 'User';
        
        if (targetId) {
            await sendNotification(targetId, targetModel, 'visa_rejection', 
                `ALERT: Visa for booking ${booking.bookingNumber} has been REJECTED. Reason: ${notes || 'Contact support'}`);
        }
    } catch (notifErr) {
        console.error("Notification error:", notifErr);
    }

    res.json({
      success: true,
      message: 'Visa rejected',
      data: visa
    });
  } catch (error) {
    next(error);
  }
};


exports.getVisaStats = async (req, res, next) => {
  try {
    const total = await Visa.countDocuments();
    const pending = await Visa.countDocuments({ status: 'pending' });
    const processing = await Visa.countDocuments({ status: 'processing' });
    const approved = await Visa.countDocuments({ status: 'approved' });

    
    const oman = await Visa.countDocuments({ type: 'oman_visa' });
    const uae = await Visa.countDocuments({ type: 'uae_visa' });
    const saudi = await Visa.countDocuments({ type: 'saudi_visa' });

    res.json({
      success: true,
      data: {
        total,
        pending,
        processing,
        approved,
        oman,
        uae,
        saudi
      }
    });
  } catch (error) {
    next(error);
  }
};


exports.updateVisaStatus = async (req, res, next) => {
  try {
    const { status, notes, visaDocument } = req.body;

    const visa = await Visa.findById(req.params.id);
    if (!visa) {
      return res.status(404).json({ success: false, message: 'Visa not found' });
    }

    visa.status = status;
    if (notes) visa.notes = notes;
    if (visaDocument) visa.visaDocument = visaDocument;

    
    let bookingStatus = 'processing';
    if (status === 'approved') {
        visa.approvedDate = new Date();
        bookingStatus = 'confirmed';
    } else if (status === 'rejected') {
        bookingStatus = 'pending';
    } else if (status === 'pending') {
        bookingStatus = 'pending';
    }

    const updatedBooking = await Booking.findByIdAndUpdate(visa.booking, { status: bookingStatus }, { new: true });
    
    if (!updatedBooking) {
        console.error(`Failed to find/update booking ${visa.booking} for visa ${visa._id}`);
    }

    await visa.save();

    
    const booking = await Booking.findById(visa.booking).populate('user').populate('agent');
    
    if (booking) {
        try {
            const { sendNotification } = require('./notificationController');
            const targetId = booking.agent ? booking.agent._id : (booking.user ? booking.user._id : null);
            const targetModel = booking.agent ? 'Agent' : 'User';
            
            if (targetId) {
                await sendNotification(targetId, targetModel, 'visa_approval', 
                    `Visa for booking ${booking.bookingNumber} is now ${status}`);
            }

            if (status === 'approved' && booking.user?.email) {
                const { sendVisaApproved } = require('../utils/mailer');
                await sendVisaApproved(booking.user.email, {
                    bookingNumber: booking.bookingNumber,
                    passengerName: `${booking.firstName} ${booking.lastName}` || booking.passengerName
                });
            }
        } catch (notifErr) {
            console.error("Notification/Email error in updateVisaStatus:", notifErr);
        }
    }

    res.json({
      success: true,
      message: `Visa status updated to ${status}`,
      data: visa
    });
  } catch (error) {
    next(error);
  }
};


exports.getVisaByBooking = async (req, res, next) => {
  try {
    const visa = await Visa.findOne({ booking: req.params.bookingId })
      .populate('appliedBy', 'name email');

    if (!visa) {
      return res.status(404).json({
        success: false,
        message: 'Visa not found'
      });
    }

    res.json({
      success: true,
      data: visa
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyVisas = async (req, res, next) => {
  try {
    const userBookings = await Booking.find({ user: req.userId }).select('_id');
    const bookingIds = userBookings.map(b => b._id);

    const visas = await Visa.find({ booking: { $in: bookingIds } })
      .populate({
        path: 'booking',
        populate: { path: 'bus' }
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: visas
    });
  } catch (error) {
    next(error);
  }
};


exports.getAgentVisas = async (req, res, next) => {
  try {
    const agentBookings = await Booking.find({ agent: req.userId }).select('_id');
    const bookingIds = agentBookings.map(b => b._id);

    const visas = await Visa.find({ booking: { $in: bookingIds } })
      .populate(visaBookingPopulate)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: visas
    });
  } catch (error) {
    next(error);
  }
};


exports.agentUpdateVisa = async (req, res, next) => {
  try {
    const { visaDocument, notes } = req.body;
    
    const visa = await Visa.findById(req.params.id).populate(visaBookingPopulate);
    if (!visa) {
      return res.status(404).json({ success: false, message: 'Visa record not found' });
    }

    
    if (visa.booking.agent.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this visa' });
    }

    if (visaDocument) visa.visaDocument = visaDocument;
    if (notes) visa.notes = notes;
    
    
    
    
    await visa.save();

    res.json({
      success: true,
      message: 'Visa document updated successfully',
      data: visa
    });
  } catch (error) {
    next(error);
  }
};

