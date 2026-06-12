const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const inspect = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const collections = [
            'User', 'Agent', 'Admin', 'Driver', 'Bus', 'Booking', 'Visa', 'Payment', 'Seat', 'RefundRequest', 'Inquiry', 'Enquiry', 'Notification', 'Service', 'Setting'
        ];

        for (const col of collections) {
            try {
                const Model = require(`../models/${col}`);
                const count = await Model.countDocuments();
                console.log(`${col}: ${count} records`);
            } catch (err) {
                console.log(`${col}: Model load / count failed: ${err.message}`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

inspect();
