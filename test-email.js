const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

async function sendTestEmail() {
  console.log("Attempting to send test email...");
  try {
    const info = await transporter.sendMail({
      from: `"Rays International Test" <${process.env.EMAIL_USER}>`,
      to: "ahmedbilalkhangl09@gmail.com",
      subject: "SMTP Connection Successful! 🎉",
      text: "Aapka Google App Password bilkul sahi kaam kar raha hai! Yeh email Rays International backend se bheji gayi hai.",
      html: "<h3>Aapka Google App Password bilkul sahi kaam kar raha hai! 🎉</h3><p>Yeh email Rays International backend se test ke tor par bheji gayi hai.</p>",
    });
    console.log("Email sent successfully! Message ID: %s", info.messageId);
  } catch (error) {
    console.error("Failed to send email:", error);
  }
}

sendTestEmail();
