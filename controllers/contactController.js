const mailer = require('../utils/mailer');

exports.submitInquiry = async (req, res, next) => {
  try {
    const { name, phone, email, subject, message } = req.body;

    if (!name || !phone || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All contact form fields are required'
      });
    }

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
    });

    res.status(200).json({
      success: true,
      message: 'Inquiry submitted successfully'
    });
  } catch (error) {
    next(error);
  }
};
