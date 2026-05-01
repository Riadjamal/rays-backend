const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const User = require('./models/User');

dotenv.config({ path: path.join(__dirname, '.env') });

const deleteUser = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const result = await User.deleteOne({ email: 'ahmedbilalkhangl09@gmail.com' });
        if (result.deletedCount > 0) {
            console.log(`🧹 Deleted user: Ahmed Bilal KHAN`);
        } else {
            console.log(`ℹ️ User 'Ahmed Bilal Khan' not found.`);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err);
        process.exit(1);
    }
};

deleteUser();
