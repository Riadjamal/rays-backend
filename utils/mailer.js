const nodemailer = require('nodemailer');

const parseBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return fallback;
};

const getMailPort = () => {
    const parsedPort = Number.parseInt(process.env.EMAIL_PORT, 10);
    return Number.isFinite(parsedPort) ? parsedPort : 465;
};

const getMailConfig = () => {
    const port = getMailPort();
    const secure = parseBoolean(process.env.EMAIL_SECURE, port === 465);
    const requireTLS = parseBoolean(process.env.EMAIL_REQUIRE_TLS, port === 587);
    const rejectUnauthorized = parseBoolean(process.env.EMAIL_TLS_REJECT_UNAUTHORIZED, false);

    return {
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port,
        secure,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD
        },
        requireTLS,
        connectionTimeout: 45000,
        greetingTimeout: 45000,
        socketTimeout: 45000,
        maxConnections: 1,
        maxMessages: 5,
        rateDelta: 1000,
        rateLimit: 5,
        tls: {
            rejectUnauthorized,
            servername: process.env.EMAIL_TLS_SERVERNAME || process.env.EMAIL_HOST || 'smtp.gmail.com'
        }
    };
};

let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        transporter = nodemailer.createTransport(getMailConfig());
    }
    return transporter;
};

const getFromAddress = (fallbackName = 'Rays International') => {
    const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    return `"${fallbackName}" <${senderEmail}>`;
};

