const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testEmail() {
    console.log('Testing SMTP connection with:');
    console.log('Host:', process.env.EMAIL_HOST);
    console.log('Port:', process.env.EMAIL_PORT);
    console.log('Secure:', process.env.EMAIL_SECURE);
    console.log('User:', process.env.EMAIL_USER);

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: 2525,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000
    });

    try {
        console.log('\nVerifying connection...');
        await transporter.verify();
        console.log('✅ Connection verified successfully on port', process.env.EMAIL_PORT);
        process.exit(0);
    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        process.exit(1);
    }
}

testEmail();
