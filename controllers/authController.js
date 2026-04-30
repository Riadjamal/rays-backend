const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Agent = require('../models/Agent');
const Admin = require('../models/Admin');
const Driver = require('../models/Driver');

// Generate JWT token
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// Register User
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
    next(error);
  }
};

// Register Agent
exports.registerAgent = async (req, res) => {
  try {
    const { companyName, contactPerson, email, phone, password, companyDetails } = req.body;

    const agentExists = await Agent.findOne({ email });
    if (agentExists) {
      return res.status(400).json({
        success: false,
        message: 'Agent already exists'
      });
    }

    const agent = await Agent.create({
      companyName,
      contactPerson,
      email,
      phone,
      password,
      companyDetails
    });

    const token = generateToken(agent._id, 'agent');

    res.status(201).json({
      success: true,
      message: 'Agent registered successfully. Waiting for admin approval.',
      data: {
        id: agent._id,
        companyName: agent.companyName,
        email: agent.email,
        role: agent.role,
        isApproved: agent.isApproved,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login
exports.login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    let user;
    if (role === 'user') {
      user = await User.findOne({ email }).select('+password');
    } else if (role === 'agent') {
      user = await Agent.findOne({ email }).select('+password');
    } else if (role === 'admin') {
      user = await Admin.findOne({ email }).select('+password');
    } else if (role === 'driver') {
      user = await Driver.findOne({ email }).select('+password');
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: 'Account is blocked'
      });
    }

    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if agent is approved
    if (role === 'agent' && !user.isApproved) {
      return res.status(403).json({
        success: false,
        message: 'Agent account not yet approved by admin'
      });
    }

    const token = generateToken(user._id, role);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        id: user._id,
        name: user.name || user.companyName,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Forgot Password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email, role } = req.body;
    
    // In production, send reset email
    res.json({
      success: true,
      message: 'Password reset link sent to email'
    });
  } catch (error) {
    next(error);
  }
};

// Reset Password
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    
    // In production, verify token and update password
    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(error);
  }
};
