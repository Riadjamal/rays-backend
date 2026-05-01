const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const Agent = require('./models/Agent');

dotenv.config({ path: path.join(__dirname, '.env') });

async function addBalance() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const email = 'agent@rays.com';
        const amount = 10000;

        const agent = await Agent.findOne({ email });
        if (!agent) {
            console.log(`Agent with email ${email} not found!`);
            process.exit(1);
        }

        agent.wallet.balance += amount;
        agent.wallet.transactions.push({
            type: 'credit',
            amount: amount,
            description: 'Test balance added by Antigravity',
            date: new Date()
        });

        // Also ensure agent is approved for testing
        agent.isApproved = true;

        await agent.save();
        console.log(`Successfully added AED ${amount} to ${agent.companyName} (${email})`);
        console.log(`New Balance: AED ${agent.wallet.balance}`);
        
        process.exit(0);
    } catch (error) {
        console.error('Error adding balance:', error);
        process.exit(1);
    }
}

addBalance();
