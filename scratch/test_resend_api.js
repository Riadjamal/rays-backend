const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mailer = require('../utils/mailer');

async function testResend() {
    process.env.RESEND_API_KEY = 're_jbuJrtur_5jnUBHf1av6fuD5sjc6TcHz2';
    process.env.EMAIL_HOST = 'smtp.resend.com';
    
    console.log("Starting test email send via Resend API to ahmedbilalkhangl09@gmail.com...");
    try {
        await mailer.sendMail({
            to: 'ahmedbilalkhangl09@gmail.com',
            subject: 'Rays Buses Resend API Test',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; max-width: 500px; margin: auto;">
                    <h2 style="color: #2563eb;">Resend Integration Active!</h2>
                    <p>Hello Ahmed,</p>
                    <p>This test email confirms that your Resend API integration is fully functional and ready to be used on your backend.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                    <p style="font-size: 12px; color: #64748b;">Rays International Express Services</p>
                </div>
            `
        });
        console.log("Success! Email sent successfully to ahmedbilalkhangl09@gmail.com via Resend API.");
    } catch (err) {
        console.error("Test failed:", err);
    }
}

testResend();
