const mongoose = require('mongoose');
const Service = require('./models/Service');
require('dotenv').config();

const seedServices = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const defaultServices = [
            { name: 'Oman/UAE B2B - 30 Days', key: 'oman_uae_b2b_30', price: 150, type: 'visa' },
            { name: 'Oman/UAE B2B - 60 Days', key: 'oman_uae_b2b_60', price: 160, type: 'visa' },
            { name: 'Standard Transportation Only', key: 'standard_transfer', price: 50, type: 'transfer' },
            { name: 'Return Transportation Fee', key: 'return_transfer', price: 50, type: 'transfer' },
            { name: 'SHJ Visa Extension', key: 'shj_visa_extension', price: 150, type: 'visa' },
            { name: 'DXB Visa Extension', key: 'dxb_visa_extension', price: 160, type: 'visa' }
        ];

        for (const s of defaultServices) {
            await Service.findOneAndUpdate({ key: s.key }, s, { upsert: true });
        }

        console.log("Services seeded successfully!");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedServices();
