const mongoose = require('mongoose');

const busSchema = new mongoose.Schema({
  busNumber: {
    type: String,
    required: [true, 'Bus number is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Bus name is required'],
    trim: true
  },
  capacity: {
    type: Number,
    required: [true, 'Bus capacity is required'],
    min: 1
  },
  seatLayout: {
    rows: {
      type: Number,
      required: true
    },
    columns: {
      type: Number,
      required: true
    },
    configuration: [{
      seatNumber: String,
      row: Number,
      column: Number,
      isAisle: Boolean
    }]
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  route: {
    type: String,
    required: [true, 'Route is required'],
    enum: ['SHJ', 'DXB']
  },
  departureTime: {
    type: String,
    required: [true, 'Departure time is required']
  },
  startTime: {
    type: String,
    required: [true, 'Start time is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDaily: {
    type: Boolean,
    default: true
  },
  operatingDates: [{
    type: String // YYYY-MM-DD
  }],
  price: {
    type: Number,
    required: [true, 'Bus ticket price is required'],
    default: 150
  },
  amenities: [{ type: String }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

busSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Bus', busSchema);
