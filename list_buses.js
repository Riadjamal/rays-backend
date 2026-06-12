const mongoose = require('mongoose');
require('dotenv').config();
const Bus = require('./models/Bus');

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const buses = await Bus.find({});
    console.log(buses);
    process.exit(0);
  });
