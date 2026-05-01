const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Agent = require('./models/Agent');

dotenv.config({ path: path.join(__dirname, '.env') });

const createKrishnaAgent = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Check if already exists
        const existing = await Agent.findOne({ email: 'krishna@rays.com' });
        if (existing) {
            console.log('ℹ️ Agent Krishna already exists.');
            process.exit(0);
        }

        const agent = await Agent.create({
            companyName: 'Krishna Travels India',
            contactPerson: 'Krishna',
            email: 'krishna@rays.com',
            phone: '+91 99999 88888',
            password: 'password123',
            isApproved: true,
            wallet: {
                balance: 10000,
                transactions: []
            }
        });

        console.log(`✨ Agent Krishna created successfully!`);
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

createKrishnaAgent();
