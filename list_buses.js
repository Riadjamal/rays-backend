const mongoose = require('mongoose');
require('dotenv').config();
const Bus = require('./models/Bus');

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const buses = await Bus.find({});
    console.log(buses.map(b => ({
      _id: b._id,
      busNumber: b.busNumber,
      isDaily: b.isDaily,
      operatingDates: b.operatingDates,
      isActive: b.isActive
    })));
    process.exit(0);
  });
