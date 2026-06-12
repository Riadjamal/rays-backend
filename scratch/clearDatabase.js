const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Agent = require('../models/Agent');
const Admin = require('../models/Admin');
const Booking = require('../models/Booking');
const Visa = require('../models/Visa');
const Payment = require('../models/Payment');
const Seat = require('../models/Seat');
const RefundRequest = require('../models/RefundRequest');
const Inquiry = require('../models/Inquiry');
const Enquiry = require('../models/Enquiry');
const Notification = require('../models/Notification');
const Driver = require('../models/Driver');
const Bus = require('../models/Bus');
const Service = require('../models/Service');
const Setting = require('../models/Setting');

const clearDatabase = async () => {
    try {
        console.log('⏳ Connecting to Database...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        console.log('🧹 Clearing transaction and user data...');
        
        const resUser = await User.deleteMany({});
        console.log(`- Cleared Users: ${resUser.deletedCount} records`);

        const resAgent = await Agent.deleteMany({});
        console.log(`- Cleared Agents: ${resAgent.deletedCount} records`);

        const resBooking = await Booking.deleteMany({});
        console.log(`- Cleared Bookings: ${resBooking.deletedCount} records`);

        const resVisa = await Visa.deleteMany({});
        console.log(`- Cleared Visas: ${resVisa.deletedCount} records`);

        const resPayment = await Payment.deleteMany({});
        console.log(`- Cleared Payments: ${resPayment.deletedCount} records`);

        const resSeat = await Seat.deleteMany({});
        console.log(`- Cleared Seats (Seat Reservations): ${resSeat.deletedCount} records`);

        const resRefund = await RefundRequest.deleteMany({});
        console.log(`- Cleared Refund Requests: ${resRefund.deletedCount} records`);

        const resInquiry = await Inquiry.deleteMany({});
        console.log(`- Cleared Inquiries: ${resInquiry.deletedCount} records`);

        const resEnquiry = await Enquiry.deleteMany({});
        console.log(`- Cleared Enquiries: ${resEnquiry.deletedCount} records`);

        const resNotification = await Notification.deleteMany({});
        console.log(`- Cleared Notifications: ${resNotification.deletedCount} records`);

        const resDriver = await Driver.deleteMany({});
        console.log(`- Cleared Drivers: ${resDriver.deletedCount} records`);

        const resBus = await Bus.deleteMany({});
        console.log(`- Cleared Buses: ${resBus.deletedCount} records`);

        const resService = await Service.deleteMany({});
        console.log(`- Cleared Services: ${resService.deletedCount} records`);

        const resSetting = await Setting.deleteMany({});
        console.log(`- Cleared Settings: ${resSetting.deletedCount} records`);

        const resAdmin = await Admin.deleteMany({});
        console.log(`- Cleared old Admins: ${resAdmin.deletedCount} records`);

        console.log('👤 Creating default Admin account...');
        const newAdmin = await Admin.create({
            name: 'Super Admin',
            email: 'admin@rays.com',
            password: 'password123'
        });
        console.log(`✅ Default admin created successfully: ${newAdmin.email}`);

        console.log('✨ Database clean-up and admin reset complete!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error during database clean-up:', err);
        process.exit(1);
    }
};

clearDatabase();
