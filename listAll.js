const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');
const Agent = require('./models/Agent');

dotenv.config({ path: path.join(__dirname, '.env') });

const listAll = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const users = await User.find({}, 'name email');
        const agents = await Agent.find({}, 'companyName contactPerson email');

        console.log('--- USERS ---');
        users.forEach(u => console.log(`Name: ${u.name}, Email: ${u.email}`));

        console.log('--- AGENTS ---');
        agents.forEach(a => console.log(`Contact: ${a.contactPerson}, Company: ${a.companyName}, Email: ${a.email}`));

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

listAll();
