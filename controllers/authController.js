const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Agent = require('../models/Agent');
const Admin = require('../models/Admin');
const Driver = require('../models/Driver');
const mailer = require('../utils/mailer');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};


exports.registerUser = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    const user = await User.create({
      name,
      email,
      phone,
      password
    });

    const token = generateToken(user._id, 'user');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.registerAgent = async (req, res) => {
  try {
    const { companyName, contactPerson, email, phone, companyDetails, tradeLicense, address } = req.body;

    const agentExists = await Agent.findOne({ email });
    if (agentExists) {
      return res.status(400).json({
        success: false,
        message: 'Agent already exists'
      });
    }

    
    const finalCompanyDetails = companyDetails || {
        tradeLicense: tradeLicense || '',
        address: address || ''
    };

    // Generate random setup token
    const setupToken = crypto.randomBytes(32).toString('hex');

    const agent = await Agent.create({
      companyName,
      contactPerson,
      email,
      phone,
      companyDetails: finalCompanyDetails,
      setupPasswordToken: setupToken,
      setupPasswordTokenExpires: Date.now() + 48 * 60 * 60 * 1000 
    });

    
    await mailer.sendAgentInvitation(email, {
        companyName,
        contactPerson,
        token: setupToken
    });

    res.status(201).json({
      success: true,
      message: 'Registration request received. Please check your email to set your password and activate your account.',
      data: {
        id: agent._id,
        companyName: agent.companyName,
        email: agent.email
      }
    });
  } catch (error) {
    console.error("Agent Registration Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.login = async (req, res, next) => {
  try {
    const connectDatabase = require('../config/database');
    await connectDatabase(); 

    const { email, password, role } = req.body;

    let user;
    let detectedRole;
    const searchEmail = email.toLowerCase();

    
    user = await Admin.findOne({ email: searchEmail }).select('+password');
    if (user) {
        detectedRole = 'admin';
    }

    
    if (!user) {
        user = await Agent.findOne({ email: searchEmail }).select('+password');
        if (user) detectedRole = 'agent';
    }

    
    if (!user) {
        user = await Driver.findOne({ email: searchEmail }).select('+password');
        if (user) detectedRole = 'driver';
    }

    
    if (!user) {
        user = await User.findOne({ email: searchEmail }).select('+password');
        if (user) detectedRole = 'user';
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'No account found with this email address'
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Please contact support.'
      });
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password. Please try again.'
      });
    }

    if (detectedRole === 'agent' && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Agent account not yet approved by admin'
      });
    }

    if (detectedRole === 'admin' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admins must login via the Admin Portal.'
      });
    }

    const actualRole = user.role || detectedRole;
    const token = generateToken(user._id, actualRole);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        id: user._id,
        name: user.name || user.companyName,
        email: user.email,
        role: actualRole,
        permissions: user.permissions || [],
        token
      }
    });
  } catch (error) {
    next(error);
  }
};


exports.forgotPassword = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    
    let Model = role === 'agent' ? Agent : User;
    const user = await Model.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email'
      });
    }

    
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = Date.now() + 10 * 60 * 1000; 
    await user.save();

    
    try {
      await mailer.sendMail({
        to: email,
        subject: 'Your Rays International Password Reset OTP',
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #2563eb;">Password Reset Request</h2>
                <p>Hello,</p>
                <p>You requested to reset your password. Use the following 6-digit OTP to proceed:</p>
                <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; border-radius: 8px; margin: 20px 0;">
                    ${otp}
                </div>
                <p>This OTP will expire in 10 minutes.</p>
                <p>If you didn't request this, please ignore this email.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                <p style="font-size: 12px; color: #9ca3af;">Rays International Express Services</p>
            </div>
        `
      });
    } catch (mailErr) {
      user.resetPasswordOTP = undefined;
      user.resetPasswordOTPExpires = undefined;
      await user.save();

      return res.status(500).json({
        success: false,
        message: 'We could not send the OTP email right now. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'OTP sent to your email address'
    });
  } catch (error) {
    next(error);
  }
};


exports.resetPassword = async (req, res, next) => {
  try {
    const { email, role, otp, newPassword } = req.body;
    
    let Model = role === 'agent' ? Agent : User;
    const user = await Model.findOne({ 
        email,
        resetPasswordOTP: otp,
        resetPasswordOTPExpires: { $gt: Date.now() }
    }).select('+password');

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    
    user.password = newPassword;
    user.resetPasswordOTP = undefined;
    user.resetPasswordOTPExpires = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });
  } catch (error) {
    next(error);
  }
};


exports.setupPassword = async (req, res, next) => {
  try {
    const { token, email, password } = req.body;

    const agent = await Agent.findOne({
        email,
        setupPasswordToken: token,
        setupPasswordTokenExpires: { $gt: Date.now() }
    });

    if (!agent) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation link'
      });
    }

    agent.password = password;
    agent.setupPasswordToken = undefined;
    agent.setupPasswordTokenExpires = undefined;
    
    await agent.save();

    res.json({
      success: true,
      message: agent.isApproved 
        ? 'Password set successfully. You can now login.' 
        : 'Password set successfully. Your account is now pending admin approval.'
    });
  } catch (error) {
    next(error);
  }
};


exports.googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    if (!credential || !process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({
        success: false,
        message: 'Google sign-in is not configured correctly'
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });

    const payload = ticket.getPayload();
    const email = payload?.email?.toLowerCase();

    if (!payload?.email_verified || !email) {
      return res.status(400).json({
        success: false,
        message: 'Google account email could not be verified'
      });
    }

    let user = await User.findOne({ email }).select('+password');
    const actualRole = user?.role || 'user';

    if (!user) {
      user = await User.create({
        name: payload.name || email.split('@')[0],
        email,
        phone: payload.phone_number || 'Google Account',
        password: crypto.randomBytes(24).toString('hex')
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been blocked. Please contact support.'
      });
    }

    const token = generateToken(user._id, actualRole);

    res.json({
      success: true,
      message: 'Google sign-in successful',
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: actualRole,
        permissions: user.permissions || [],
        token
      }
    });
  } catch (error) {
    next(error);
  }
};
exports.getMe = async (req, res, next) => {
  try {
    let user;
    const role = req.userRole;
    
    if (role === 'agent') {
      user = await Agent.findById(req.userId);
    } else if (role === 'admin') {
      user = await Admin.findById(req.userId);
    } else if (role === 'driver') {
      user = await Driver.findById(req.userId);
    } else {
      
      user = await User.findById(req.userId);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};


