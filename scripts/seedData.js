const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '../.env') });

// Import Models
const User = require('../models/User');
const Agent = require('../models/Agent');
const Admin = require('../models/Admin');
const Driver = require('../models/Driver');
const Bus = require('../models/Bus');
const Booking = require('../models/Booking');
const Visa = require('../models/Visa');

const seedData = async () => {
    try {
        console.log('⏳ Connecting to Database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        console.log('🧹 Clearing existing data...');
        await User.deleteMany();
        await Agent.deleteMany();
        await Admin.deleteMany();
        await Driver.deleteMany();
        await Bus.deleteMany();
        await Visa.deleteMany();
        await Booking.deleteMany();

        // 1. Create Admin
        console.log('👤 Creating Admin...');
        await Admin.create({
            name: 'Super Admin',
            email: 'admin@rays.com',
            password: 'password123'
        });

        // 2. Create Agent
        console.log('💼 Creating Agent...');
        const agent = await Agent.create({
            companyName: 'TravelWay LLC',
            contactPerson: 'Zaid Khan',
            email: 'agent@rays.com',
            phone: '+91 98765 43210',
            password: 'password123',
            isApproved: true,
            wallet: {
                balance: 5000,
                transactions: []
            }
        });

        // 3. Create Driver
        console.log('🚗 Creating Driver...');
        const driver = await Driver.create({
            name: 'Ahmed Abdullah',
            email: 'driver@rays.com',
            phone: '+91 91234 56789',
            password: 'password123',
            licenseNumber: 'UAE-998877',
            licenseExpiry: new Date('2030-12-31'),
            status: 'active'
        });

        // 4. Create User
        console.log('🧑 Creating User...');
        const user = await User.create({
            name: 'Mohammed Ali',
            email: 'user@rays.com',
            phone: '+91 99887 76655',
            password: 'password123'
        });

        // 5. Create Bus
        console.log('🚌 Creating Bus...');
        const bus = await Bus.create({
            busNumber: 'RAY-101',
            name: 'Rays Express SHJ',
            capacity: 50,
            route: 'SHJ',
            driver: driver._id,
            seatLayout: {
                rows: 10,
                columns: 5,
                configuration: Array.from({ length: 50 }).map((_, i) => {
                    const row = Math.floor(i / 5) + 1;
                    const column = (i % 5) + 1;
                    const isAisle = column === 3;
                    return {
                        seatNumber: isAisle ? `A-${row}` : `S-${row}-${column > 3 ? column - 1 : column}`,
                        row,
                        column,
                        isAisle
                    };
                })
            }
        });

        // Update driver with assigned bus
        driver.assignedBuses = [bus._id];
        await driver.save();

        // 6. Create a Sample Booking (Historical)
        console.log('📅 Creating Sample Booking...');
        await Booking.create({
            bookingNumber: 'BK-SEED-001',
            user: user._id,
            agent: agent._id,
            passengerName: 'Mohammed Ali',
            travelDate: new Date(),
            location: 'SHJ',
            productType: 'with_uae_visa',
            status: 'confirmed',
            bus: bus._id
        });

        console.log('✨ Database Seeded Successfully!');
        process.exit();
    } catch (err) {
        console.error('❌ Error Seeding Data:', err);
        process.exit(1);
    }
};

seedData();
