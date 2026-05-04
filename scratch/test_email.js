require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const nodemailer = require('nodemailer');

async function testEmail() {
    console.log("--- Starting Email Setup Test ---");
    console.log("Config:");
    console.log("- Host:", process.env.EMAIL_HOST);
    console.log("- Port:", process.env.EMAIL_PORT);
    console.log("- User:", process.env.EMAIL_USER);

    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        tls: {
            rejectUnauthorized: false
        }
    });

    try {
        // Verify connection configuration
        console.log("Verifying connection...");
        await transporter.verify();
        console.log("✅ SMTP Connection established successfully!");

        // Send test email
        console.log("Sending test email...");
        const info = await transporter.sendMail({
            from: `"Rays Test" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER, // Send to self
            subject: "Rays International - SMTP Test",
            text: "If you are reading this, your email configuration is working perfectly!",
            html: "<b>✅ Email System Working!</b><p>This is a test email from Rays International platform.</p>"
        });

        console.log("✅ Message sent: %s", info.messageId);
        console.log("Check your inbox at:", process.env.EMAIL_USER);
    } catch (error) {
        console.error("❌ Email Test Failed!");
        console.error("Error Detail:", error.message);
        if (error.code === 'EAUTH') {
            console.log("\nTIP: Authentication failed. Double check your email and password.");
            console.log("If using Gmail, make sure you are using an 'App Password', not your regular login password.");
        }
    }
}

testEmail();
