const nodemailer = require('nodemailer');

const readMailEnv = (...keys) => {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim()) {
            return value.trim().replace(/^["']|["']$/g, '');
        }
    }
    return '';
};

const parseBoolean = (value, fallback = false) => {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string') return fallback;

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'off'].includes(normalized)) return false;
    return fallback;
};

const getMailPort = () => {
    const parsedPort = Number.parseInt(readMailEnv('EMAIL_PORT', 'SMTP_PORT', 'MAIL_PORT'), 10);
    return Number.isFinite(parsedPort) ? parsedPort : 465;
};

const getMailConfig = () => {
    const port = getMailPort();
    const secure = parseBoolean(readMailEnv('EMAIL_SECURE', 'SMTP_SECURE', 'MAIL_SECURE'), port === 465);
    const requireTLS = parseBoolean(readMailEnv('EMAIL_REQUIRE_TLS', 'SMTP_REQUIRE_TLS', 'MAIL_REQUIRE_TLS'), port === 587);
    const rejectUnauthorized = parseBoolean(readMailEnv('EMAIL_TLS_REJECT_UNAUTHORIZED', 'SMTP_TLS_REJECT_UNAUTHORIZED', 'MAIL_TLS_REJECT_UNAUTHORIZED'), false);
    const host = readMailEnv('EMAIL_HOST', 'SMTP_HOST', 'MAIL_HOST') || 'smtp.gmail.com';
    const user = readMailEnv('EMAIL_USER', 'SMTP_USER', 'MAIL_USERNAME', 'MAIL_USER');
    const pass = readMailEnv('EMAIL_PASSWORD', 'SMTP_PASSWORD', 'MAIL_PASSWORD');

    return {
        host,
        port,
        secure,
        auth: {
            user,
            pass
        },
        requireTLS,
        connectionTimeout: Number.parseInt(readMailEnv('EMAIL_CONNECTION_TIMEOUT_MS', 'SMTP_CONNECTION_TIMEOUT_MS', 'MAIL_CONNECTION_TIMEOUT_MS'), 10) || 15000,
        greetingTimeout: Number.parseInt(readMailEnv('EMAIL_GREETING_TIMEOUT_MS', 'SMTP_GREETING_TIMEOUT_MS', 'MAIL_GREETING_TIMEOUT_MS'), 10) || 15000,
        socketTimeout: Number.parseInt(readMailEnv('EMAIL_SOCKET_TIMEOUT_MS', 'SMTP_SOCKET_TIMEOUT_MS', 'MAIL_SOCKET_TIMEOUT_MS'), 10) || 20000,
        tls: {
            rejectUnauthorized,
            servername: readMailEnv('EMAIL_TLS_SERVERNAME', 'SMTP_TLS_SERVERNAME', 'MAIL_TLS_SERVERNAME') || host
        },
        // Force IPv4, prevents ETIMEDOUT in strict cloud environments like Railway
        family: 4
    };
};

const transporter = nodemailer.createTransport(getMailConfig());

const getMailboxUser = () => readMailEnv('EMAIL_USER', 'SMTP_USER', 'MAIL_USERNAME', 'MAIL_USER');
const getMailboxInbox = () => readMailEnv('EMAIL_TO', 'SMTP_TO', 'MAIL_TO', 'EMAIL_USER', 'SMTP_USER', 'MAIL_USERNAME', 'MAIL_USER');

const getFromAddress = (fallbackName = 'Rays International') => {
    let senderEmail = readMailEnv('EMAIL_FROM', 'SMTP_FROM', 'MAIL_FROM');
    if (!senderEmail) {
        const host = readMailEnv('EMAIL_HOST', 'SMTP_HOST', 'MAIL_HOST') || '';
        if (host.includes('resend.com')) {
            senderEmail = 'noreply@raysbuses.com';
        } else {
            senderEmail = getMailboxUser();
        }
    }
    return `"${fallbackName}" <${senderEmail}>`;
};

const sendMail = async (options) => {
    const resendApiKey = process.env.RESEND_API_KEY;

    if (resendApiKey) {
        try {
            const from = options.from || getFromAddress('Rays International Support');
            const to = Array.isArray(options.to) ? options.to : [options.to];
            
            const response = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${resendApiKey.trim()}`
                },
                body: JSON.stringify({
                    from,
                    to,
                    subject: options.subject,
                    html: options.html
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || JSON.stringify(data));
            }
            return data;
        } catch (error) {
            console.error('Email sending failed via Resend API:', error);
            throw error;
        }
    }

    const mailOptions = {
        from: getFromAddress('Rays International Support'),
        ...options
    };

    try {
        return await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Email sending failed:', error);
        throw error;
    }
};

const verifyTransport = async () => {
    try {
        await transporter.verify();
        console.log(`SMTP transport verified for ${readMailEnv('EMAIL_HOST', 'SMTP_HOST', 'MAIL_HOST') || 'smtp.gmail.com'}:${getMailPort()}`);
        return true;
    } catch (error) {
        console.error('SMTP transport verification failed:', error.message);
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
exports.getMailboxUser = getMailboxUser;
exports.getMailboxInbox = getMailboxInbox;

exports.sendAgentInvitation = async (email, agentDetails) => {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    let agentSetupDomain = clientUrl;
    if (clientUrl.includes('raysbuses.com')) {
        agentSetupDomain = 'https://partner.raysbuses.com';
    }
    const setupLink = `${agentSetupDomain}/setup-password?token=${agentDetails.token}&email=${email}`;

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
