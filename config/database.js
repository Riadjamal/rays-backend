const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 10s
      socketTimeoutMS: 45000, // Close sockets after 45s
      family: 4 // Use IPv4, skip trying IPv6
    });

    // Disable buffering so we get errors immediately if the connection drops
    mongoose.set('bufferCommands', false);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    // On Vercel, we don't want to throw and crash the whole instance if possible, 
    // but for initial connection it's better to know.
    throw error;
  }
};

module.exports = connectDatabase;
