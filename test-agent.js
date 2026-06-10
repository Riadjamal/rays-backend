const mongoose = require('mongoose');
const dotenv = require('dotenv');
const crypto = require('crypto');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const Agent = require('./models/Agent');
const mailer = require('./utils/mailer');
const connectDatabase = require('./config/database');

async function testAddAgent() {
    try {
        await connectDatabase();
        console.log("Database connected. Creating Agent...");

        const email = "ahmedbilalkhangl09@gmail.com";
        const companyName = "Test Company";
        const contactPerson = "Ahmed";
        const phone = "1234567890";
        const setupToken = crypto.randomBytes(32).toString('hex');

        // Delete if already exists to prevent duplication error
        await Agent.deleteOne({ email });

        const agent = await Agent.create({
            companyName,
            contactPerson,
            email,
            phone,
            companyDetails: { tradeLicense: 'TL123', address: 'Test Addr' },
            setupPasswordToken: setupToken,
            setupPasswordTokenExpires: Date.now() + 48 * 60 * 60 * 1000, 
            isApproved: true
        });

        console.log("Agent created in DB. Sending email...");

        await mailer.sendAgentInvitation(email, {
            companyName,
            contactPerson,
            token: setupToken
        });

        console.log("Agent created and email sent successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Error adding agent:", err);
        process.exit(1);
    }
}

testAddAgent();
