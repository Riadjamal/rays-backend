const Visa = require('../models/Visa');
const Booking = require('../models/Booking');

// Get all pending visas (for admin)
exports.getPendingVisas = async (req, res, next) => {
  try {
    const visas = await Visa.find({ status: 'pending' })
      .populate('booking')
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

// Get all visas
exports.getAllVisas = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = status ? { status } : {};

    const visas = await Visa.find(query)
      .populate('booking')
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

// Apply for visa (admin action)
exports.applyVisa = async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const visa = await Visa.create({
      booking: bookingId,
      status: 'pending',
      appliedDate: new Date(),
      appliedBy: req.userId
    });

    // Update booking status
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

// Approve visa
exports.approveVisa = async (req, res, next) => {
  try {
    const { visaDocument, notes } = req.body;

    const visa = await Visa.findById(req.params.id);
    visa.status = 'approved';
    visa.approvedDate = new Date();
    visa.visaDocument = visaDocument;
    visa.notes = notes;
    await visa.save();

    // Update booking status
    await Booking.findByIdAndUpdate(visa.booking, {
      status: 'confirmed'
    });

    res.json({
      success: true,
      message: 'Visa approved successfully',
      data: visa
    });
  } catch (error) {
    next(error);
  }
};

// Reject visa
exports.rejectVisa = async (req, res, next) => {
  try {
    const { notes } = req.body;

    const visa = await Visa.findById(req.params.id);
    visa.status = 'rejected';
    visa.notes = notes;
    await visa.save();

    // Update booking status
    await Booking.findByIdAndUpdate(visa.booking, {
      status: 'pending'
    });

    res.json({
      success: true,
      message: 'Visa rejected',
      data: visa
    });
  } catch (error) {
    next(error);
  }
};

// Get visa stats (for dashboard)
exports.getVisaStats = async (req, res, next) => {
  try {
    const total = await Visa.countDocuments();
    const pending = await Visa.countDocuments({ status: 'pending' });
    const processing = await Visa.countDocuments({ status: 'processing' });
    const approved = await Visa.countDocuments({ status: 'approved' });

    res.json({
      success: true,
      data: {
        total,
        pending,
        processing,
        approved
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update visa status (generic)
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

    if (status === 'approved') {
      visa.approvedDate = new Date();
      await Booking.findByIdAndUpdate(visa.booking, { status: 'confirmed' });
    } else if (status === 'rejected') {
      await Booking.findByIdAndUpdate(visa.booking, { status: 'pending' });
    } else if (status === 'processing') {
      await Booking.findByIdAndUpdate(visa.booking, { status: 'processing' });
    }

    await visa.save();

    res.json({
      success: true,
      message: `Visa status updated to ${status}`,
      data: visa
    });
  } catch (error) {
    next(error);
  }
};

// Get visa by booking
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
// Get current user's visas
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
