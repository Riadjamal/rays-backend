const Inquiry = require('../models/Inquiry');
const { sendNotification } = require('./notificationController');
const Admin = require('../models/Admin');

exports.submitInquiry = async (req, res, next) => {
  try {
    const { name, phone, email, subject, message } = req.body;

    const newInquiry = await Inquiry.create({
      name,
      phone,
      email,
      subject,
      message
    });

    // Notify admins via in-app
    const admins = await Admin.find({});
    for (const admin of admins) {
      await sendNotification(
        admin._id,
        'Admin',
        'system_alert',
        `New inquiry received from ${name}: ${subject}`
      );
    }

    // Send email to admin
    const mailer = require('../utils/mailer');
    await mailer.sendMail({
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `[Contact Inquiry] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px;">
          <h2 style="margin: 0 0 16px; color: #0f172a;">New Website Inquiry</h2>
          <p style="margin: 0 0 8px;"><strong>Name:</strong> ${name}</p>
          <p style="margin: 0 0 8px;"><strong>Phone:</strong> ${phone}</p>
          <p style="margin: 0 0 8px;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0 0 16px;"><strong>Subject:</strong> ${subject}</p>
          <div style="background: #f8fafc; border-radius: 12px; padding: 16px;">
            <p style="margin: 0; white-space: pre-wrap; line-height: 1.6;">${message}</p>
          </div>
        </div>
      `
    }).catch(err => console.error("Email failed but inquiry saved:", err));

    res.status(201).json({
      success: true,
      message: 'Inquiry submitted successfully',
      data: newInquiry
    });
  } catch (error) {
    console.error("Submit Inquiry Error:", error);
    next(error);
  }
};

exports.getInquiries = async (req, res, next) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: inquiries
    });
  } catch (error) {
    console.error("Get Inquiries Error:", error);
    next(error);
  }
};
