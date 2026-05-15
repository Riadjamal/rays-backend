const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Payment = require('../models/Payment');
const Agent = require('../models/Agent');
const Visa = require('../models/Visa');

const runAudit = async () => {
    try {
        console.log("--- 🔍 RAYS SYSTEM DEEP AUDIT ---");
        
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rays_international');
        console.log("✅ Database Connected.");

        // 1. Check Agents
        const agents = await Agent.find();
        console.log(`\n👥 AGENTS AUDIT:`);
        console.log(`Total Agents: ${agents.length}`);
        agents.forEach(a => {
            console.log(` - [${a.companyName}] Approved: ${a.isApproved}, Direct No: ${a.directNumber || 'MISSING'}, Products: ${a.productPricing?.length || 0}`);
        });

        // 2. Check Pending Payments
        const pendingPayments = await Payment.find({ status: 'pending' }).populate('agent');
        console.log(`\n💰 PAYMENTS AUDIT (Pending):`);
        console.log(`Total Pending: ${pendingPayments.length}`);
        pendingPayments.forEach(p => {
            console.log(` - ID: ${p._id}, Agent: ${p.agent?.companyName || 'N/A'}, Amount: ${p.amount}, Type: ${p.type}`);
        });

        // 3. Check Visa Categorization
        const visas = await Visa.find();
        console.log(`\n🛂 VISA AUDIT:`);
        const stats = { oman: 0, uae: 0, saudi: 0 };
        visas.forEach(v => {
            if (v.type === 'oman_visa') stats.oman++;
            if (v.type === 'uae_visa') stats.uae++;
            if (v.type === 'saudi_visa') stats.saudi++;
        });
        console.log(` - Oman: ${stats.oman}, UAE: ${stats.uae}, Saudi: ${stats.saudi}`);

        console.log("\n--- ✅ AUDIT COMPLETE ---");
        process.exit(0);
    } catch (err) {
        console.error("❌ AUDIT FAILED:", err.message);
        process.exit(1);
    }
};

runAudit();