const sendMailWithRetry = async (options, retries = 3) => {
    const mailOptions = {
        from: getFromAddress('Rays International Support'),
        ...options
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const result = await getTransporter().sendMail(mailOptions);
            console.log(`✅ Email sent to ${options.to} (attempt ${attempt})`);
            return result;
        } catch (error) {
            console.error(`❌ Email send attempt ${attempt}/${retries} failed for ${options.to}:`, error.message);
            
            if (attempt === retries) {
                // Last attempt failed
                console.error(`⚠️ Failed to send email to ${options.to} after ${retries} attempts`);
                throw error;
            }
            
            // Wait before retry (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            console.log(`⏳ Retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
};

const sendMail = async (options) => {
    try {
        return await sendMailWithRetry(options, 3);
    } catch (error) {
        console.error('Email sending failed after all retries:', error.message);
        throw error;
    }
};

const verifyTransport = async () => {
    try {
        await getTransporter().verify();
        console.log(`✅ SMTP transport verified for ${process.env.EMAIL_HOST || 'smtp.gmail.com'}:${getMailPort()}`);
        return true;
    } catch (error) {
        console.error('⚠️ SMTP transport verification failed:', error.message);
        console.error('📝 Troubleshooting:');
        console.error('   1. Check EMAIL_PASSWORD is a Gmail App Password (16 chars), not your regular password');
        console.error('   2. Verify EMAIL_USER is correct');
        console.error('   3. Ensure 2-Step Verification is enabled on your Gmail account');
        return false;
    }
};

exports.sendBookingConfirmation = async (email, bookingDetails) => {
    await sendMail({
        from: getFromAddress('Rays International'),
        to: email,
        subject: `Booking Confirmed - ${bookingDetails.bookingNumber}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
                <h2 style="color: #2563eb;">Booking Confirmation</h2>
                <p>Hello <strong>${bookingDetails.passengerName}</strong>,</p>
                <p>Your journey with Rays International is confirmed!</p>
                <div style="background: #f8fafc; padding: 15px; border-radius: 8px;">
                    <p><strong>Booking Ref:</strong> ${bookingDetails.bookingNumber}</p>
                    <p><strong>Route:</strong> ${bookingDetails.location} to Muscat</p>
                    <p><strong>Travel Date:</strong> ${new Date(bookingDetails.travelDate).toDateString()}</p>
                </div>
                <p>You can track your visa status and download your ticket in your dashboard.</p>
            </div>
        `
    });
    console.log(`Confirmation email sent to ${email}`);
};

exports.sendVisaApproved = async (email, bookingDetails) => {
    await sendMail({
        from: getFromAddress('Rays International'),
        to: email,
        subject: `Oman Visa Approved - ${bookingDetails.bookingNumber}`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px;">
                <h2 style="color: #059669;">Visa Approved!</h2>
                <p>Hello <strong>${bookingDetails.passengerName}</strong>,</p>
                <p>Great news! Your Oman entry permit has been approved and issued.</p>
                <p>Please login to your dashboard to download the official PDF document.</p>
                <div style="background: #ecfdf5; padding: 15px; border-radius: 8px;">
                    <p><strong>Ref:</strong> ${bookingDetails.bookingNumber}</p>
                </div>
            </div>
        `
    });
};

exports.sendMail = sendMail;
exports.verifyTransport = verifyTransport;

exports.sendAgentInvitation = async (email, agentDetails) => {
    const setupLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/setup-password?token=${agentDetails.token}&email=${email}`;

    await sendMail({
        from: getFromAddress('Rays International'),
        to: email,
        subject: 'Welcome to Rays International - Partner Account Setup',
        html: `
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 24px; border: 1px solid #f1f5f9; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                
                <!-- Rays Logo Header -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <div style="width: 56px; height: 56px; margin: 0 auto; background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 50%, #818cf8 100%); border-radius: 16px; text-align: center; line-height: 56px; box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.5); border: 1px solid rgba(255,255,255,0.2);">
                        <span style="color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: -1px; font-family: system-ui, sans-serif;">R</span>
                    </div>
                    <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 15px 0 0 0; letter-spacing: -0.5px;">Rays International</h2>
                    <p style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 5px;">Agent Portal</p>
                </div>

                <h1 style="color: #1e293b; font-size: 26px; font-weight: 800; text-align: center; margin-bottom: 10px; line-height: 1.3;">Welcome to the Network!</h1>
                <p style="color: #64748b; font-size: 16px; text-align: center; margin-bottom: 35px; line-height: 1.5;">You're officially registered as a partner for <strong>${agentDetails.companyName}</strong>.</p>
                
                <p style="color: #334155; font-size: 16px; line-height: 1.6;">Hello <strong>${agentDetails.contactPerson}</strong>,</p>
                <p style="color: #334155; font-size: 16px; line-height: 1.6;">Your administrator has set up your B2B Agent account. You can now start booking Visa Change packages, managing buses, and reserving seats securely through our platform.</p>
                
                <div style="background-color: #f8fafc; border-radius: 16px; padding: 30px; margin: 35px 0; text-align: center; border: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 25px 0; font-size: 15px; color: #475569; font-weight: 500;">To activate your account and gain immediate access, please set your secure password:</p>
                    
                    <a href="${setupLink}" style="background: linear-gradient(to right, #2563eb, #3b82f6); color: #ffffff; padding: 16px 36px; border-radius: 12px; text-decoration: none; font-size: 16px; font-weight: 700; display: inline-block; box-shadow: 0 10px 15px -3px rgba(37, 99, 235, 0.25); text-transform: uppercase; letter-spacing: 0.5px;">Setup Account Password</a>
                </div>
                
                <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 0 8px 8px 0; margin-bottom: 30px;">
                    <p style="margin: 0; color: #b45309; font-size: 13px; font-weight: 500;"><strong>Note:</strong> This setup link is secure and will expire in exactly 48 hours for your protection.</p>
                </div>
                
                <p style="font-size: 12px; color: #94a3b8; line-height: 1.6; text-align: center;">If the button above doesn't work, copy and paste this link into your browser:<br>
                <a href="${setupLink}" style="color: #3b82f6; word-break: break-all;">${setupLink}</a></p>
                
                <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 40px 0 20px 0;">
                
                <div style="text-align: center;">
                    <p style="margin: 0; font-size: 13px; color: #94a3b8; font-weight: 500;">&copy; ${new Date().getFullYear()} Rays International Passenger Transport.</p>
                    <p style="margin: 5px 0 0 0; font-size: 12px; color: #cbd5e1;">This is an automated system message. Please do not reply.</p>
                </div>
            </div>
        `
    });

    console.log(`Agent invitation sent to ${email}`);
};

